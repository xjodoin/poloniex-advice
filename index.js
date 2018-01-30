var _ = require('lodash');

var config = require('config');
var adviceEventEmiter = require('./adviceEventEmiter');

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'timestamp':true});

var plugins = config.get('plugins');

_.each(plugins, function(plugin) {
  winston.info('Load plugin ' + plugin);
  require('./plugins/' + plugin).init();
});


var method = require('./methods/firstOne');
method.start();
