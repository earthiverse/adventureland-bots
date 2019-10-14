let Path = require("path");
var Cors = require('cors');
let Nconf = require("nconf");
let Express = require("express");
import { AddressInfo } from "net";

// Load Configuration
Nconf.file(Path.join(__dirname, "../config.json"));
const portConfig: number = Nconf.get("port");

// Serve static files
const app = Express();
app.use(Cors())
app.use(Express.static(Path.join(__dirname, "./"), { index: false, extensions: ['js'] }));

// Start Serving Requests
// TODO: Create config & set port in config
const server = app.listen(portConfig, () => {
    const info = server.address() as AddressInfo;
    console.log("Server has started on port %s!", info.port);
});
