import { WebSocketServer } from "ws";

const webSocketServer = new WebSocketServer({
    port: 3000,
    perMessageDeflate: false,
})

webSocketServer.on('connection', (server: WebSocket) => {

});

webSocketServer.on('listening', () => {
    console.log('WebSocket works on port 3000');
});