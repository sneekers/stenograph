# Stenograph [![travis](https://img.shields.io/travis/sneekers/stenograph.svg)](https://travis-ci.org/sneekers/stenograph) [![npm](https://img.shields.io/npm/v/stenograph.svg)](https://npmjs.org/package/stenograph)

Stenograph is a straight forward nested transaction library. It allows you to track your transactions such as I/O
across modules, files, and even the event loop. You can write your transaction instrumentation code once and not
worry about passing around anything about the transaction.

Stenograph does add a minor amount of boilerplate, but it was written in such a way to be straight forward
and to minimize the amount of boilerplate. Built on the idea of write once, use anywhere.

## Install
```sh
npm install stenograph
```

## API

```js
var Stenograph = require('stenograph');
var steno = Stenograph.getInstance();
```
