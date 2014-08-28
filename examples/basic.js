'use strict';

var Stenograph = require('../');

var steno = Stenograph.getInstance();

function fakeRestCall(url, callback) {
  var randomTime = Math.floor(Math.random() * 1000);
  console.log('randomTime', randomTime);
  setTimeout(function () {
    callback(null, '<html>');
  }, randomTime);
}

steno.onStart(function (transaction) {
  transaction.set('id', Math.floor(Math.random()*200));
  transaction.set('timestamp', Date.now());
  console.log(transaction.name, 'start', transaction.state);
});

steno.onEnd(function (transaction) {
  var timestamp = transaction.get('timestamp');
  transaction.set('diff', Date.now() - timestamp);
  console.log(transaction.name, 'end', transaction.state);
});

steno.startTransaction('restCall', {
  transaction: function (end) {
    fakeRestCall('http://example.com', end);
  },
  callback: function (err, data) {
    console.log(err, data);
  }
});
