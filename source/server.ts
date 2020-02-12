/* eslint-disable @typescript-eslint/no-var-requires */
const Path = require("path")
const Cors = require("cors")
const Express = require("express")
import { AddressInfo } from "net"

// Load Configuration
// Nconf.file(Path.join(__dirname, "../config.json"))
const portConfig = 3000

// Serve static files
const app = Express()
app.use(Cors())
app.use(Express.static(Path.join(__dirname, "./"), { index: false, extensions: ["js"] }))

// Start Serving Requests
const server = app.listen(portConfig, () => {
    const info = server.address() as AddressInfo
    console.log("Server has started on port %s!", info.port)
})
