var plnx = require('plnx');
var _ = require('lodash');
var winston = require('winston');
var config = require('../config/prod.json');
var adviceEventEmiter = require('../adviceEventEmiter');

var fee = 0.0025;
var lastBuyPrice = config.lastBuyPrice;

var startTrading = function() {

  adviceEventEmiter.on('advice', function(advice) {
    winston.info('New advice ' + JSON.stringify(advice));
    var lastAvgPrice = advice.lastAvgPrice;

    if (lastBuyPrice) {
      var profit;
      if (advice.type === 'buy') {
        profit = (lastBuyPrice - lastAvgPrice) / lastAvgPrice;
      } else if (advice.type === 'sell') {
        profit = (lastAvgPrice - lastBuyPrice) / lastBuyPrice;
      }

      winston.info('Profit : ' + profit * 100 + ' %');
      if (profit < fee) {
        winston.info('Not enought profit to cover fee ' + fee + ' !!');
        return;
      }
    }

    //TODO should cancel existing sell order


    plnx.returnAvailableAccountBalances(config, function(err, data) {
      var wallet = data.exchange;
      winston.info('Current trading wallet : ' + JSON.stringify(wallet));

      var transactionConfig = {key: config.key,
        secret: config.secret
      };
      transactionConfig.currencyPair = 'BTC_ETH';
      transactionConfig.rate = lastAvgPrice;

      // buy: { currencyPair, rate, amount, fillOrKill?, immediateOrCancel? }
      if (advice.type === 'buy' && wallet.BTC > 0) {
        lastBuyPrice = lastAvgPrice;
        transactionConfig.amount = wallet.BTC;
        winston.info('Buy order : ' + JSON.stringify(transactionConfig));
        plnx.buy(transactionConfig, function(err, data) {
          winston.info(err, data);
        });
      } else if (advice.type === 'sell' && wallet.ETH > 0) {
        lastBuyPrice = lastAvgPrice;
        transactionConfig.amount = wallet.ETH;
        winston.info('Sell order : ' + JSON.stringify(transactionConfig));
        plnx.sell(transactionConfig, function(err, data) {
          winston.info(err, data);
        });
      }

    });



  });
};

module.exports = {
  init: function() {
    // private without options
    plnx.returnAvailableAccountBalances(config, function(err, data) {
      winston.info('Start trading wallet : ' + JSON.stringify(data));
      startTrading();
    });

  }
};
