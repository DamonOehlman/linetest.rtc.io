var configs = module.exports = [];
var normalice = require('normalice');
var googleStun = [
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302'
];

// initial config - using the public google stun servers
configs.push({
  title: 'Connect using STUN',
  iceServers: googleStun.map(normalice)
});
