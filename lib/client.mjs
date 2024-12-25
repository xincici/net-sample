import moment from 'moment';
import chalk from 'chalk';

import event from './event.mjs';
import {
  EVENT_CHANGE_NAME,
  EVENT_SEND_MSG,
  EVENT_CLIENT_LEAVE,
  RENAME_REG,
  TIMEOUT,
} from './constants.mjs';

const getTime = () => moment().format('YYYY-MM-DD HH:mm:ss');

export default class Client {
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
    rawWrite.apply(this.socket, [chalk.bold(getTime()) + ' ' + args[0] + '\n', ...args.slice(1)]);
  }
  end(...args) {
    var rawEnd = this.socket.end;
    rawEnd.apply(this.socket, [chalk.bold(getTime()) + ' ' + args[0] + '\n', ...args.slice(1)]);
  }
  sayWelcome() {
    this.write('welcome, your initial name is: ' + chalk.red(this.name));
    this.write('use this command to rename yourself ' + chalk.yellow('rename john'));
    this.write('use command ' + chalk.yellow('quit') + ' or ' + chalk.yellow('bye') + ' to leave the chat');
  }
  addListener() {
    this.socket.on('data', data => {
      this.clearTimer();
      this.addTimer();
      data = Buffer.from(data).toString().trim();
      if (!data) return;
      console.log('receive from:', chalk.red(this.name), 'msg:', chalk.green(data));
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
    this.write('bye ' + chalk.red(this.name));
    this.socket.emit('end');
  }
  renameHandler(data) {
    var tmp = data.match(RENAME_REG)[1];
    tmp = tmp.trim();
    if (!tmp) {
      this.write(chalk.red('illegal command'));
      return;
    }
    event.emit(EVENT_CHANGE_NAME, this, tmp);
    return;
  }
  chatHandler(data) {
    this.write('got your msg:' + chalk.green(data) + ', ' + chalk.red(this.name));
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
      console.log(chalk.red(this.name), 'is not active for', chalk.yellow(TIMEOUT), 'seconds, disconnect');
      this.socket.emit('end');
    }, TIMEOUT * 1000);
  }
}

