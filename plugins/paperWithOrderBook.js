var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');
var config = require('config');

var currency = config.get('currency');


var paper = {
  currency: 0,
  btc: 2
};

var fee = 0.0025;
var previousAdvice;

function buy(book, total) {
  var remaning = total;
  var quantity = 0;
  _.each(book, function(order) {
    var sub = order[0] * order[1];
    if(sub < remaning) {
      remaning = remaning - sub;
      quantity = quantity + order[1];
    }
    else {
      quantity = quantity + (remaning * order[0]);
      return false;
    }
  });
  return quantity;
}

function sell(book, total) {
  var remaning = total;
  var quantity = 0;
  _.each(book,function(order) {
    if(remaning < order[1]) {
      remaning = remaning - order[1];
      quantity = quantity + (order[0] * order[1]);
    }
    else {
      quantity = quantity + (remaning * order[0]);
      return false;
    }
  });
  return quantity;
}

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
      var currencyTotal = buy(advice.orderBook.asks, paper.btc);
      var currencyFee = currencyTotal * 0.0025;
      winston.info('PAPER -- ' + currency +' total : '+ currencyTotal + ' transaction fee : ' + currencyFee);
      paper.currency = currencyTotal - currencyFee;
      paper.btc = 0;
    } else if (advice.type === 'sell' && paper.currency > 0) {
      var btcTotal =  sell(advice.orderBook.bids, paper.currency);
      var btcFee = btcTotal * 0.0025;
      winston.info('PAPER -- BTC total : '+btcTotal+' transaction fee : ' + btcFee);
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
