var plnx = require('plnx');
var _ = require('lodash');
var config = require('./config/prod.json');
var adviceEventEmiter = require('./adviceEventEmiter');

var fee = 0.0025;
var lastBuyPrice = config.lastBuyPrice;

var startTrading = function() {

  adviceEventEmiter.on('advice', function(advice) {
    console.log('New advice ' + JSON.stringify(advice));
    var lastAvgPrice = advice.lastAvgPrice;

    if (lastBuyPrice) {
      var profit;
      if (advice.type === 'buy') {
        profit = (lastBuyPrice - lastAvgPrice) / lastAvgPrice;
      } else if (advice.type === 'sell') {
        profit = (lastAvgPrice - lastBuyPrice) / lastBuyPrice;
      }

      console.log('Profit : ' + profit * 100 + ' %');
      if (profit < fee) {
        console.log('Not enought profit to cover fee ' + fee + ' !!');
        return;
      }
    }

    //TODO should cancel existing sell order
    lastBuyPrice = lastAvgPrice;

    plnx.returnAvailableAccountBalances(config, function(err, data) {
      var wallet = data.exchange;
      console.log('Current trading wallet : ' + JSON.stringify(wallet));

      var transactionConfig = _.clone(config);
      transactionConfig.currencyPair = 'BTC_ETH';
      transactionConfig.rate = lastAvgPrice;
      transactionConfig.fillOrKill = false;
      transactionConfig.immediateOrCancel = false;

      // buy: { currencyPair, rate, amount, fillOrKill?, immediateOrCancel? }
      if (advice.type === 'buy' && wallet.BTC > 0) {
        transactionConfig.amount = wallet.BTC;
        console.log('Buy order : ' + JSON.stringify(transactionConfig));
        plnx.buy(transactionConfig, function(err, data) {
          console.log(err, data);
        });
      } else if (advice.type === 'sell' && wallet.ETH > 0) {
        transactionConfig.amount = wallet.ETH;
        console.log('Sell order : ' + JSON.stringify(transactionConfig));
        plnx.sell(transactionConfig, function(err, data) {
          console.log(err, data);
        });
      }

    });



  });
};


module.exports = function() {
  // private without options
  plnx.returnAvailableAccountBalances(config, function(err, data) {
    console.log('Start trading wallet : ' + JSON.stringify(data));
    startTrading();
  });

};
