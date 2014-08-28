'use strict';

var Stenograph = require('../');

var steno = Stenograph.getInstance();

function fakeRestCall(url, callback) {
  var randomTime = Math.floor(Math.random() * 1000);
  var transactions = steno.currentTransactionChain();
  var names = transactions.map(function (transaction) {
    return transaction.name;
  });
  console.log(names.join(' > ') + ' randomTime', randomTime);
  setTimeout(function () {
    callback(null, '<html>');
  }, randomTime);
}

module.exports = function (url, callback) {
  steno.startTransaction('restCall', {
    transaction: function (end) {
      fakeRestCall(url, end);
    },
    callback: callback
  });
};
