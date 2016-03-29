var EventEmitter = require('events');
var util = require('util');

function AdviceEventEmiter() {
  EventEmitter.call(this);
}
util.inherits(AdviceEventEmiter, EventEmitter);

module.exports = new AdviceEventEmiter();
