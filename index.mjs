import Server from './lib/server.mjs';

var app = new Server(9999, '0');

app.start();
