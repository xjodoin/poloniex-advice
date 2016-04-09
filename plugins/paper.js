var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');
var config = require('../config/prod.json');

var currency = config.currency;


var paper = {
  currency: 100,
  btc: 0
};

var fee = 0.0025;
var lastBuyPrice;

var startTrading = function() {

  adviceEventEmiter.on('advice', function(advice) {

    var lastAvgPrice = advice.lastAvgPrice;

    if (lastBuyPrice) {
      var profit;
      if (advice.type === 'buy') {
        profit = (lastBuyPrice - lastAvgPrice) / lastAvgPrice;
      } else if (advice.type === 'sell') {
        profit = (lastAvgPrice - lastBuyPrice) / lastBuyPrice;
      }

      winston.info('PAPER -- Profit : ' + profit * 100 + ' %');
      if (profit < fee) {
        winston.info('PAPER -- Not enought profit to cover fee ' + fee + ' !!');
        return;
      }
    }

    //simulate trading
     if (advice.type === 'buy' && paper.btc > 0) {
       var currencyTotal = paper.btc / lastAvgPrice;
       var currencyFee = currencyTotal * 0.0025;
       winston.info('PAPER -- '+currency+' transaction fee : ' + currencyFee);
       paper.currency = currencyTotal - currencyFee;
       paper.btc = 0;
       lastBuyPrice = lastAvgPrice;
     } else if (advice.type === 'sell' && paper.currency > 0) {
       var btcTotal = paper.currency * lastAvgPrice;
       var btcFee = btcTotal * 0.0025;
       winston.info("PAPER -- BTC transaction fee : " + btcFee);
       paper.btc = btcTotal - btcFee;
       paper.currency = 0;
       lastBuyPrice = lastAvgPrice;
     }

     winston.info("PAPER -- Simulate account BTC : " + paper.btc + " "+currency+" : " + paper.currency);


  });
};


module.exports = {
  init: function() {
    startTrading();
  }
};
