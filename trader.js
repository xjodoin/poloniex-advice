var plnx = require('plnx');
var config = require('./config/prod.json');
var adviceEventEmiter = require('./adviceEventEmiter');

var wallet = {
  BTC:0,
  ETH:0
};


var startTrading = function () {
  console.log('Start trading wallet : '+JSON.stringify(wallet));

  adviceEventEmiter.on('advice', function (advice) {
    console.log(advice);
  });

};


module.exports = function () {
  // private without options
  plnx.returnAvailableAccountBalances(config, function(err, data) {
    wallet = data.exchange;
    startTrading();
  });

};
