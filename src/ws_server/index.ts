import { addUserToRoom, createRoom } from "../controllers/room";
import { rooms } from "../db/rooms";
import { create } from "../controllers/player";
import { EWebSocketMessages } from "../types/enums/messages";
import { IPlayer } from "../types/interfaces/player";
import { WebSocketServer } from "ws";
import { assignShipsToPlayer, executePlayerAttack, randomizeAttack, getWinnersList, findGame, declareGameWinner } from "../controllers/game";
import { generateRandomShips, isBotInGame } from '../controllers/bot';
import { randomBytes } from "crypto";
import { games } from "src/db/games";

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
    let botPlayer: IPlayer | null = null;

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

                if (botPlayer && botPlayer.name !== playerData?.name && isBotInGame(gameId, botPlayer.name)) {
                    setTimeout(() => {
                        if (findGame(gameId, botPlayer.index)) {
                            randomizeAttack(botPlayer, parsedPlayerData.gameId);
                        }
                    }, 1500);
                }

                break;
            case EWebSocketMessages.RANDOM_ATTACK:
                console.log(message);

                randomizeAttack(playerData, parsedPlayerData.gameId);

                if (botPlayer && botPlayer.name !== playerData?.name && isBotInGame(parsedPlayerData.gameId, botPlayer.name)) {
                    setTimeout(() => {
                        randomizeAttack(botPlayer, parsedPlayerData.gameId);
                    }, 1000);
                }

                break;
            case EWebSocketMessages.SINGLE_PLAY:
                console.log(message);

                botPlayer = create(`BOT_${randomBytes(12).toString("hex")}`, `BOT_${randomBytes(12).toString("hex")}`, server, true);
                const { roomId } = createRoom(botPlayer);

                addUserToRoom(roomId, playerData.name);
                assignShipsToPlayer(botPlayer.name, generateRandomShips());

                break;
            default:
                break;
        }
    }

    server.onclose = () => {
        try {
            if (!playerData || typeof playerData.name !== "string") {
                console.log("WebSocket closed, but no current user or name is invalid.");
                return;
            }

            rooms.forEach((room) => {
                if (room.roomUsers.some((user) => user?.name === playerData?.name)) {
                    room.roomUsers = room.roomUsers.filter((user) => user.name !== playerData.name);
                    console.log("User removed from room.");
                }
            });

            games.forEach((game) => {
                if (game.roomUsers.some((user) => user?.name === playerData?.name)) {
                    game.roomUsers = game.roomUsers.filter((user) => user.name !== playerData.name);
                    console.log("User removed from game.");
                    
                    if (game.roomUsers.length === 1) {
                        const remainingPlayerIndex = game.roomUsers[0].index;
                        
                        declareGameWinner(game.roomId, remainingPlayerIndex);
                    }
                }
            });
            console.log("Good bye!");
        } catch (error) {
            console.log("Something in the way");
        }
    }
});


webSocketServer.on('listening', () => {
    console.log('WebSocket works on port 3000');
});