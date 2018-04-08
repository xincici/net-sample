var net = require('net');

var event = require('./event');

var Client = require('./client');
var constants = require('./constants');

var EVENT_CHANGE_NAME = constants.EVENT_CHANGE_NAME;
var EVENT_SEND_MSG = constants.EVENT_SEND_MSG;
var EVENT_CLIENT_LEAVE = constants.EVENT_CLIENT_LEAVE;

var getName = (() => {
  var i = 0;
  return () => `client-${++i}`;
})()

class Server {
  constructor(port, address, callback) {
    if (!port || !address) {
      throw new Error('Need port and address');
    }
    callback = callback ? callback : () => console.log(`server has started on ${address}:${port}`);
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
    this.broadcast(`${client.name} has left the chat`);
    return this;
  }
  renameClient(client, newName) {
    client.write(`you have changed name to: ${newName}`);
    this.broadcast(`${client.name} has changed name to: ${newName}`, client);
    this.names.delete(client.name);
    this.names.add(newName);
    client.name = newName;
    return this;
  }
  addListener() {
    event.addListener(EVENT_CHANGE_NAME, (client, name) => {
      if (client.name === name) {
        client.write(`you are already ${name}`);
        return;
      }
      if (this.names.has(name)) {
        client.write(`${name} has been used by others, please choose another one`);
        return;
      }
      this.renameClient(client, name);
    });
    event.addListener(EVENT_SEND_MSG, (client, msg) => {
      this.broadcast(`${client.name} says: ${msg}`, client);
    });
    event.addListener(EVENT_CLIENT_LEAVE, client => {
      this.deleteClient(client);
    });
  }
  createServer() {
    return net.createServer(c => {
      var name = getName();
      var client = new Client(c, name);
      this.addClient(client);
      console.log(`${name} connect`);
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
    this.broadcast(`${client.name} has join the chat`);
  }
  getWelcomeMsg() {
    var arr = Array.from(this.names);
    var msg = '';
    if (arr.length <= 3) {
      msg += arr.join(' & ');
    } else {
      msg += arr.slice(0, 2).join(' & ') + ' and ' + (arr.length - 2) + ' more persons'
    }
    return `${msg} ${arr.length === 1 ? 'is' : 'are'} already in the chat`;
  }
  start() {
    this.server.listen(this.port, this.address, this.callback);
  }
}

module.exports = Server;
