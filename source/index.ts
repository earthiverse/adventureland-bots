import SocketIO from "socket.io-client"
import { WelcomeData, LoadedData } from "./definitions/adventureland-server"

// ws://35.187.255.184:2053/socket.io/?EIO=3&transport=websocket

const localStorage = { debug: '*' }

let fun = SocketIO("ws://35.187.255.184:2053", {
    autoConnect: false,
    transports: ["websocket"]
})

fun.on("connect", (data) => {
    console.log("CONNECT! ----------")
    console.log(data)
    console.log("-------------------")
})

fun.on("welcome", (data: WelcomeData) => {
    console.log("WELCOME! ----------")
    console.log(data)
    console.log("-------------------")
    
    fun.emit("loaded", {
        height: 1080,
        width: 1920,
        scale: 2,
        success: 1
    } as LoadedData)
})


console.log("Opening socket...")
fun.open()

setTimeout(() => {
    console.log("Closing socket...")
    fun.close()
}, 10000);