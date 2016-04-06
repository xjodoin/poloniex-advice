var plnx = require('plnx');
var _ = require('lodash');
var winston = require('winston');
var config = require('../config/prod.json');
var adviceEventEmiter = require('../adviceEventEmiter');

var currency = config.currency;
var currencyPair = 'BTC_'+currency;

var safePosition = config.safePosition;

var walletService = require('../wallet');
var fee = 0.0025;

var startTrading = function() {
  adviceEventEmiter.on('advice', function(advice) {
    winston.info('New advice ' + JSON.stringify(advice));
    var lastAvgPrice = advice.lastAvgPrice;

    var transactionConfig = {
      key: config.key,
      secret: config.secret,
      currencyPair: currencyPair,
      rate: lastAvgPrice
    };

    walletService.loadWallet(function(err, wallet) {

      if(err) {
        winston.error(err);
        return;
      }

      winston.info('Current wallet : ' + JSON.stringify(wallet));

      if (advice.type === 'sell' && wallet.currencyValue > 0.0001) {
        var totalBtc = (wallet.currencyValue * lastAvgPrice) * (1 - fee);
        winston.info('Total btc without fee ' + totalBtc);
        var profitBtc = (totalBtc - wallet.currencyBtcCost) / wallet.currencyBtcCost;
        winston.info('Profit ' + (profitBtc * 100) + '%');

        if (profitBtc > 0 || safePosition) {
          transactionConfig.amount = wallet.currencyValue;
          winston.info('Sell order : ' + JSON.stringify(transactionConfig));
          plnx.sell(transactionConfig, function(err, data) {
            if (err) {
              winston.error(err);
            } else {
              winston.info(data);
            }
          });
        }

      } else if (advice.type === 'buy' && wallet.btc > 0.0001) {
        var totalCurrency = (wallet.btc / lastAvgPrice) * (1 - fee);
        winston.info('Total '+currency+' without fee ' + totalCurrency);
        var profitCurrency = (totalCurrency - wallet.btcCurrencyCost) / wallet.btcCurrencyCost;
        winston.info('Profit ' + (profitCurrency * 100) + '%');

        if (profitCurrency > 0) {
          transactionConfig.amount = wallet.btc / lastAvgPrice;
          winston.info('Buy order : ' + JSON.stringify(transactionConfig));
          plnx.buy(transactionConfig, function(err, data) {
            if (err) {
              winston.error(err);
            } else {
              winston.info(data);
            }
          });
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
