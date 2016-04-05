var plnx = require('plnx');
var moment = require('moment');
var winston = require('winston');
var _ = require('lodash');
var async = require('async');
var config = require('./config/prod.json');


function round(value) {
  return Math.round(value * 10000000) / 10000000;
}

var loadWallet = function(walletCallback) {

  async.series([function(callback) {
    plnx.returnTradeHistory({
      key: config.key,
      secret: config.secret,
      currencyPair: 'BTC_ETH',
      start: moment().subtract(10, 'days').unix()
    }, callback);
  }, function(callback) {
    plnx.returnAvailableAccountBalances({
      key: config.key,
      secret: config.secret
    }, callback);
  }], function(err, results) {

    if (err) {
      walletCallback(err);
    } else {
      var trades = results[0];
      var balances = results[1].exchange;

      var eth = balances.ETH || 0;
      var ethBtcCost = 0;

      var btc = balances.BTC || 0;
      var btcEthCost = 0;

      _.each(trades, function(trade) {
        var amount = parseFloat(trade.amount);
        var total = parseFloat(trade.total);
        var fee = parseFloat(trade.fee);

        if (trade.type === 'buy' && eth > 0) {
          var ethWithoutFee = amount - round(amount * fee);

          if (ethWithoutFee > eth) {
            var toCover = 1 - ((ethWithoutFee - eth) / ethWithoutFee);
            eth = round(eth - (ethWithoutFee * toCover));
            ethBtcCost = ethBtcCost + (total * toCover);
          } else {
            eth = round(eth - ethWithoutFee);
            ethBtcCost = ethBtcCost + total;
          }

        } else if (trade.type === 'sell' && btc > 0) {
          var btcWithoutFee = total - round(total * fee);

          if (btcWithoutFee > btc) {
            var toCoverBtc = 1 - ((btcWithoutFee - btc) / btcWithoutFee);
            btc = round(btc - (btcWithoutFee * toCoverBtc));
            btcEthCost = btcEthCost + (amount * toCoverBtc);
          } else {
            btc = round(btc - btcWithoutFee);
            btcEthCost = btcEthCost + amount;
          }
        }

      });

      var wallet = {
        btc: parseFloat(balances.BTC || 0),
        btcEthCost: btcEthCost,
        eth: parseFloat(balances.ETH || 0),
        ethBtcCost: ethBtcCost
      };

      walletCallback(err, wallet);
    }

  });

};


module.exports = {
  loadWallet: loadWallet
};
