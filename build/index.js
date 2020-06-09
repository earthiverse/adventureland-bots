import SocketIO from "socket.io-client";
const localStorage = { debug: '*' };
let fun = SocketIO("ws://35.187.255.184:2053", {
    autoConnect: false,
    transports: ["websocket"]
});
fun.on("connect", (data) => {
    console.log("CONNECT! ----------");
    console.log(data);
    console.log("-------------------");
});
fun.on("welcome", (data) => {
    console.log("WELCOME! ----------");
    console.log(data);
    console.log("-------------------");
});
console.log("Opening socket...");
fun.open();
setTimeout(() => {
    console.log("Closing socket...");
    fun.close();
}, 10000);
