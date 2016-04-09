var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');
var config = require('../config/prod.json');

var currency = config.currency;


var paper = {
  currency: 0,
  btc: 2
};

var fee = 0.0025;
var previousAdvice;

var startTrading = function() {

  adviceEventEmiter.on('advice', function(advice) {

    winston.info('New advice ' + JSON.stringify(advice));

    var lastAvgPrice = advice.lastAvgPrice;

    if (previousAdvice) {
      var diff;
      if (advice.type === 'buy') {
        diff = (previousAdvice.lastAvgPrice - lastAvgPrice) / lastAvgPrice;
      } else if (advice.type === 'sell') {
        diff = (lastAvgPrice - previousAdvice.lastAvgPrice) / previousAdvice.lastAvgPrice;
      }

      winston.info('diff between advice ' + (diff * 100) + '%');
      if (diff < fee) {
        winston.info('block trading');
        previousAdvice = advice;
        return;
      }
    }

    previousAdvice = advice;

    //simulate trading
    if (advice.type === 'buy' && paper.btc > 0) {
      var currencyTotal = paper.btc / lastAvgPrice;
      var currencyFee = currencyTotal * 0.0025;
      winston.info('PAPER -- ' + currency + ' transaction fee : ' + ethFee);
      paper.currency = currencyTotal - currencyFee;
      paper.btc = 0;
    } else if (advice.type === 'sell' && paper.currency > 0) {
      var btcTotal = paper.currency * lastAvgPrice;
      var btcFee = btcTotal * 0.0025;
      winston.info("PAPER -- BTC transaction fee : " + btcFee);
      paper.btc = btcTotal - btcFee;
      paper.currency = 0;
    }

    winston.info("PAPER -- Simulate account BTC : " + paper.btc + " " + currency + " : " + paper.currency);


  });
};


module.exports = {
  init: function() {
    startTrading();
  }
};
