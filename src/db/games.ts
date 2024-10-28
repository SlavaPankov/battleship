import { IGame } from "../types/interfaces/game";

export let games: IGame[] = [];

export const removeGameById = (roomId: string) => {
    games = games.filter((room) => room.roomId !== roomId);
};

export const addTurnIndex = (indexPlayer: number, gameId: string): number => {
    const currentGame = games.find((game) => game.roomId === gameId);

    if (!currentGame) {
        return -1;
    }

    const currentPlayerIndex = currentGame.roomUsers.findIndex((user) => user.index === indexPlayer);
    let nextPlayerIndex = currentPlayerIndex + 1;

    if (nextPlayerIndex >= currentGame.roomUsers.length) {
        nextPlayerIndex = 0;
    }

    currentGame.roomUsers.forEach((user) => {
        user.turnIndex = currentGame.roomUsers[nextPlayerIndex].index;
    });

    return currentGame.roomUsers[nextPlayerIndex].index;
};