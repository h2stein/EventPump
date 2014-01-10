/*global jasmine, describe, it, beforeEach, afterEach, expect */
/*global EventPump */
/*global setTimeout */


(function testSuite( EventPump ) {
    'use strict';

    describe( "An event pump", function() {
        var eventPump;
        var subscriberCallback1;
        var subscriberCallback2;

        beforeEach( function() {
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" );
        });

        it( "allows subscribers to register a callback for a named event", function() {
            expect( function() { eventPump.subscribe( "testingEventPump", subscriberCallback1 ); } ).not.toThrow();
        });

        it( "must not accept missing details for subscription", function() {
            expect( function() { eventPump.subscribe(); } ).toThrow();
            expect( function() { eventPump.subscribe( null, null ); } ).toThrow();
            expect( function() { eventPump.subscribe( "testingEventPump" ); } ).toThrow();
            expect( function() { eventPump.subscribe( null, subscriberCallback1 ); } ).toThrow();
        });

        it( "allows subscribing the same subscriber multiple times to the same event", function() {
            expect( function() { eventPump.subscribe( "testingEventPump", subscriberCallback1 ); } ).not.toThrow();
            expect( function() { eventPump.subscribe( "testingEventPump", subscriberCallback1 ); } ).not.toThrow();
        });

        it( "allows subscribing the same subscriber multiple times to different events", function() {
            expect( function() { eventPump.subscribe( "testingEventPump1", subscriberCallback1 ); } ).not.toThrow();
            expect( function() { eventPump.subscribe( "testingEventPump2", subscriberCallback1 ); } ).not.toThrow();
        });

        it( "allows publishing events, even if no subscriber is registered at all", function() {
            expect( function() { eventPump.publish( "testingEventPump" ); } ).not.toThrow();
        });

        it( "allows publishing an event, even if no subscriber is registered for the given event", function() {
            eventPump.subscribe( "playingMusic", subscriberCallback1 );
            expect( function() { eventPump.publish( "testingEventPump" ); } ).not.toThrow();
        });

        it( "must not accept publishing unnamed events", function() {
            expect( function() { eventPump.publish(); } ).toThrow();
            expect( function() { eventPump.publish( "" ); } ).toThrow();
        });

        it( "allows multiple subscribers to register callbacks for the same event", function() {
            expect( function() { eventPump.subscribe( "testingEventPump", subscriberCallback1 ); } ).not.toThrow();
            expect( function() { eventPump.subscribe( "testingEventPump", subscriberCallback2 ); } ).not.toThrow();
        });
    });

    describe( "Given a subscriber that registered a callback, when an matching event is emitted, the subscriber", function() {
        var eventPump;
        var event;
        var subscriberCallback1;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.publish( "testingEventPump", event );
        });

        it( "is not called immediately", function() {
            expect( subscriberCallback1 ).not.toHaveBeenCalled();
        });

        it( "is called once in the next JavaScript cycle", function() {
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
        });
    });

    describe( "Given a subscriber that registered a callback for multiple events, when matching events are emitted, the subscriber", function() {
        var eventPump;
        var event;
        var subscriberCallback1;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
            eventPump.subscribe( "testingEventPump1", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump2", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump3", subscriberCallback1 );
            eventPump.publish( "testingEventPump1", event );
            eventPump.publish( "testingEventPump2", event );
            eventPump.publish( "testingEventPump3", event );
            jasmine.Clock.tick( 0 );
        });

        it( "is called once for each event and the events are delivered in order", function() {
            expect( subscriberCallback1.callCount ).toBe( 3 );
            expect( subscriberCallback1.calls[0].args[0] ).toBe( "testingEventPump1" );
            expect( subscriberCallback1.calls[1].args[0] ).toBe( "testingEventPump2" );
            expect( subscriberCallback1.calls[2].args[0] ).toBe( "testingEventPump3" );
        });
    });

    describe( "Given a subscriber that registered the same callback multiple times for the same event, when a matching event is emitted, the subscriber", function() {
        var eventPump;
        var event;
        var subscriberCallback1;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.publish( "testingEventPump", event );
            jasmine.Clock.tick( 0 );
        });

        it( "is called only once", function() {
            expect( subscriberCallback1.callCount ).toBe( 1 );
            expect( subscriberCallback1.calls[0].args[0] ).toBe( "testingEventPump" );
        });
    });

    describe( "Given an event pump with a published, but not yet delivered, event, when a new subscriber is registered, the new subscriber", function() {
        var eventPump;
        var event;
        var subscriberCallback1;

        beforeEach( function() {
            eventPump = new EventPump();
            jasmine.Clock.useMock();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
            eventPump.publish( "testingEventPump", event );
        });

        it( "is not called (pending subscriber)", function() {
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).not.toHaveBeenCalled();
        });

        it( "is called once for events, published after registering the subscriber (established subscriber)", function() {
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            var event2 = { id: "event2" };
            eventPump.publish( "testingEventPump", event2 );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).not.toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump", event2, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });
    });

    describe( "Given an event pump with multiple subscribers, when an event is emitted, ", function() {
        var eventPump;
        var event;
        var subscriberCallback1;
        var subscriberCallback2;
        var subscriberCallback3;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" );
            subscriberCallback3 = jasmine.createSpy( "Subscriber callback 3" );

            event = {};
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump", subscriberCallback2 );
            eventPump.subscribe( "playingMusic",    subscriberCallback3 );
            eventPump.publish( "testingEventPump", event );
            jasmine.Clock.tick( 0 );
        });

        it( "all subscribers with matching event patterns are called back, once each", function() {
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
            expect( subscriberCallback2 ).toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
            expect( subscriberCallback2.callCount ).toBe( 1 );
        });

        it( "subscribers without matching event patterns are not called", function() {
            expect( subscriberCallback3 ).not.toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
        });
    });

    describe( "Given an event pump with subscribers, when an event is emitted, after a publish cycle, the publisher is notified (by calling the completion callback)", function() {
        var eventPump;
        var event;
        var subscriberCallback1;
        var subscriberCallback2;
        var subscriberCallback3;
        var subscriberCallback4;
        var completionCallback;

        var numberOfCalledSubscribers;
        var numberOfCalledSubscribersBeforeCallingCompletionCallback;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            numberOfCalledSubscribers = 0;
            numberOfCalledSubscribersBeforeCallingCompletionCallback = 0;

            var countSubscriberCall = function() { ++numberOfCalledSubscribers; };

            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" ).andCallFake( countSubscriberCall );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" ).andCallFake( countSubscriberCall );
            subscriberCallback3 = jasmine.createSpy( "Subscriber callback 3" ).andCallFake( countSubscriberCall );
            subscriberCallback4 = jasmine.createSpy( "Subscriber callback 4" ).andCallFake( function( name, event, options ) {
                countSubscriberCall();
                setTimeout( options.makeAsynchronous(), 1 );
            });

            completionCallback = jasmine.createSpy( "Completion callback" ).andCallFake( function() {
                numberOfCalledSubscribersBeforeCallingCompletionCallback = numberOfCalledSubscribers;
            });
            event = {};
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump", subscriberCallback2 );
            eventPump.subscribe( "playingMusic",    subscriberCallback3 );
            eventPump.subscribe( "testingEventPumpAsynchronously", subscriberCallback4 );
        });

        it( "when no subscriber registered for the event", function() {
            eventPump.publish( "sendingUnregisteredEvents", event, completionCallback );
            expect( completionCallback ).not.toHaveBeenCalled();
            jasmine.Clock.tick( 0 );
            expect( completionCallback.callCount ).toBe( 1 );
            expect( completionCallback ).toHaveBeenCalledWith( 0 );
            expect( numberOfCalledSubscribersBeforeCallingCompletionCallback ).toBe( 0 );
        });

        it( "when one subscriber registered for the event", function() {
            eventPump.publish( "playingMusic", event, completionCallback );
            expect( completionCallback ).not.toHaveBeenCalled();
            jasmine.Clock.tick( 0 );
            expect( completionCallback.callCount ).toBe( 1 );
            expect( completionCallback ).toHaveBeenCalledWith( 1 );
            expect( numberOfCalledSubscribersBeforeCallingCompletionCallback ).toBe( 1 );
        });

        it( "when asynchronous subscribers registered for the event", function() {
            eventPump.publish( "testingEventPumpAsynchronously", event, completionCallback );
            expect( completionCallback ).not.toHaveBeenCalled();
            jasmine.Clock.tick( 0 );
            expect( completionCallback ).not.toHaveBeenCalled();
            jasmine.Clock.tick( 1 );
            expect( completionCallback.callCount ).toBe( 1 );
            expect( completionCallback ).toHaveBeenCalledWith( 1 );
            expect( numberOfCalledSubscribersBeforeCallingCompletionCallback ).toBe( 1 );
        });

    });

    describe( "An event pump", function() {
        var eventPump;
        var event;
        var subscriberCallback1;

        beforeEach( function() {
            eventPump = new EventPump();
            jasmine.Clock.useMock();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
        });


        it( "supports hierarchical event names with multiple dot separated parts", function() {
            expect( function() { eventPump.publish( "testingEventPump.subject" ); } ).not.toThrow();
        });

        it( "must not accept hierarchical event names with empty parts for publishing", function() {
            expect( function() { eventPump.publish( "testingEventPump." ); } ).toThrow();
            expect( function() { eventPump.publish( "testingEventPump..withFun" ); } ).toThrow();
        });

        it( "delivers events with hierarchical event names once to matching subscribers", function() {
            eventPump.subscribe( "testingEventPump.subject", subscriberCallback1 );
            eventPump.publish( "testingEventPump.subject", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump.subject", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });
    });

    describe( "An event pump supports subscription using wildcard patterns", function() {
        var eventPump;
        var event;
        var subscriberCallback1;
        var subscriberCallback2;
        var subscriberCallback3;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );

            event = {};
        });

        it( "by matching an empty subscription pattern against any event", function() {
            eventPump.subscribe( "", subscriberCallback1 );
            eventPump.publish( "testingEventPump", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });

        it( "by matching empty parts in hierarchical event names against any name for that part", function() {
            eventPump.subscribe( ".subject.withFun", subscriberCallback1 );
            eventPump.publish( "testingEventPump.subject.withFun", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump.subject.withFun", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });

        it( "by accepting such wildcards in the middle of the subscription pattern", function() {
            eventPump.subscribe( "testingEventPump..withFun", subscriberCallback1 );
            eventPump.publish( "testingEventPump.subject.withFun", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump.subject.withFun", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });

        it( "by accepting wildcards at the tail of the subscription pattern", function() {
            eventPump.subscribe( "testingEventPump.subject.", subscriberCallback1 );
            eventPump.publish( "testingEventPump.subject.withFun", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump.subject.withFun", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });

        it( "by treating missing tails as wildcard", function() {
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.publish( "testingEventPump.subject.withFun", event );
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalledWith( "testingEventPump.subject.withFun", event, jasmine.any( Object ) );
            expect( subscriberCallback1.callCount ).toBe( 1 );
        });
    });

    describe( "An event pump with a configured event augmenter", function() {
        var eventPump;
        var augmenter;
        var subscriberCallback1;

        beforeEach( function() {
            jasmine.Clock.useMock();
            augmenter = jasmine.createSpy( "Augmenter" ).andCallFake( function( name, event ) {
                if( name === "badEventName" ) {
                    throw "Events must have nice names";
                }
                if( typeof event.source === "undefined" ) {
                    throw "Events must contain an event source.";
                }
                return { name: name, source: event.source };
            });
            eventPump = new EventPump( { augmenter : augmenter } );
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
        });

        it( "calls the event augmenter when an event is published", function() {
            var event = { source: "TestEventSource" };
            eventPump.publish( "testingEventPump", event );
            expect( augmenter ).toHaveBeenCalledWith( "testingEventPump", event );
        });

        it( "allows the augmenter to reject events based on the event name", function() {
            var event = { source: "TestEventSource" };
            expect( function() { eventPump.publish( "badEventName", event ); } ).toThrow();
        });

        it( "allows the augmenter to reject events based on the event itself", function() {
            var event = {};
            expect( function() { eventPump.publish( "testingEventPump", event ); } ).toThrow();
        });

        it( "allows the augmenter to change or replace the event", function() {
            var event = { source: "TestEventSource" };
            expect( function() { eventPump.publish( "testingEventPump", event ); } ).not.toThrow();
            jasmine.Clock.tick( 0 );
            expect( subscriberCallback1 ).toHaveBeenCalled();
            expect( subscriberCallback1.calls[0].args[1] ).not.toBe( event );
            expect( subscriberCallback1.calls[0].args[1].name ).toEqual( "testingEventPump" );
        });
    });

    describe( "An event pump", function() {
        var eventPump;
        var mediator;
        var subscriberCallback1;

        beforeEach( function() {
            jasmine.Clock.useMock();
            mediator = jasmine.createSpy( "Mediator" );
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );
        });

        var subscribeAndPublishSomeEvents = function() {
            eventPump.subscribe( "", subscriberCallback1 );

            eventPump.publish( "testingEventPump", { id: "first"  } );
            eventPump.publish( "testingEventPump", { id: "second" } );
            eventPump.publish( "testingEventPump", { id: "third"  } );
            jasmine.Clock.tick( 0 );
        };

        it( "supports configuration of an event mediator", function() {
            eventPump = new EventPump( { mediator: function( batch ) { return batch; } } );
        });

        it( "calls the event mediator with a batch of all newly published events", function() {
            eventPump = new EventPump( { mediator: mediator } );

            subscribeAndPublishSomeEvents();

            expect( mediator.callCount ).toBe( 1 );
            expect( mediator.calls[0].args[0][0].name ).toBe( "testingEventPump" );
            expect( mediator.calls[0].args[0][0].event ).toEqual( { id: "first" } );
            expect( mediator.calls[0].args[0][1].name ).toBe( "testingEventPump" );
            expect( mediator.calls[0].args[0][1].event ).toEqual( { id: "second" } );
            expect( mediator.calls[0].args[0][2].name ).toBe( "testingEventPump" );
            expect( mediator.calls[0].args[0][2].event ).toEqual( { id: "third" } );
        });

        it( "allows the event mediator to reorder the given event batch", function() {
            mediator = mediator.andCallFake( function( eventBatch ) {
                var newEventBatch = [];
                while( eventBatch.length > 0 ) {
                    newEventBatch.push( eventBatch.pop() );
                }
                return newEventBatch;
            });
            eventPump = new EventPump( { mediator: mediator } );

            subscribeAndPublishSomeEvents();

            expect( subscriberCallback1.callCount ).toBe( 3 );
            expect( subscriberCallback1.calls[0].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[0].args[1].id ).toBe( "third" );
            expect( subscriberCallback1.calls[1].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[1].args[1].id ).toBe( "second" );
            expect( subscriberCallback1.calls[2].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[2].args[1].id ).toBe( "first" );
        });

        it( "allows the event mediator to remove events", function() {
            mediator = mediator.andCallFake( function( eventBatch ) {
                eventBatch.splice( 0, 1 );
                return eventBatch;
            });
            eventPump = new EventPump( { mediator: mediator } );

            subscribeAndPublishSomeEvents();

            expect( subscriberCallback1.callCount ).toBe( 2 );
            expect( subscriberCallback1.calls[0].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[0].args[1].id ).toBe( "second" );
            expect( subscriberCallback1.calls[1].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[1].args[1].id ).toBe( "third" );
        });

        it( "allows the event mediator to add events", function() {
            mediator = mediator.andCallFake( function( eventBatch ) {
                eventBatch.push( { name: "addedEvent", event: { id: "new" } } );
                return eventBatch;
            });
            eventPump = new EventPump( { mediator: mediator } );

            subscribeAndPublishSomeEvents();

            expect( subscriberCallback1.callCount ).toBe( 4 );
            expect( subscriberCallback1.calls[0].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[0].args[1].id ).toBe( "first" );
            expect( subscriberCallback1.calls[1].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[1].args[1].id ).toBe( "second" );
            expect( subscriberCallback1.calls[2].args[0] ).toBe( "testingEventPump" );
            expect( subscriberCallback1.calls[2].args[1].id ).toBe( "third" );
            expect( subscriberCallback1.calls[3].args[0] ).toBe( "addedEvent" );
            expect( subscriberCallback1.calls[3].args[1].id ).toBe( "new" );
        });
    });

    describe( "An event pump", function() {
        var eventPump;
        var subscriberCallback1;
        var subscriberCallback2;
        var subscriberCallback3;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" );
            subscriberCallback3 = jasmine.createSpy( "Subscriber callback 3" );
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "", subscriberCallback2 );
            eventPump.subscribe( "testingEventPump.", subscriberCallback3 );
        });

        // A subscriber becomes established in the next JavaScript event cycle. This is to allow
        // events to be delivered to former subscribers, before registering the new subscribers
        // (see spec above). Before it is established, it is called a pending subscriber.
        var sharedBehaviorForPendingAndEstablishedSubscribers = function( description, beforeEachFunc ) {
            describe( description, function() {
                beforeEach(beforeEachFunc);

                it( "supports unsubscribing named events from the event pump", function() {
                    expect( function() { eventPump.unsubscribe( subscriberCallback1 ); } ).not.toThrow();
                });

                it( "supports unsubscribing wildcard events from the event pump", function() {
                    expect( function() { eventPump.unsubscribe( subscriberCallback2 ); } ).not.toThrow();
                });

                it( "supports unsubscribing partial wildcard events from the event pump", function() {
                    expect( function() { eventPump.unsubscribe( subscriberCallback3 ); } ).not.toThrow();
                });

                it( "ignores repeated unsubscriptions from the event pump", function() {
                    expect( function() {
                        for( var i = 2; i > 0; --i ) {
                            eventPump.unsubscribe( subscriberCallback1 );
                            eventPump.unsubscribe( subscriberCallback2 );
                            eventPump.unsubscribe( subscriberCallback3 );
                        }
                    }).not.toThrow();
                });

                it( "does no longer call callbacks after unsubscribing them", function() {
                    eventPump.unsubscribe( subscriberCallback1 );
                    eventPump.unsubscribe( subscriberCallback2 );
                    eventPump.unsubscribe( subscriberCallback3 );
                    eventPump.publish( "testingEventPump.subject", {} );
                    jasmine.Clock.tick( 0 );
                    expect( subscriberCallback1 ).not.toHaveBeenCalled();
                    expect( subscriberCallback2 ).not.toHaveBeenCalled();
                    expect( subscriberCallback3 ).not.toHaveBeenCalled();
                });

                it( "has a subscription count matching the number of subscribed subscribers", function() {
                    expect( eventPump.numberOfSubscribers() ).toBe( 3 );
                });

                // We need to make sure that there are no resource leaks in the EventPump
                it( "has a subscription count of zero after unsubscribing all subscribers", function() {
                    eventPump.unsubscribe( subscriberCallback1 );
                    eventPump.unsubscribe( subscriberCallback2 );
                    eventPump.unsubscribe( subscriberCallback3 );
                    expect( eventPump.numberOfSubscribers() ).toBe( 0 );
                });
            });
        };

        sharedBehaviorForPendingAndEstablishedSubscribers( "with pending subscribers (clock did not tick)", function() {
        });

        sharedBehaviorForPendingAndEstablishedSubscribers( "with established subscribers (clock ticked)", function() {
            jasmine.Clock.tick( 0 );
        });
    });

    describe( "Given an event pump with multiple subscribers, when a matching event is emitted,", function() {
        var eventPump;
        var subscriberCallback1;
        var subscriberCallback2;

        beforeEach( function() {
            jasmine.Clock.useMock();
            eventPump = new EventPump();
            var justThrow = function() {
                throw "Just testing";
            };
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" ).andCallFake( justThrow );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" ).andCallFake( justThrow );
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump", subscriberCallback2 );
            eventPump.publish( "testingEventPump", {} );
            jasmine.Clock.tick( 0 );
        });

        it( "all subscribers are called, even if some of them throw exceptions", function() {
            expect( subscriberCallback1 ).toHaveBeenCalled();
            expect( subscriberCallback2 ).toHaveBeenCalled();
        });
    });

    describe( "An event pump with a configured exception reporter", function() {
        var eventPump;
        var subscriberCallback1;
        var subscriberCallback2;
        var exceptionReporter;

        function justThrow() {
            throw "Just testing";
        }

        beforeEach( function() {
            jasmine.Clock.useMock();
            exceptionReporter = jasmine.createSpy( "Exception reporter" );
            eventPump = new EventPump( { exceptionReporter: exceptionReporter } );
            subscriberCallback1 = jasmine.createSpy( "Subscriber callback 1" ).andCallFake( justThrow );
            subscriberCallback2 = jasmine.createSpy( "Subscriber callback 2" ).andCallFake( justThrow );
            eventPump.subscribe( "testingEventPump", subscriberCallback1 );
            eventPump.subscribe( "testingEventPump", subscriberCallback2 );
        });

        it( "calls the reporter with all exception details if subscription callbacks throw", function() {
            eventPump.publish( "testingEventPump", {} );
            jasmine.Clock.tick( 0 );

            expect( exceptionReporter ).toHaveBeenCalledWith( {
                exception: "Just testing",
                args: [
                    { name: "testingEventPump" },
                    { event: {} } ],
                callback: subscriberCallback1,
                action: "callSubscriber"
            } );
            expect( exceptionReporter ).toHaveBeenCalledWith( {
                exception: "Just testing",
                args: [
                    { name: "testingEventPump" },
                    { event: {} } ],
                callback: subscriberCallback2,
                action: "callSubscriber"
            } );
        });

        it( "calls the reporter with all exception details if a completion callback throws", function() {
            eventPump.publish( "testingBadPublisherCallback", {}, justThrow );
            jasmine.Clock.tick( 0 );

            expect( exceptionReporter ).toHaveBeenCalledWith( {
                exception: "Just testing",
                args: [ { numberOfSubscribers: 0 } ],
                callback: justThrow,
                action: "callCompletionCallback"
            } );
        });
    });

    describe( "An event pump with a configured exception reporter and a configured mediator", function() {
        var eventPump;
        var exceptionReporter;
        var mediator;

        beforeEach( function() {
            jasmine.Clock.useMock();
            var justThrow = function() {
                throw "Just testing";
            };

            exceptionReporter = jasmine.createSpy( "Exception reporter" );
            mediator = jasmine.createSpy( "Mediator" ).andCallFake( justThrow );
            eventPump = new EventPump( { exceptionReporter: exceptionReporter, mediator: mediator } );
            eventPump.publish( "testingEventPump", {} );
            jasmine.Clock.tick( 0 );
        });

        it( "calls the reporter with all exception details if the mediator throws", function() {
            expect( exceptionReporter.callCount ).toBe( 1 );
            expect( exceptionReporter.calls[0].args[0].action ).toBe( "callMediator" );
            expect( exceptionReporter.calls[0].args[0].exception ).toBe( "Just testing" );
            expect( exceptionReporter.calls[0].args[0].callback ).toBe( mediator );
            expect( exceptionReporter.calls[0].args[0].args ).toEqual( jasmine.any( Object ) );
        });
    });

    describe( "An event pump with a configured exception creator", function() {
        var eventPump;
        var exceptionCreator;

        beforeEach( function() {
            exceptionCreator = jasmine.createSpy( "Exception creator" ).andCallFake( function( message, name ) {
                return { name: name, message: message };
            });
            eventPump = new EventPump( { exceptionCreator : exceptionCreator } );
        });

        it( "calls the configured creator with message and exception name for constructing new exceptions", function() {
            expect( function() { eventPump.publish(); } ).toThrow();
            expect( exceptionCreator ).toHaveBeenCalled();
            expect( exceptionCreator.calls[0].args[0] ).toEqual( jasmine.any( String ) );
            expect( exceptionCreator.calls[0].args[1] ).toBe( "BadEventName" );
        });
    });
})( EventPump.EventPump );
