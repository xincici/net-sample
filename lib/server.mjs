
import net from 'node:net';
import chalk from 'chalk';

import Client from './client.mjs';
import event from './event.mjs';

import {
  EVENT_CHANGE_NAME, EVENT_SEND_MSG, EVENT_CLIENT_LEAVE 
} from './constants.mjs';

const getName = (() => {
  var i = 0;
  return () => `Client_${++i}`;
})();

export default class Server {
  constructor(port, address, callback) {
    if (!port || !address) {
      throw new Error('Need port and address');
    }
    callback = callback ? callback : () => console.log('server has started on', chalk.green(`${address}:${port}`));
    this.port = port;
    this.address = address;
    this.callback = callback;
    this.clients = new Set([]);
    this.names = new Set([]);
    this.init();
  }
  init() {
    this.server = this.createServer();
    this.addListener();
  }
  addClient(client) {
    this.welcome(client);
    this.clients.add(client);
    this.names.add(client.name);
    return this;
  }
  deleteClient(client) {
    this.clients.delete(client);
    this.names.delete(client.name);
    this.broadcast(`${chalk.red(client.name)} has left the chat`);
    return this;
  }
  renameClient(client, newName) {
    client.write(`you have changed name to: ${chalk.red(newName)}`);
    this.broadcast(`${chalk.red(client.name)} has changed name to: ${chalk.red(newName)}`, client);
    this.names.delete(client.name);
    this.names.add(newName);
    client.name = newName;
    return this;
  }
  addListener() {
    event.addListener(EVENT_CHANGE_NAME, (client, name) => {
      if (client.name === name) {
        client.write(`you are already ${chalk.red(name)}`);
        return;
      }
      if (this.names.has(name)) {
        client.write(`${chalk.red(name)} has been used by others, please choose another one`);
        return;
      }
      this.renameClient(client, name);
    });
    event.addListener(EVENT_SEND_MSG, (client, msg) => {
      this.broadcast(`${chalk.red(client.name)}: ${chalk.green(msg)}`, client);
    });
    event.addListener(EVENT_CLIENT_LEAVE, client => {
      console.log(`${chalk.red(client.name)} leave the chat`);
      this.deleteClient(client);
    });
  }
  createServer() {
    return net.createServer(c => {
      var name = getName();
      var client = new Client(c, name);
      this.addClient(client);
      console.log(chalk.red(name), 'connect');
    });
  }
  broadcast(msg, except) {
    if (this.clients.size === 0) return;
    this.clients.forEach(c => {
      if (!except || except !== c) {
        c.write(msg);
      }
    });
  }
  welcome(client) {
    client.sayWelcome();
    if (this.clients.size === 0) {
      client.write('you are the only one in the chat now');
    } else {
      client.write(this.getWelcomeMsg());
    }
    this.broadcast(`${chalk.red(client.name)} has join the chat`);
  }
  getWelcomeMsg() {
    var arr = Array.from(this.names);
    var msg = '';
    if (arr.length <= 3) {
      msg += arr.join(' & ');
    } else {
      msg += arr.slice(0, 2).join(' & ') + ' and ' + (arr.length - 2) + ' more persons';
    }
    return `${chalk.red(msg)} ${arr.length === 1 ? 'is' : 'are'} already in the chat`;
  }
  start() {
    this.server.listen(this.port, this.address, this.callback);
  }
}

