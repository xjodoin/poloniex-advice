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

    wallet.loadWallet(function(err, wallet) {
      winston.info('Current wallet : ' + wallet);
      if (advice.type === 'sell' && wallet.eth > 0.0001) {
        var totalBtc = (wallet.eth * lastAvgPrice) * (1 - fee);
        winston.info('Total btc without fee ' + totalBtc);
        var profitBtc = (totalBtc - wallet.ethBtcCost) / wallet.ethBtcCost;
        winston.info('Profit ' + (profitBtc * 100) + '%');

        if (profitBtc > 0) {
          winston.info('Sell now !!');
        }

      } else if (advice.type === 'buy' && wallet.btc > 0.0001) {
        var totalEth = (wallet.btc / lastAvgPrice) * (1 - fee);
        winston.info('Total eth without fee ' + totalEth);
        var profitEth = (totalEth - wallet.btcEthCost) / wallet.btcEthCost;
        winston.info('Profit ' + (profitEth * 100) + '%');

        if (profitEth > 0) {
          winston.info('Buy now !!');
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
