var _ = require('lodash');
var elasticsearch = require('elasticsearch');
var moment = require('moment');

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
            "interval": "30s"
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

    var advice;

    _.each(buckets, function(agg) {

      if (agg.short_moving_avg) {
        //long
        if (agg.short_moving_avg.value > agg.long_moving_avg.value) {
          if (lastDirection === 'long') {
            count++;
          } else {
            if (lastDirection === 'short' && count > 3) {
              advice = 'buy';
            }
            lastDirection = 'long';
            count = 1;
          }
        } else if (agg.short_moving_avg.value < agg.long_moving_avg.value) {
          if (lastDirection === 'short') {
            count++;
          } else {
            if (lastDirection === 'long' && count > 3) {
              advice = 'sell';
            }
            lastDirection = 'short';
            count = 1;
          }
        }
      }


    });

    console.log('Direction : ' + lastDirection + ' Count ' + count + ' Advice ' + advice);
    if (count > 3 && advice !== lastAdvice) {
      lastAdvice = advice;
      console.log('Do it now!! -> ' + advice);
    }

  });
}, 30000);
