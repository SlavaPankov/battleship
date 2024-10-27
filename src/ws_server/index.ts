import { create } from "../models/player";
import { EWebSocketMessages } from "../types/enums/messages";
import { IPlayer } from "../types/interfaces/player";
import { WebSocketServer } from "ws";

const webSocketServer = new WebSocketServer({
    port: 3000,
    perMessageDeflate: false,
})

webSocketServer.on('connection', (server: WebSocket) => {
    let currentPlayer: IPlayer | null = null;

    server.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        const playerData = JSON.parse(data);

        switch (type) {
            case EWebSocketMessages.REG:
                console.log(message);

                currentPlayer = create(playerData.name, playerData.password, server);
                server.send(JSON.stringify({ type: EWebSocketMessages.REG, data: JSON.stringify(currentPlayer), id: 0 }));
                break;
            default:
                break;
        }
    }

});

webSocketServer.on('listening', () => {
    console.log('WebSocket works on port 3000');
});