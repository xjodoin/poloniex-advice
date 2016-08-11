var plnx = require('plnx');
var _ = require('lodash');
var async = require('async');
var winston = require('winston');
var config = require('../config/prod.json');
var adviceEventEmiter = require('../adviceEventEmiter');

var currency = config.currency;
var currencyPair = 'BTC_' + currency;

var walletService = require('../wallet');
var previousAdvice;
var fee = config.fee;
var lastSell = {};

var startTrading = function() {

    adviceEventEmiter.on('poloniexSell', function(sell) {
        lastSell = sell;
    });

    adviceEventEmiter.on('advice', function(advice) {
        winston.info('New advice ' + JSON.stringify(advice));
        winston.info('Last sell ' + JSON.stringify(lastSell));

        var lastSellRate = parseFloat(lastSell.rate);
        advice.lastSellRate = lastSellRate;

        var transactionConfig = {
            key: config.key,
            secret: config.secret,
            currencyPair: currencyPair,
            rate: lastSellRate
        };

        walletService.loadWallet(function(err, wallet) {

            if (err) {
                winston.error(err);
                return;
            }

            winston.info('Current wallet : ' + JSON.stringify(wallet));

            var toExecuteCalls = [];

            _.each(wallet.openOrders, function(order) {
                toExecuteCalls.push(function(callback) {
                    winston.info('Cancel order : ' + JSON.stringify(order));
                    plnx.cancelOrder({
                        key: config.key,
                        secret: config.secret,
                        orderNumber: order.orderNumber
                    }, callback);
                });
            });

            var diff = 0;

            if (previousAdvice) {
                if (advice.type === 'buy') {
                    diff = (previousAdvice.lastSellRate - lastSellRate) / lastSellRate;
                } else if (advice.type === 'sell') {
                    diff = (lastSellRate - previousAdvice.lastSellRate) / previousAdvice.lastSellRate;
                }
                winston.info('diff between advice ' + (diff * 100) + '%');
            }

            previousAdvice = advice;

            if (advice.type === 'sell' && wallet.currencyValue > 0.0001) {
                var totalBtc = (wallet.currencyValue * lastSellRate) * (1 - fee);
                winston.info('Total btc without fee ' + totalBtc);
                var profitBtc = (totalBtc - wallet.currencyBtcCost) / wallet.currencyBtcCost;
                winston.info('Profit ' + (profitBtc * 100) + '%');

                if (profitBtc < 0) {
                    var newRate = (wallet.currencyBtcCost / wallet.currencyValue) * (1 + fee);
                    winston.info('Change rate to match minimum : ' + newRate);
                    transactionConfig.rate = newRate;
                }

                transactionConfig.amount = wallet.currencyValue;
                toExecuteCalls.unshift(function(callback) {
                    winston.info('Sell order : ' + JSON.stringify(_.omit(transactionConfig, ['key', 'secret'])));
                    plnx.sell(transactionConfig, callback);
                });

            } else if (advice.type === 'buy' && wallet.btc > 0.0001) {
                var totalCurrency = (wallet.btc / lastSellRate) * (1 - fee);
                winston.info('Total ' + currency + ' without fee ' + totalCurrency);
                var profitCurrency = (totalCurrency - wallet.btcCurrencyCost) / wallet.btcCurrencyCost;
                winston.info('Profit ' + (profitCurrency * 100) + '%');

                if (profitCurrency < 0) {
                  var newRate = (wallet.btc / wallet.btcCurrencyCost) * (1 + fee);
                  winston.info('Change rate to match minimum : ' + newRate);
                  transactionConfig.rate = newRate;
                }
                
                transactionConfig.amount = wallet.btc / lastSellRate;
                toExecuteCalls.unshift(function(callback) {
                    winston.info('Buy order : ' + JSON.stringify(_.omit(transactionConfig, ['key', 'secret'])));
                    plnx.buy(transactionConfig, callback);
                });

            }

            async.series(toExecuteCalls, function(err, results) {
                if (err) {
                    winston.error(err);
                } else {
                    winston.info(results);
                }
            });

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
