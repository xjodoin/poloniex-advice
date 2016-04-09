var plnx = require('plnx');
var moment = require('moment');
var winston = require('winston');
var _ = require('lodash');
var async = require('async');
var config = require('./config/prod.json');

var currency = config.currency;
var currencyPair = 'BTC_'+currency;

function round(value) {
  return Math.round(value * 10000000) / 10000000;
}

var loadWallet = function(walletCallback) {

  async.series([function(callback) {
    plnx.returnTradeHistory({
      key: config.key,
      secret: config.secret,
      currencyPair: currencyPair,
      start: moment().subtract(10, 'days').unix()
    }, callback);
  }, function(callback) {
    plnx.returnAvailableAccountBalances({
      key: config.key,
      secret: config.secret
    }, callback);
  }, function(callback) {
    plnx.returnOpenOrders({
      key: config.key,
      secret: config.secret,
      currencyPair: currencyPair
    }, callback);
  }], function(err, results) {

    if (err) {
      walletCallback(err);
    } else {
      var trades = results[0];
      var balances = results[1].exchange;

      var currencyValue = balances[currency] || 0;
      var currencyBtcCost = 0;

      var btc = balances.BTC || 0;
      var btcCurrencyCost = 0;

      _.each(trades, function(trade) {
        var amount = parseFloat(trade.amount);
        var total = parseFloat(trade.total);
        var fee = parseFloat(trade.fee);

        if (trade.type === 'buy' && currencyValue > 0) {
          var currencyWithoutFee = amount - round(amount * fee);

          if (currencyWithoutFee > currencyValue) {
            var toCover = 1 - ((currencyWithoutFee - currencyValue) / currencyWithoutFee);
            currencyValue = round(currencyValue - (currencyWithoutFee * toCover));
            currencyBtcCost = currencyBtcCost + (total * toCover);
          } else {
            currencyValue = round(currencyValue - currencyWithoutFee);
            currencyBtcCost = currencyBtcCost + total;
          }

        } else if (trade.type === 'sell' && btc > 0) {
          var btcWithoutFee = total - round(total * fee);

          if (btcWithoutFee > btc) {
            var toCoverBtc = 1 - ((btcWithoutFee - btc) / btcWithoutFee);
            btc = round(btc - (btcWithoutFee * toCoverBtc));
            btcCurrencyCost = btcCurrencyCost + (amount * toCoverBtc);
          } else {
            btc = round(btc - btcWithoutFee);
            btcCurrencyCost = btcCurrencyCost + amount;
          }
        }

      });

      var wallet = {
        btc: parseFloat(balances.BTC || 0),
        btcCurrencyCost: btcCurrencyCost,
        currencyValue: parseFloat(balances[currency] || 0),
        currencyBtcCost: currencyBtcCost,
        openOrders: results[2]
      };

      walletCallback(err, wallet);
    }

  });

};


module.exports = {
  loadWallet: loadWallet
};
