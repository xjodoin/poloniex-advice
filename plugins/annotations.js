var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');

var elasticsearch = require('elasticsearch');
var moment = require('moment');
var config = require('../config/prod.json');

var currency = 'BTC_' + config.currency;

var client = new elasticsearch.Client({
  host: config.elasticsearch,
  log: 'info'
});


var start = function() {

  adviceEventEmiter.on('advice', function(advice) {
    client.create({
      index: 'poloniex-' + moment().format('YYYY.MM.DD'),
      type: 'advice',
      body: {
        '@timestamp': new Date(),
        tags: ['advice', currency],
        title: advice.type,
        desc: 'Last avg price ' + advice.lastAvgPrice
      }
    }, function(error, response) {});

  });

};


module.exports = {
  init: start
};
