var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');


var paper = {
  eth: 100,
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
       var ethTotal = paper.btc / lastAvgPrice;
       var ethFee = ethTotal * 0.0025;
       winston.info("PAPER -- ETH transaction fee : " + ethFee);
       paper.eth = ethTotal - ethFee;
       paper.btc = 0;
       lastBuyPrice = lastAvgPrice;
     } else if (advice.type === 'sell' && paper.eth > 0) {
       var btcTotal = paper.eth * lastAvgPrice;
       var btcFee = btcTotal * 0.0025;
       winston.info("PAPER -- BTC transaction fee : " + btcFee);
       paper.btc = btcTotal - btcFee;
       paper.eth = 0;
       lastBuyPrice = lastAvgPrice;
     }

     winston.info("PAPER -- Simulate account BTC : " + paper.btc + " ETH : " + paper.eth);


  });
};


module.exports = {
  init: function() {
    startTrading();
  }
};
