import { IGame } from "../types/interfaces/game";

export const games: IGame[] = [];

export const addTurnIndex = (indexPlayer: number, gameId: string): number => {
    const game = games.find((game) => game.roomId === gameId);
    if (!game) {
        console.log(`Game not found: ${gameId}`);
        return -1;
    }

    const currentPlayerIndex = game.roomUsers.findIndex((user) => user.index === indexPlayer);
    let nextPlayerIndex = currentPlayerIndex + 1;

    if (nextPlayerIndex >= game.roomUsers.length) {
        nextPlayerIndex = 0;
    }

    game.roomUsers.forEach((user) => {
        user.turnIndex = game.roomUsers[nextPlayerIndex].index;
    });

    return game.roomUsers[nextPlayerIndex].index;
};