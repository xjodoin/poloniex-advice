var _ = require('lodash');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var adviceEventEmiter = require('./adviceEventEmiter');
var trader = require('./trader')();

var client = new elasticsearch.Client({
  host: 'https://kopf.jodoin.me/es',
  log: 'info'
});

var lastAdvice;

setInterval(function() {
  client.search({
    index: 'poloniex_btc_eth-' + moment().format('YYYY.MM.DD'),
    type: 'sell',
    body: {
      "query": {
        "range": {
          "@timestamp": {
            "gte": "now-60m",
            "lte": "now"
          }
        }
      },
      "size": 0,
      "aggs": {
        "sell": {
          "date_histogram": {
            "field": "@timestamp",
            "interval": "10s"
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

    _.each(buckets, function(agg) {

      if (agg.short_moving_avg) {

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


    // console.log('Direction : ' + lastDirection + ' Count ' + count);

    if (((count > 3 && lastDirection === 'long') || (count > 1 && lastDirection === 'short')) && lastDirection !== lastAdvice) {

      if (lastAdvice) {

        var mapping = {
          'short': 'sell',
          'long': 'buy'
        };

        var advice = mapping[lastDirection];

        // console.log(moment().format() + ' - Do it now!! -> ' + advice);

        adviceEventEmiter.emit('advice', {
          type: advice,
          lastAvgPrice: lastAvgPrice
        });

        client.create({
          index: 'poloniex_btc_eth-' + moment().format('YYYY.MM.DD'),
          type: 'advice',
          body: {
            '@timestamp': new Date(),
            tags: ['advice'],
            title: advice
          }
        }, function(error, response) {});

      }

      lastAdvice = lastDirection;

    }

  });
}, 10000);
