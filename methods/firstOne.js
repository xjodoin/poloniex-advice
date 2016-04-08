var _ = require('lodash');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var config = require('../config/prod.json');
var adviceEventEmiter = require('../adviceEventEmiter');

var currency = 'BTC_' + config.currency;

var interval = config.interval;

var client = new elasticsearch.Client({
  host: config.elasticsearch,
  log: 'info'
});

var lastAdvice;

var start = function() {
  setInterval(function() {
    client.search({
      index: 'poloniex-' + moment().format('YYYY.MM.DD'),
      type: 'sell',
      q: 'currency:' + currency,
      body: {
        "query": {
          "range": {
            "@timestamp": {
              "gte": "now-30m",
              "lte": "now"
            }
          }
        },
        "size": 0,
        "aggs": {
          "sell": {
            "date_histogram": {
              "field": "@timestamp",
              "interval": interval
            },
            "aggs": {
              "avg_sell_price": {
                "avg": {
                  "field": "rate"
                }
              },
              "short_moving_avg": {
                "moving_avg": {
                  "buckets_path": "avg_sell_price",
                  "window": 5,
                  "model": "simple"
                }
              },
              "long_moving_avg": {
                "moving_avg": {
                  "buckets_path": "avg_sell_price",
                  "window": 15,
                  "model": "simple"
                }
              }
            }
          }
        }
      }
    }, function(error, response) {

      if (error) {
        console.log(error);
        return;
      }

      var buckets = response.aggregations.sell.buckets;

      var lastDirection;
      var count;

      var lastVariation = 0;
      var variation;

      var firstDirectionPrice;

      var lastAvgPrice;
      var lastShortMovingAvg;

      _.each(buckets, function(agg) {

        if (agg.short_moving_avg) {
          lastShortMovingAvg = agg.short_moving_avg.value;
          variation = (agg.short_moving_avg.value - agg.long_moving_avg.value) / agg.long_moving_avg.value;

          //long
          if (agg.short_moving_avg.value > agg.long_moving_avg.value) {

            if (lastDirection === 'long' && variation > lastVariation && (agg.short_moving_avg.value - firstDirectionPrice) / firstDirectionPrice > 0.001) {
              count++;
            } else if (lastDirection !== 'long') {
              lastDirection = 'long';
              count = 1;
              firstDirectionPrice = agg.short_moving_avg.value;
            }

          } else if (agg.short_moving_avg.value < agg.long_moving_avg.value) {

            if (lastDirection === 'short' && variation < lastVariation && (firstDirectionPrice - agg.short_moving_avg.value) / firstDirectionPrice > 0.001) {
              count++;
            } else if (lastDirection !== 'short') {
              lastDirection = 'short';
              count = 1;
              firstDirectionPrice = agg.short_moving_avg.value;
            }
          }

          lastVariation = variation;
        }

        if (agg.avg_sell_price) {
          lastAvgPrice = agg.avg_sell_price.value;
        }

      });


      //protect again fast movement
      if (lastDirection == 'long' && lastAvgPrice < lastShortMovingAvg) {
        return;
      } else if (lastDirection == 'short' && lastAvgPrice > lastShortMovingAvg) {
        return;
      }

      if (((count > 1 && lastDirection === 'long') || (count > 1 && lastDirection === 'short')) && lastDirection !== lastAdvice) {

        if (lastAdvice) {

          var mapping = {
            'short': 'sell',
            'long': 'buy'
          };

          var advice = mapping[lastDirection];

          adviceEventEmiter.emit('advice', {
            type: advice,
            lastAvgPrice: lastAvgPrice
          });

        }

        lastAdvice = lastDirection;

      }

    });
  }, 10000);
};


module.exports = {
  start: start
};
