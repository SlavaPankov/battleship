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