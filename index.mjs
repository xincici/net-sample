import Server from './lib/server.mjs';

var app = new Server(9999, '127.0.0.1');

app.start();
