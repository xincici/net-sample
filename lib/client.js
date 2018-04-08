var moment = require('moment');

var event = require('./event');

var getTime = () => moment().format('YYYY-MM-DD HH:mm:ss');

var constants = require('./constants');

var EVENT_CHANGE_NAME = constants.EVENT_CHANGE_NAME;
var EVENT_SEND_MSG = constants.EVENT_SEND_MSG;
var EVENT_CLIENT_LEAVE = constants.EVENT_CLIENT_LEAVE;
var RENAME_REG = constants.RENAME_REG;
var TIMEOUT = constants.TIMEOUT;

class Client {
  constructor(socket, name) {
    this.socket = socket;
    this.name = name;
    this.init();
  }
  init() {
    this.addListener();
    this.addTimer();
  }
  write(...args) {
    var rawWrite = this.socket.write;
    rawWrite.apply(this.socket, [getTime() + ' ' + args[0] + '\n', ...args.slice(1)]);
  }
  end(...args) {
    var rawEnd = this.socket.end;
    rawEnd.apply(this.socket, [getTime() + ' ' + args[0] + '\n', ...args.slice(1)]);
  }
  sayWelcome() {
    this.write('welcome, your initial name is: ' + this.name);
    this.write('you can use this command to rename yourself: rename john');
    this.write('you can use command quit or bye to leave the chat');
  }
  addListener() {
    this.socket.on('data', data => {
      this.clearTimer();
      this.addTimer();
      data = new Buffer(data).toString().trim();
      if (!data) return;
      console.log('receive from:[', this.name, '] msg:[', data, ']');
      if (data === 'quit' || data === 'bye') {
        return this.byeHandler();
      }
      if (RENAME_REG.test(data)) {
        return this.renameHandler(data);
      }
      this.chatHandler(data);
    });
    this.socket.on('close', () => {
      this.clearTimer();
      event.emit(EVENT_CLIENT_LEAVE, this);
    });
    this.socket.on('end', () => {
      if (this.socket.destroyed) return;
    });
  }
  byeHandler() {
    this.write('bye ' + this.name);
    this.socket.emit('end');
  }
  renameHandler(data) {
    var tmp = data.match(RENAME_REG)[1];
    tmp = tmp.trim();
    if (!tmp) {
      this.write('illegal command');
      return;
    }
    event.emit(EVENT_CHANGE_NAME, this, tmp);
    return;
  }
  chatHandler(data) {
    this.write('got msg: [ ' + data + ' ], thanks ' + this.name + '!');
    event.emit(EVENT_SEND_MSG, this, data);
  }
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
  }
  addTimer() {
    this.timer = setTimeout(() => {
      console.log(this.name, 'is not active for', TIMEOUT, 'seconds, disconnect');
      this.socket.emit('end');
    }, TIMEOUT * 1000);
  }
}

module.exports = Client;
