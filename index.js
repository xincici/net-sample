var Server = require('./lib/server');

var app = new Server(9999, '127.0.0.1');

app.start();
