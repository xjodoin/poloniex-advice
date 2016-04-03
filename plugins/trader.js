var plnx = require('plnx');
var _ = require('lodash');
var winston = require('winston');
var config = require('../config/prod.json');
var adviceEventEmiter = require('../adviceEventEmiter');

var wallet = require('../wallet');
var fee = 0.0025;

var startTrading = function() {
  adviceEventEmiter.on('advice', function(advice) {
    winston.info('New advice ' + JSON.stringify(advice));
    var lastAvgPrice = advice.lastAvgPrice;

    var transactionConfig = {
      key: config.key,
      secret: config.secret,
      currencyPair: 'BTC_ETH',
      rate: lastAvgPrice
    };

    wallet.loadWallet(function(err, wallet) {

      if(err) {
        winston.error(err);
        return;
      }

      winston.info('Current wallet : ' + JSON.stringify(wallet));

      if (advice.type === 'sell' && wallet.eth > 0.0001) {
        var totalBtc = (wallet.eth * lastAvgPrice) * (1 - fee);
        winston.info('Total btc without fee ' + totalBtc);
        var profitBtc = (totalBtc - wallet.ethBtcCost) / wallet.ethBtcCost;
        winston.info('Profit ' + (profitBtc * 100) + '%');

        if (profitBtc > 0) {
          transactionConfig.amount = wallet.eth;
          winston.info('Sell order : ' + JSON.stringify(transactionConfig));
          // plnx.sell(transactionConfig, function(err, data) {
          //   if (err) {
          //     winston.error(err);
          //   } else {
          //     winston.info(data);
          //   }
          // });
        }

      } else if (advice.type === 'buy' && wallet.btc > 0.0001) {
        var totalEth = (wallet.btc / lastAvgPrice) * (1 - fee);
        winston.info('Total eth without fee ' + totalEth);
        var profitEth = (totalEth - wallet.btcEthCost) / wallet.btcEthCost;
        winston.info('Profit ' + (profitEth * 100) + '%');

        if (profitEth > 0) {
          transactionConfig.amount = wallet.btc / lastAvgPrice;
          winston.info('Buy order : ' + JSON.stringify(transactionConfig));
          // plnx.buy(transactionConfig, function(err, data) {
          //   if (err) {
          //     winston.error(err);
          //   } else {
          //     winston.info(data);
          //   }
          // });
        }
      }
    });

  });
};

module.exports = {
  init: function() {
    // private without options
    plnx.returnAvailableAccountBalances({
      key: config.key,
      secret: config.secret
    }, function(err, data) {
      if (err) {
        winston.error(err);
      } else {
        winston.info('Start trading wallet : ' + JSON.stringify(data));
        startTrading();
      }
    });

  }
};
