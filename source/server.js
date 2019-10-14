"use strict";
exports.__esModule = true;
var Path = require("path");
var Cors = require('cors');
var Nconf = require("nconf");
var Express = require("express");
// Load Configuration
Nconf.file(Path.join(__dirname, "../config.json"));
var portConfig = Nconf.get("port");
// Serve static files
var app = Express();
app.use(Cors());
app.use(Express.static(Path.join(__dirname, "./"), { index: false, extensions: ['js'] }));
// Start Serving Requests
// TODO: Create config & set port in config
var server = app.listen(portConfig, function () {
    var info = server.address();
    console.log("Server has started on port %s!", info.port);
});
