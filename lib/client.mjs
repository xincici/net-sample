import moment from 'moment';
import chalk from 'chalk';

import event from './event.mjs';
import { getLogger } from './logger.mjs';
import {
  EVENT_CHANGE_NAME,
  EVENT_SEND_MSG,
  EVENT_CLIENT_LEAVE,
  RENAME_REG,
  TIMEOUT,
} from './constants.mjs';

const logger = getLogger('client');
const getTime = () => moment().format('YYYY-MM-DD HH:mm:ss');

export default class Client {
  constructor(socket, name) {
    this.socket = socket;
    this.name = name;
    this.init();
  }
  init() {
    // 显式指定编码为 utf8，避免读取/写入时编码不一致导致中文乱码
    this.socket.setEncoding('utf8');
    this.socket.setDefaultEncoding('utf8');
    this.addListener();
    this.addTimer();
  }
  write(...args) {
    var rawWrite = this.socket.write;
    rawWrite.apply(this.socket, [chalk.bold(getTime()) + ' ' + args[0] + '\n', ...args.slice(1), 'utf8']);
  }
  end(...args) {
    var rawEnd = this.socket.end;
    rawEnd.apply(this.socket, [chalk.bold(getTime()) + ' ' + args[0] + '\n', ...args.slice(1), 'utf8']);
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
      // socket 已通过 setEncoding('utf8') 设置编码，data 此处已是字符串，无需再用 Buffer 转换
      data = data.toString().trim();
      if (!data) return;
      logger.info('receive from:', chalk.red(this.name), 'msg:', chalk.green(data));
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
    // 客户端异常断开（如 ECONNRESET/EPIPE）时仅记录日志，避免抛出未捕获异常导致整个服务进程崩溃
    this.socket.on('error', err => {
      logger.error(chalk.red(this.name), 'socket error:', err.message);
    });
  }
  byeHandler() {
    this.write('bye ' + chalk.red(this.name));
    this.socket.end();
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
      logger.info(chalk.red(this.name), 'is not active for', chalk.yellow(TIMEOUT), 'seconds, disconnect');
      this.socket.end();
    }, TIMEOUT * 1000);
  }
}

