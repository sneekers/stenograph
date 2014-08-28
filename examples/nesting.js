'use strict';

var Stenograph = require('../');
var fakeRestCall = require('./nested');

var steno = Stenograph.getInstance();

function fakeAsyncCall(callback) {
  var randomTime = Math.floor(Math.random() * 1000);
  var transactions = steno.currentTransactionChain();
  var names = transactions.map(function (transaction) {
    return transaction.name;
  });
  console.log(names.join(' > ') + ' randomTime', randomTime);
  setTimeout(function () {
    fakeRestCall('http://foo.com', callback);
  }, randomTime);
}

steno.onStart(function (transaction) {
  transaction.set('id', Math.floor(Math.random()*200));
  transaction.set('timestamp', Date.now());

  var transactions = steno.currentTransactionChain(transaction);
  var names = transactions.map(function (transaction) {
    return transaction.name;
  });
  console.log(names.join(' > '), 'start', transaction.state);
});

steno.onEnd(function (transaction) {
  var timestamp = transaction.get('timestamp');

  transaction.set('diff', Date.now() - timestamp);

  var transactions = steno.currentTransactionChain(transaction);
  var names = transactions.map(function (transaction) {
    return transaction.name;
  });
  console.log(names.join(' > '), 'end', transaction.state);
});

steno.startTransaction('asyncCall', {
  transaction: function (end) {
    fakeAsyncCall(end);
  },
  callback: function (err, data) {
    console.log(err, data);
  }
});
