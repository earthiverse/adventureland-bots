const Path = require("path");
const Cors = require("cors");
const Express = require("express");
const portConfig = 3000;
const app = Express();
app.use(Cors());
app.use(Express.static(Path.join(__dirname, "./"), { index: false, extensions: ["js"] }));
const server = app.listen(portConfig, () => {
    const info = server.address();
    console.log("Server has started on port %s!", info.port);
});
export {};
