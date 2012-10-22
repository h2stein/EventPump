// NEEDS FIX B: API-doc
// NEEDS FIX B: No redundant function defs (use protoype)

/*jslint devel: true, browser: true */
/*global module, require, define */

(function( name, global, definition ) {
   'use strict';
   if( typeof module === "object" && typeof require === "function" ) {
      /* commonJS */ module.exports = definition( name, global );
   } else if( typeof define === "function" && typeof define.amd === "object" ) {
      /* AMD */ define( definition );
   } else {
      global[ name ] = definition( name, global );  
   } 
}( "EventPump", ( typeof window !== "undefined" && window ) || this, function definition( name, global ) {
   'use strict';

   var EventPump = function( config ) {
      var augmenter_ = 
         (config && typeof config.augmenter === "function" && config.augmenter) ||
         function( name, event ) { return event; };
      var mediator_ = 
         (config && typeof config.mediator === "function" && config.mediator) ||
         function( batch ) { return batch; };
      var exceptionReporter_ = 
         (config && typeof config.exceptionReporter === "function" && config.exceptionReporter) ||
         function( /* details */ ) {};
      var exceptionCreator_ =
         (config && typeof config.exceptionCreator === "function" && config.exceptionCreator) ||
         Error;

      var subscribersByComponent_ = { "." : [] };
      var queue_ = [];

      var reportCallbackException = function( action, callback, args, exception ) {
         try {
            exceptionReporter_( {
               action:     action,
               args:       args,
               callback:   callback,
               exception:  exception } );
         }
         catch( exception2 ) {
            if( console && typeof console.log === "function" ) {
               console.log( "EventPump: Exception reporter threw " + exception2 );
            }
         }
      };

      var deliverEvent = function( name, path, event, completionCallback ) {
         var numberOfSubscribers = 0;

         var signalCompletion = function() {
            if( completionCallback ) {
               try {
                  completionCallback( numberOfSubscribers );
               }
               catch( exception ) {
                  reportCallbackException( "callCompletionCallback", completionCallback, [ { numberOfSubscribers: numberOfSubscribers } ], exception );
               }
            }
         };

         // NOTE: we set the initial number to 1 so that the counter does not go down to zero while we are 
         // calling further subscribers.
         var numberOfPendingAsyncSubscribers = 1;
         function makeExtensions() {
            var asyncCallbackCalled = false;
            return {
               makeAsynchronous: function() {
                  ++numberOfPendingAsyncSubscribers;
                  return function() {
                     if( !asyncCallbackCalled ) {
                        asyncCallbackCalled = true;
                        if( --numberOfPendingAsyncSubscribers === 0 ) {
                           signalCompletion();
                        }
                     }
                  };
               }
            };
         }

         var subscribersByComponentList = [ subscribersByComponent_ ];
         for( var k = 0; k < path.length; ++k ) {
            var component = path[k];

            // find all matching subscribers for the current path level
            var newSubscribersByComponentList = [];
            var subscribers;
            for( var i = 0; i < subscribersByComponentList.length; ++i ) {
               subscribers = subscribersByComponentList[i];
               // match the component by value
               if( subscribers[ component ] ) {
                  newSubscribersByComponentList.push( subscribers[ component ] );
               }
               // match the component by wildcard (empty string)
               if( subscribers[ "" ] ) {
                  newSubscribersByComponentList.push( subscribers[ "" ] );
               }
            }
            subscribersByComponentList = newSubscribersByComponentList;

            // call all subscribers for the current path level
            for( i = 0; i < subscribersByComponentList.length; ++i ) {
               subscribers = subscribersByComponentList[i][ "." ];
               for( var j = 0; j < subscribers.length; ++j ) {
                  var callback = subscribers[j];
                  ++numberOfSubscribers;
                  try {
                     callback( name, event, makeExtensions() );
                  }
                  catch( exception ) {
                     reportCallbackException( "callSubscriber", callback, [ { name: name }, { event: event } ], exception );
                  }
               }
            }
         }
         // NOTE: we must reduce the number first since we originally set it to 1
         if( --numberOfPendingAsyncSubscribers === 0 ) {
            signalCompletion( completionCallback, numberOfSubscribers );
         }
      };

      var deliverEventBatch = function( batch ) {
         if( batch.length === 0 ) {
            return;
         }
         try {
            batch = mediator_( batch );
         }
         catch( exception ) {
            reportCallbackException( "callMediator", mediator_, [ { batch: batch } ], exception );
         }
         while( batch.length > 0 ) {
            var next = batch.shift();
            if( typeof next.path === "undefined" ) {
               next.path = splitPath( next.name );
            }
            deliverEvent( next.name, next.path, next.event, next.completionCallback );
         }
      };

      var pumpQueue = function() {
         var batch = [];
         while( queue_.length > 0 ) {
            var next = queue_.shift();
            if( typeof next.type !== "undefined" ) {
               deliverEventBatch( batch );
               batch = [];
               next.code();
            }
            else {
               batch.push( next );
            }
         }
         deliverEventBatch( batch );
      };

      var appendToQueue = function( item ) {
         queue_.push( item );
         setTimeout( pumpQueue, 0 );
      };

      var splitPath = function( name ) {
         var path = name.split( "." );
         for( var k = 0; k < path.length; ++k ) {
            if( path[k] === "" ) {
               throw exceptionCreator_( "Event names must not contain empty components (name=" + name + ").", "BadEventName" );
            }
         }
         return path;
      };

      this.publish = function( name, event, completionCallback ) {
         if( typeof name !== "string" ) {
            throw exceptionCreator_( "Events must have a name (name=" + name + ").", "BadEventName" );
         }
         if( completionCallback !== undefined && typeof completionCallback !== "function" ) {
            throw exceptionCreator_( "Publishers may only provide functions as completion callback (callback=" + completionCallback + ")", "BadCompletionCallback" );
         }
         var path = splitPath( name );
         event = augmenter_( name, event );

         // Events do not have a type attribut so that the mediator does not see our implementation details
         appendToQueue( { name: name, path: path, event: event, completionCallback : completionCallback } );
      };

      var searchPendingSubscriberByPatternAndCallback = function( pattern, callback ) {
         for( var i = queue_.length - 1; i >= 0 ; --i ) {
            var item = queue_[i];
            if( item.type === "subscribe" && item.pattern === pattern && item.callback === callback ) {
               return true;
            }
         }
         return false;
      };

      var searchEstablishedSubscriberByPathAndCallback = function( path, callback ) {
         var subscribers = subscribersByComponent_;
         for( var i = 0; subscribers && i < path.length; ++i ) {
            var component = path[i];
            subscribers[ component ] = subscribers[ component ] || { "." : [] };
            subscribers = subscribers[ component ];
         }
         if( subscribers ) {
            var callbacks = subscribers[ "." ];
            for( i = 0; i < callbacks.length; ++i ) {
               if( callbacks[i] === callback ) {
                  return true;
               }
            }
         }
         return false;
      };

      this.subscribe = function( pattern, callback ) {
         if( typeof callback !== "function" ) {
            throw exceptionCreator_( "Subscribers need to register a callback function (callback=" + callback + ")", "BadEventSubscriber" );
         }
         if( typeof pattern !== "string" ) {
            throw exceptionCreator_( "Subscribers need to register with a pattern for event names (pattern=" + pattern + ")", "BadEventSubscriber" );
         }
         var path = pattern.split( "." );
         if( searchPendingSubscriberByPatternAndCallback( pattern, callback ) ||
             searchEstablishedSubscriberByPathAndCallback( path, callback ) ) {
            // the subscriber is already registered
            return;
         }
         var deferredSubscribe = function() {
            var subscribers = subscribersByComponent_;
            for( var i = 0; i < path.length; ++i ) {
               var component = path[i];
               subscribers[ component ] = subscribers[ component ] || { "." : [] };
               subscribers = subscribers[ component ];
            }
            subscribers[ "." ].push( callback );
         };
         appendToQueue( { type: "subscribe", pattern: pattern, callback: callback, code: deferredSubscribe } );
      };

      var removePendingSubscriberFromQueue = function( callback ) {
         for( var i = queue_.length - 1; i >= 0 ; --i ) {
            if( queue_[i].type === "subscribe" && queue_[i].callback === callback ) {
               queue_.splice( i, 1 );
            }
         }
      };

      var isSubscriptionTreeNodeEmpty = function( treeNode ) {
         for( var property in treeNode ) {
            if( treeNode.hasOwnProperty( property ) && property !== "." ) {
               return false;
            }
         }

         return treeNode[ "." ].length === 0;
      };

      var removeSubscriberFromSubscriptionTree = function( callback, subscribersByComponent ) {
         for( var component in subscribersByComponent ) {
            if( !subscribersByComponent.hasOwnProperty( component ) ) {
               continue;
            }
            if( component === "." ) {
               // ignore callback list
               continue;
            }
            removeSubscriberFromSubscriptionTree( callback, subscribersByComponent[component] );
            if( isSubscriptionTreeNodeEmpty( subscribersByComponent[component] ) ) {
               delete subscribersByComponent[component];
            }
         }
         var callbacks = subscribersByComponent[ "." ];
         for( var j = callbacks.length - 1; j >= 0; --j ) {
            if( callbacks[j] === callback ) {
               callbacks.splice( j, 1 );
            }
         }
      };

      this.unsubscribe = function( callback ) {
         removePendingSubscriberFromQueue( callback );
         removeSubscriberFromSubscriptionTree( callback, subscribersByComponent_ );
      };

      var countNumberOfEstablishedSubscribers = function( subscribersByComponent ) {
         var count = 0;
         for( var component in subscribersByComponent ) {
            if( !subscribersByComponent.hasOwnProperty( component ) ) {
               continue;
            }
            if( component === "." ) {
               count += subscribersByComponent[ component ].length;
            }
            else {
               count += countNumberOfEstablishedSubscribers( subscribersByComponent[ component ] );
            }
         }
         return count;
      };

      var countNumberOfPendingSubscribers = function() {
         var count = 0;
         for( var i = queue_.length - 1; i >= 0 ; --i ) {
            if( queue_[i].type === "subscribe" ) {
               ++count;
            }
         }
         return count;
      };

      this.numberOfSubscribers = function() {
         return countNumberOfEstablishedSubscribers( subscribersByComponent_ ) + 
            countNumberOfPendingSubscribers();
      };
   };
   return {
      EventPump : EventPump
   };
}));
