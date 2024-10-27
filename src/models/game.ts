import { EWebSocketMessages } from "src/types/enums/messages";
import { players } from "../db/players"
import { IWinner } from "../types/interfaces/winner"

export const showWinners = () => {
    const winners: IWinner[] = [];

    players.forEach((player) => {
        if (player.winner && player.winner > 0) {
            winners.push({ name: player.name, wins: player.winner })
        }
    });

    return winners;
}

export const createGame = (playerName: string, roomId: string) => {
    const player = players.get(playerName);

    if (player && player.ws) {
        const playerData = {
            idGame: roomId,
            idPlayer: player.index,
        };

        player.ws.send(JSON.stringify({ type: EWebSocketMessages.CREATE_ROOM, data: JSON.stringify(playerData), id: 0 }));
    }
};