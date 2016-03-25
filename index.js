var _ = require('lodash');
var elasticsearch = require('elasticsearch');
var moment = require('moment');

var client = new elasticsearch.Client({
  host: 'elasticsearch.weave.local:9200',
  log: 'info'
});

var paper = {
  eth: 100,
  btc: 0
};

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

    var lastAvgPrice;

    _.each(buckets, function(agg) {

      if (agg.short_moving_avg) {

        variation = (agg.short_moving_avg.value - agg.long_moving_avg.value) / agg.long_moving_avg.value;

        //long
        if (agg.short_moving_avg.value > agg.long_moving_avg.value) {

          if (lastDirection === 'long' && variation > lastVariation) {
            count++;
          } else if (lastDirection !== 'long') {
            lastDirection = 'long';
            count = 1;
          }

        } else if (agg.short_moving_avg.value < agg.long_moving_avg.value) {

          if (lastDirection === 'short' && variation < lastVariation) {
            count++;
          } else if (lastDirection !== 'short') {
            lastDirection = 'short';
            count = 1;
          }
        }

        lastVariation = variation;
      }

      if (agg.avg_sell_price) {
        lastAvgPrice = agg.avg_sell_price.value;
      }

    });


    console.log('Direction : ' + lastDirection + ' Count ' + count);
    if (count > 3 && lastDirection !== lastAdvice) {

      if (lastAdvice) {

        var mapping = {
          'short': 'sell',
          'long': 'buy'
        };

        var advice = mapping[lastDirection];

        console.log(moment().format() + ' - Do it now!! -> ' + advice);

        client.create({
          index: 'poloniex_btc_eth-' + moment().format('YYYY.MM.DD'),
          type: 'advice',
          body: {
            '@timestamp': new Date(),
            tags: ['advice'],
            title: advice
          }
        }, function(error, response) {});

        //simulate trading
        if (advice === 'buy' && paper.btc > 0) {
          paper.eth = paper.btc / lastAvgPrice;
          paper.btc = 0;
        } else if (advice === 'sell' && paper.eth > 0) {
          paper.btc = paper.eth * lastAvgPrice;
          paper.eth = 0;
        }

        console.log("Simulate account BTC : " + paper.btc + " ETH : " + paper.eth);

      }

      lastAdvice = lastDirection;

    }

  });
}, 10000);
