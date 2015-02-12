var EventEmitter = require('events').EventEmitter;
var hg = require('mercury');
var configs = require('./configs');
var quickconnect = require('rtc-quickconnect');

module.exports = function(data, app) {
  var testState = hg.struct({
    index: hg.value(data.idx),
    status: hg.value('running'),
    title: hg.value(configs[data.idx].title),
  });

  var qc = quickconnect('https://switchboard.rtc.io', { room: data.room });
  var test = new EventEmitter();
  var testTimer;

  app.results.push(testState);

  qc.createDataChannel('test');
  qc.on('channel:opened:test', function() {
    testState.status.set('passed');
    clearTimeout(testTimer);
    test.emit('pass');
  });

  testTimer = setTimeout(function() {
    testState.status.set('timed-out');
    test.emit('timeout');
  }, 30000);

  return test;
};
