/*jshint expr: true*/
'use strict';

var Lab = require('lab');
var expect = require('chai').expect;

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var it = lab.it;

var EventEmitter = require('events').EventEmitter;
var Doll = require('nesting-doll/lib/doll');
var Stenograph = require('../');

describe('Stenograph', function () {

  var steno;
  var namespace;
  var hasListeners;
  beforeEach(function (done) {
    hasListeners = Stenograph.prototype.hasListeners;
    Stenograph.prototype.hasListeners = function () {
      return true;
    };

    steno = new Stenograph();
    namespace = steno.namespace;
    done();
  });

  afterEach(function (done) {
    Stenograph.prototype.hasListeners = hasListeners;
    done();
  });

  describe('startTransaction', function () {

    describe('validation', function () {

      it('requires a name', function (done) {
        function fn() {
          steno.startTransaction(null);
        }

        expect(fn).to.throw(/name/);
        done();
      });

      it('requires options', function (done) {
        function fn() {
          steno.startTransaction('foo');
        }

        expect(fn).to.throw(/object/);
        done();
      });

      it('requires a transaction function', function (done) {
        function fn() {
          steno.startTransaction('foo', {});
        }

        expect(fn).to.throw(/options.transaction/);
        done();
      });

    });

    describe('without callback', function () {

      var noop;
      beforeEach(function (done) {
        noop = Stenograph.NOOP;
        done();
      });

      afterEach(function (done) {
        Stenograph.NOOP = noop;
        done();
      });

      it('calls transaction passing wrapped noop', function (done) {
        var value = 'bar';

        Stenograph.NOOP = function (arg) {
          expect(arg).to.equal(value);
        };

        steno.startTransaction('foo', {
          transaction: function (end) {
            end(value);
          }
        });
        done();
      });

      it('sets the same namespace context for transaction and end', function (done) {
        var originalContext = namespace.active;
        var transactionContext;

        expect(originalContext).to.be.null;

        Stenograph.NOOP = function () {
          expect(namespace.active).to.not.equal(originalContext);
          expect(namespace.active).to.equal(transactionContext);
        };

        steno.startTransaction('foo', {
          transaction: function (end) {
            expect(namespace.active).to.not.equal(originalContext);

            transactionContext = namespace.active;
            end();
          }
        });
        done();
      });

    });

    describe('with callback', function () {

      var rawCalled = 0;
      var rawBind;
      beforeEach(function (done) {
        rawBind = Doll.prototype.rawBind;

        Doll.prototype.rawBind = function () {
          rawCalled += 1;
          return rawBind.apply(this, arguments);
        };

        done();
      });

      afterEach(function (done) {
        rawCalled = 0;
        Doll.prototype.rawBind = rawBind;
        done();
      });

      it('calls wrapped callback after calling end', function (done) {
        var value = 'bar';

        steno.startTransaction('foo', {
          transaction: function (end) {
            end(value);
          },
          callback: function (arg) {
            expect(arg).to.equal(value);
          }
        });
        done();
      });

      it('sets the same namespace context for transaction and callback', function (done) {
        var originalContext = namespace.active;
        var transactionContext;

        expect(originalContext).to.be.null;

        steno.startTransaction('foo', {
          transaction: function (end) {
            expect(namespace.active).to.not.equal(originalContext);

            transactionContext = namespace.active;
            end();
          },
          callback: function () {
            expect(namespace.active).to.not.equal(originalContext);
            expect(namespace.active).to.equal(transactionContext);
          }
        });
        done();
      });

      it('works across async functions', function (done) {
        var context = namespace.active;

        expect(context).to.be.null;

        steno.startTransaction('foo', {
          transaction: function (end) {
            expect(namespace.active).to.not.equal(context);

            context = namespace.active;
            setTimeout(function () {
              end();
            });
          },
          callback: function () {
            expect(namespace.active).to.equal(context);
          }
        });
        done();
      });

      it('raw binds to avoid reseting state', function (done) {
        steno.startTransaction('foo', {
          transaction: function (end) {
            end();
          },
          callback: function () {
            expect(rawCalled).to.equal(1);
            done();
          }
        });
      });

    });

    it('immediately runs the transaction if there are no listeners', function (done) {
      var callback = function () {
        return true;
      };

      steno.hasListeners = function () {
        return false;
      };

      steno.startTransaction('foo', {
        transaction: function (end) {
          expect(end).to.equal(callback);
          done();
        },
        callback: callback
      });
    });

  });

  describe('hasListeners', function () {

    beforeEach(function (done) {
      Stenograph.prototype.hasListeners = hasListeners;

      done();
    });

    it('returns false if there are no listeners', function (done) {
      var localSteno = new Stenograph();

      expect(localSteno.hasListeners()).to.be.false;
      done();
    });

    it('returns true if there is an onStart listener', function (done) {
      var localSteno = new Stenograph();

      localSteno.onStart(function () {});

      expect(localSteno.hasListeners()).to.be.true;
      done();
    });

    it('returns true if there is an onEnd listener', function (done) {
      var localSteno = new Stenograph();

      localSteno.onEnd(function () {});

      expect(localSteno.hasListeners()).to.be.true;
      done();
    });

    it('returns true if there are both listener', function (done) {
      var localSteno = new Stenograph();

      localSteno.onStart(function () {});
      localSteno.onEnd(function () {});

      expect(localSteno.hasListeners()).to.be.true;
      done();
    });
  });

  describe('currentTransaction', function () {

    it('returns null if there is no current transaction', function (done) {
      var transaction = steno.currentTransaction();

      expect(transaction).to.be.null;
      done();
    });

    it('returns the current transaction', function (done) {
      var name = 'test';
      steno.startTransaction(name, {
        transaction: function (end) {
          var transaction = steno.currentTransaction();

          expect(transaction).to.exist;
          expect(transaction).to.have.property('name', name);
          end();
          done();
        }
      });
    });

  });

  describe('events', function () {

    it('is an event emitter', function (done) {
      expect(steno.events).to.be.instanceOf(EventEmitter);
      done();
    });

    it('emits transaction-start event when calling transaction', function (done) {
      var name = 'foo';

      steno.onStart(function (transaction) {
        expect(transaction).to.exist;
        expect(transaction).to.have.property('name', name);
        done();
      });

      steno.startTransaction(name, {
        transaction: function (end) {
          end();
        }
      });
    });

    it('emits transaction-end event after calling end', function (done) {
      var name = 'foo';
      var value = 'bar';

      steno.onEnd(function (transaction) {
        expect(transaction).to.exist;
        expect(transaction).to.have.property('name', name);
        expect(transaction.get(name)).to.equal(value);
        done();
      });

      steno.startTransaction(name, {
        transaction: function (end) {
          var transaction = steno.currentTransaction();
          transaction.set(name, value);
          end();
        }
      });
    });

  });

  describe('bindEmitters', function () {

    var bindCalled = 0;
    var bindEmitter;
    beforeEach(function (done) {
      bindEmitter = steno.namespace.bindEmitter;
      steno.namespace.bindEmitter = function () {
        bindCalled += 1;
        bindEmitter.apply(this, arguments);
      };
      done();
    });

    afterEach(function (done) {
      bindCalled = 0;
      steno.namespace.bindEmitter = bindEmitter;
      done();
    });

    it('binds an event emitter to the given namespace', function (done) {
      var emitter = new EventEmitter();

      steno.bindEmitters(emitter);

      expect(bindCalled).to.equal(1);
      done();
    });

    it('binds any number of event emitters', function (done) {
      var emitter = new EventEmitter();
      var emitterTwo = new EventEmitter();
      var emitterThree = new EventEmitter();

      steno.bindEmitters(emitter, emitterTwo, emitterThree);

      expect(bindCalled).to.equal(3);
      done();
    });

    it('binds any number of event emitters passed as an array', function (done) {
      var emitter = new EventEmitter();
      var emitterTwo = new EventEmitter();
      var emitterThree = new EventEmitter();

      steno.bindEmitters([emitter, emitterTwo, emitterThree]);

      expect(bindCalled).to.equal(3);
      done();
    });

  });

  describe('getter/setter', function () {

    it('gets data from the namespace', function (done) {
      var key = 'foo';
      var value = 'bar';

      steno.namespace.set(key, value);

      expect(steno.get(key)).to.equal(value);
      done();
    });

    it('sets data to the namespace', function (done) {
      var key = 'foo';
      var value = 'bar';

      steno.set(key, value);

      expect(steno.namespace.get(key)).to.equal(value);
      done();
    });

  });

  describe('global events getter/setter', function () {

    afterEach(function (done) {
      delete global[Stenograph.EVENTS];
      done();
    });

    it('gets the global events', function (done) {
      var events = 'foo';
      global[Stenograph.EVENTS] = events;

      expect(Stenograph._getEvents()).to.equal(events);
      done();
    });

    it('sets the global events', function (done) {
      var events = 'foo';
      Stenograph._setEvents(events);

      expect(global[Stenograph.EVENTS]).to.equal(events);
      done();
    });

  });

  describe('getInstance', function () {

    var globalEvents;
    var getEvents;
    var setEvents;
    var getCalled = 0;
    var setCalled = 0;
    beforeEach(function (done) {
      getEvents = Stenograph._getEvents;
      setEvents = Stenograph._setEvents;

      Stenograph._getEvents = function () {
        getCalled += 1;
        return globalEvents;
      };

      Stenograph._setEvents = function (events) {
        setCalled += 1;
        globalEvents = events;
      };

      done();
    });

    afterEach(function (done) {
      Stenograph._getEvents = getEvents;
      Stenograph._setEvents = setEvents;

      globalEvents = undefined;

      getCalled = 0;
      setCalled = 0;

      done();
    });

    it('returns a new instance of Stenograph', function (done) {
      expect(Stenograph.getInstance()).to.be.instanceOf(Stenograph);
      done();
    });

    it('uses local events if useLocalEvents is passed in as true', function (done) {
      var localSteno = Stenograph.getInstance(true);

      expect(localSteno.events)
        .to.exist.and
        .to.not.equal(globalEvents);

      done();
    });

    it('creates global events if undefined', function (done) {
      var localSteno = Stenograph.getInstance();

      expect(localSteno.events)
        .to.exist.and
        .to.equal(globalEvents);

      expect(getCalled).to.equal(1);
      expect(setCalled).to.equal(1);

      done();
    });

    it('uses global events if defined', function (done) {
      globalEvents = new EventEmitter();

      var localSteno = Stenograph.getInstance();

      expect(localSteno.events)
        .to.exist.and
        .to.equal(globalEvents);

      expect(getCalled).to.equal(1);
      expect(setCalled).to.equal(0);

      done();
    });

  });

  describe('integration', function () {

    it('raw binds to avoid reseting state', function (done) {
      steno.startTransaction('foo', {
        transaction: function (end) {
          var transaction = steno.currentTransaction();
          expect(transaction)
            .to.property('_outer').and
            .to.be.null;
          expect(transaction)
            .to.property('_previous')
            .to.be.null;

          // Passing through transaction to callback to check if
          // end has been bound with rawBind instead of bind
          // to prevent running nesting-dolls nesting logic twice
          end(transaction);
        },
        callback: function (transaction) {
          // If regular bind was used for end/callback then
          // these checks would fail
          expect(transaction)
            .to.property('_outer').and
            .to.be.null;
          expect(transaction)
            .to.property('_previous')
            .to.be.null;
        }
      });
      done();
    });

  });

});
