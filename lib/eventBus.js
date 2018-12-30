const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}
const event = new MyEmitter();

module.exports = event;
