'use strict';

var Hoek = require('hoek');
var once = require('once');
var EventEmitter = require('events').EventEmitter;
var NestingDoll = require('nesting-doll');

function Stenograph(options) {
  options = options || {};

  this.events = options.events || new EventEmitter();

  this.nestingDoll = new NestingDoll();
  this.namespace = this.nestingDoll._namespace;
}

Stenograph.EVENTS = '__steno_events__';

Stenograph.NOOP = function () {};

Stenograph._getEvents = function () {
  return global[Stenograph.EVENTS];
};

Stenograph._setEvents = function (events) {
  global[Stenograph.EVENTS] = events;
};

Stenograph.getInstance = function (useLocalEvents) {
  var options = {};

  if (useLocalEvents) {
    options.events = null;
  } else {
    options.events = Stenograph._getEvents();
    if (!options.events) {
      options.events = new EventEmitter();
      Stenograph._setEvents(options.events);
    }
  }

  return new Stenograph(options);
};

Stenograph.prototype.startTransaction = function (name, options) {
  Hoek.assert(typeof name === 'string', 'name should be a string');
  Hoek.assert(options, 'options should be an object');
  Hoek.assert(typeof options.transaction === 'function', 'options.transaction should be a function');

  var transaction = options.transaction;
  var callback = options.callback || Stenograph.NOOP;

  if (!this.hasListeners()) {
    return transaction(once(callback));
  }

  var self = this;
  var doll = this.nestingDoll.nest(name, options.state);
  var context = doll.namespace.createContext();

  var end = doll.rawBind(once(function () {
    doll.deactivate();
    self.events.emit('transaction-end', doll);
    return callback.apply(null, arguments);
  }), context);

  var startTransaction = doll.bind(function () {
    doll.activate();
    self.events.emit('transaction-start', doll);
    return transaction(end);
  }, context);

  return startTransaction();
};

Stenograph.prototype.hasListeners = function () {
  var startListeners = this.events.listeners('transaction-start');
  var endListeners = this.events.listeners('transaction-end');

  return !!(startListeners.length || endListeners.length);
};

Stenograph.prototype.currentTransaction = function () {
  return this.nestingDoll.currentDoll();
};

Stenograph.prototype.currentTransactionChain = function (transaction) {
  var chain = [];

  transaction = transaction || this.currentTransaction();

  while (transaction) {
    chain.push(transaction);
    transaction = transaction.previous();
  }

  return chain.reverse();
};

Stenograph.prototype.bindEmitters = function (emitters) {
  Hoek.assert(emitters, 'emitters should exist');

  emitters = Array.isArray(emitters) ? emitters : [].slice.apply(arguments);

  for (var i = 0, len = emitters.length; i < len; i += 1) {
    this.namespace.bindEmitter(emitters[i]);
  }
};

Stenograph.prototype.onStart = function (handler) {
  this.events.on('transaction-start', handler);
};

Stenograph.prototype.onEnd = function (handler) {
  this.events.on('transaction-end', handler);
};

Stenograph.prototype.get = function (key) {
  return this.namespace.get(key);
};

Stenograph.prototype.set = function (key, value) {
  return this.namespace.set(key, value);
};

module.exports = Stenograph;
