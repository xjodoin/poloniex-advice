var autobahn = require('autobahn');
var _ = require('lodash');
var winston = require('winston');
var adviceEventEmiter = require('../adviceEventEmiter');
var config = require('../config/prod.json');

var currency = config.currency;


var track = function() {
  var wsuri = "wss://api.poloniex.com";
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "realm1"
  });

  connection.onopen = function(session) {
    function marketEvent(args, kwargs) {
      _.each(args, function(element) {
        var data = element.data;
        if (element.type === 'newTrade') {
          // { amount: '1.00000000',
          //   date: '2016-03-18 20:54:01',
          //   rate: '0.02490201',
          //   total: '0.02490201',
          //   tradeID: '5074296',
          //   type: 'sell' } }
          adviceEventEmiter.emit('poloniexSell', data);
        }
      });
    }

    session.subscribe(currency, marketEvent);
  };

  connection.onclose = function() {
    winston.info("Websocket connection closed");
  };

  connection.open();
};


module.exports = {
  init: function() {
    track();
  }
};
