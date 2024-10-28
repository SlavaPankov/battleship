import { addUserToRoom, createRoom } from "../controllers/room";
import { rooms } from "../db/rooms";
import { create } from "../controllers/player";
import { EWebSocketMessages } from "../types/enums/messages";
import { IPlayer } from "../types/interfaces/player";
import { WebSocketServer } from "ws";
import { assignShipsToPlayer, executePlayerAttack, randomizeAttack, getWinnersList, findGame } from "../controllers/game";

const webSocketServer = new WebSocketServer({
    port: 3000,
    perMessageDeflate: false,
});

const parseData = (data: string) => {
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

webSocketServer.on('connection', (server: WebSocket) => {
    let playerData: IPlayer | null = null;

    server.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        const parsedPlayerData = parseData(data);

        switch (type) {
            case EWebSocketMessages.REG:
                console.log(message);

                playerData = create(parsedPlayerData.name, parsedPlayerData.password, server);
                server.send(JSON.stringify({ type: EWebSocketMessages.REG, data: JSON.stringify(playerData), id: 0 }));
                server.send(JSON.stringify({ type: EWebSocketMessages.UPDATE_WINNERS, data: JSON.stringify(getWinnersList()), id: 0 }));
                server.send(JSON.stringify({ type: EWebSocketMessages.UPDATE_ROOM, data: JSON.stringify(rooms), id: 0 }));
                break;

            case EWebSocketMessages.CREATE_ROOM:
                console.log(message);

                createRoom(playerData);
                break;
            case EWebSocketMessages.ADD_USER_TO_ROOM:
                console.log(message);

                const { indexRoom } = parsedPlayerData;
                addUserToRoom(indexRoom, playerData.name);

                break;
            case EWebSocketMessages.ADD_SHIPS:
                console.log(message);
                const { ships } = parsedPlayerData;

                assignShipsToPlayer(playerData.name, ships);

                break;
            case EWebSocketMessages.ATTACK:
                console.log(message);

                const { gameId, indexPlayer } = parsedPlayerData;

                if (findGame(gameId, indexPlayer)) {
                    executePlayerAttack(playerData, parsedPlayerData);
                }

                break;
            case EWebSocketMessages.RANDOM_ATTACK:
                console.log(message);

                randomizeAttack(playerData, parsedPlayerData.gameId);

                break;
            default:
                break;
        }
    }

});

webSocketServer.on('listening', () => {
    console.log('WebSocket works on port 3000');
});