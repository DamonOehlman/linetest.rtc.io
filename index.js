var cuid = require('cuid');
var quickconnect = require('rtc-quickconnect');
var messenger = require('rtc-switchboard-messenger');
var signaller = require('rtc-signaller')(messenger('https://switchboard.rtc.io/'));
var room = location.hash.slice(1);

// create a run configuration
var configs = require('./configs');
var createTest = require('./createtest');

var hg = require('mercury');
var h = hg.h;

var app = hg.state({
  room: hg.value(room || cuid()),
  coordinator: hg.value(!room),
  results: hg.array([]),
  status: hg.value('disconnected'),

  channels: {
    room: updateRoom
  }
});

var coordinator = (! room);

function handleNewPeer(data) {
  if (coordinator) {
    console.log('new peer discovered: ', data.id);

    // start the tests with the new peer
    runTests(data.id);
  }

  app.status.set('ready');
}

function join() {
  signaller.announce({ room: app.room() });
}

function generateRoomUrl(state) {
  return document.location.href.split('#')[0] + '#' + state.room;
}

function render(state) {
  var childnodes = [];
  var testUrl = generateRoomUrl(state);
  var connected = state.status != 'disconnected';

  if (coordinator) {
    childnodes = childnodes.concat([
      h('div.room', [
        h('label', { for: 'room' }, 'Room: '),
        h('input', {
          type: 'text',
          name: 'room',
          value: state.room,
          disabled: connected,
          'ev-event': hg.sendChange(state.channels.room)
        }),
        h('button', { onclick: join, disabled: connected }, 'Create Room')
      ])
    ]);
  }

  childnodes = childnodes.concat([
    h('div.box.testurl', [
      h('a', { href: testUrl }, testUrl)
    ]),
    h('div.box.status.' + state.status.replace(/\s/g, ''), state.status)
  ]);

  childnodes = childnodes.concat(state.results.map(function(result) {
    return h('div.box.test.' + result.status, [
      h('span', result.title)
    ]);
  }));

  return h('div', childnodes);
}

function runTests(targetId, idx) {
  var testdata = {
    idx: idx || 0,
    room: cuid()
  };

  function startTest() {
    var test = createTest(testdata, app);

    test.on('timeout', function() {
      signaller.to(targetId).send('/failtest', testdata);
      if (testdata.idx + 1 < configs.length) {
        runTests(targetId, testdata.idx + 1);
      }
    });
  }

  signaller.to(targetId).send('/runtest', testdata);
  signaller.once('message:roomready-' + testdata.room, startTest);
}

function updateRoom(state, data) {
  state.room.set(data.room.replace(/\s/g, ''));
}

signaller
.on('local:announce', function() {
  app.status.set('waiting');
})
.on('peer:announce', handleNewPeer);

if (! coordinator) {
  signaller.on('message:runtest', function(data, sender) {
    createTest(data, app);
    signaller.to(sender.id).send('/roomready-' + data.room);
  });

  join();
}

hg.app(document.getElementById('main'), app, render);
