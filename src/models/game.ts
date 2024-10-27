import { EWebSocketMessages } from "src/types/enums/messages";
import { players } from "../db/players"
import { IWinner } from "../types/interfaces/winner"
import { IShip } from "../types/interfaces/ship";
import { addTurnIndex, games, removeGame } from "../db/games";
import { IField } from "../types/interfaces/Field";
import { IPlayer } from "../types/interfaces/player";
import { IAttack } from "../types/interfaces/attack";
import { rooms } from "src/db/rooms";

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

        player.ws.send(JSON.stringify({ type: EWebSocketMessages.CREATE_GAME, data: JSON.stringify(playerData), id: 0 }));
    }
};

function addSurroundingCells(x: number, y: number, descriptor: IField, fieldLength: number): void {
    const directions = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
    ];

    directions.forEach(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;

        if (newX >= 0 && newY >= 0 && newX < fieldLength && newY < fieldLength) {
            descriptor.overCells.push([newX, newY]);
        }
    });
}

export function initializeBattlefield(ships: IShip[]): IField[][] {
    const fieldLength = 10;
    const field: IField[][] = Array.from({ length: fieldLength }, () =>
        Array.from({ length: fieldLength }, () => ({ empty: true, isAttacked: false })),
    );

    ships.forEach((ship) => {
        const shipDescriptor: IField = {
            empty: false,
            leftSide: ship.length,
            pastTheCells: [],
            shipTheCells: [],
            overCells: [],
            isAttacked: false,
        };

        for (let i = 0; i < ship.length; i++) {
            const x = ship.direction ? ship.position.x : ship.position.x + i;
            const y = ship.direction ? ship.position.y + i : ship.position.y;

            field[y][x] = shipDescriptor;
            shipDescriptor.shipTheCells.push([x, y]);

            if (i === 0 || i === ship.length - 1) {
                addSurroundingCells(x, y, shipDescriptor, fieldLength);
            }
        }
    });

    return field;
}

export const turnPlayer = (currentPlayerIndex: number, gameId: string) => {
    const game = games.find((game) => game.roomId === gameId);

    if (game) {
        game.roomUsers.forEach((roomUser) => {
            const userPlayer = players.get(roomUser.name);

            if (userPlayer && userPlayer.ws) {
                const turnData = {
                    currentPlayer: addTurnIndex(currentPlayerIndex, gameId),
                };

                userPlayer.ws.send(JSON.stringify({ type: EWebSocketMessages.TURN, data: JSON.stringify(turnData), id: 0 }));
            }
        });
    }
};

export const addShips = (playerName: string, ships: IShip[]) => {
    const currentPlayer = players.get(playerName);

    if (!currentPlayer) {
        return;
    }

    currentPlayer.ships = ships;
    currentPlayer.ready = true;

    const game = games.find(
        (game) => game.roomUsers && game.roomUsers.some((user) => user.name === playerName),
    );

    if (!game) {
        return;
    }

    const allPlayersReady = game.roomUsers.every((user) => {
        const userPlayer = players.get(user.name);
        return userPlayer ? userPlayer.ready : false;
    });

    if (allPlayersReady) {
        game.userReady = game.roomUsers.length;

        const firstPlayerIndex = game.roomUsers[0].index;
        game.roomUsers.forEach((roomUser, index) => {
            const player = players.get(roomUser.name);

            if (player && player.ws) {
                const playerField = initializeBattlefield(player.ships);

                if (!roomUser.userFields) {
                    roomUser.userFields = {
                        firstUserField: index === 0 ? playerField : [],
                        secondUserField: index === 1 ? playerField : [],
                    };
                } else {
                    if (index === 0) {
                        roomUser.userFields.firstUserField = playerField;
                    } else if (index === 1) {
                        roomUser.userFields.secondUserField = playerField;
                    }
                }
                const startGameData = { ships: player.ships, currentPlayerIndex: player.index };
                player.ws.send(JSON.stringify({ type: EWebSocketMessages.START_GAME, data: JSON.stringify(startGameData), id: 0 }));

                turnPlayer(firstPlayerIndex, game.roomId);
            }
        });
    }
};

export const showPlayersAttack = (gameId: string, type: string, data: object) => {
    const game = games.find((g) => g.roomId === gameId);
    if (!game) {
        return;
    }

    game.roomUsers.forEach((roomUser) => {
        const player = players.get(roomUser.name);

        if (player && player.ws) {
            player.ws.send(JSON.stringify({ type, data: JSON.stringify(data), id: 0 }));
        }
    });
};

const processDestroyedShip = (cell: IField, gameId: string, currentPlayerIndex: number) => {
    cell.overCells.forEach((aroundCell) => {
        const [x, y] = aroundCell;
        showPlayersAttack(gameId, "attack", {
            position: { x, y },
            currentPlayer: currentPlayerIndex,
            status: "missed",
        });
    });

    cell.shipTheCells.forEach((shipCell) => {
        showPlayersAttack(gameId, "attack", {
            position: { x: shipCell[0], y: shipCell[1] },
            currentPlayer: currentPlayerIndex,
            status: "killed",
        });
    });
};

export const announceWinner = (gameId: string, winnerIndex: number) => {
    const game = games.find((g) => g.roomId === gameId);
    if (!game) {
        console.error(`Game not found: ${gameId}`);
        return;
    }

    game.roomUsers.forEach((roomUser) => {
        const player = players.get(roomUser.name);

        if (player) {
            if (player.index === winnerIndex) {
                player.winner = (player.winner || 0) + 1;
            }

            if (player.ws) {
                player.ws.send(JSON.stringify({ type: EWebSocketMessages.FINISH, data: JSON.stringify({ winPlayer: winnerIndex }), id: 0 }));
            }
        }
    });

    players.forEach((player) => {
        if (player.ws) {
            player.ws.send(JSON.stringify({ type: EWebSocketMessages.UPDATE_WINNERS, data: JSON.stringify(showWinners()) }));
        }
    });

    removeGame(gameId);

    games.forEach((game) => {
        if (game.roomUsers.some((user) => user.index === winnerIndex)) {
            game.roomUsers = game.roomUsers.filter((user) => user.index !== winnerIndex);
        }
    });

    rooms.forEach((room) => {
        if (room.roomUsers.some((user) => user.index === winnerIndex)) {
            room.roomUsers = room.roomUsers.filter((user) => user.index !== winnerIndex);
        }
    });
};

export const attack = (player: IPlayer, data: IAttack) => {
    const { x, y, gameId, indexPlayer } = data;

    const game = games.find((game) => game.roomId === gameId);
    if (!game) {
        return;
    }

    const currentPlayer = game.roomUsers.find((roomUser) => roomUser.index === +indexPlayer);

    if (!currentPlayer) {
        return;
    }

    const opponentPlayer = game.roomUsers.find((roomUser) => roomUser.index !== +indexPlayer);

    if (!opponentPlayer) {
        return;
    }

    const opponentField =
        +indexPlayer === game.roomUsers[0].index
            ? opponentPlayer.userFields?.secondUserField
            : opponentPlayer.userFields?.firstUserField;

    if (!opponentField) {
        return;
    }

    const cell = opponentField[y][x];

    cell.isAttacked = true;
    const isHit = !cell.empty;

    if (isHit) {
        cell.leftSide--;
        if (cell.leftSide === 0) {
            --opponentPlayer.shipsLeft;
            processDestroyedShip(cell, gameId, currentPlayer.index);

            if (opponentPlayer.shipsLeft === 0) {
                announceWinner(gameId, currentPlayer.index);
                return;
            }

            const nextPlayerIndex = game.roomUsers.find((ru) => ru.index !== +indexPlayer)?.index;
            if (nextPlayerIndex !== undefined) {
                turnPlayer(nextPlayerIndex, gameId);
            }
        } else {
            showPlayersAttack(gameId, "attack", {
                position: { y, x },
                currentPlayer: currentPlayer.index,
                status: "shot",
            });

            const nextPlayerIndex = game.roomUsers.find((ru) => ru.index !== +indexPlayer)?.index;
            if (nextPlayerIndex !== undefined) {
                turnPlayer(nextPlayerIndex, gameId);
            }
        }
    } else {
        showPlayersAttack(gameId, "attack", {
            position: { y, x },
            currentPlayer: currentPlayer.index,
            status: "missed",
        });
        const nextPlayerIndex = game.roomUsers.find((ru) => ru.index === +indexPlayer)?.index;
        if (nextPlayerIndex !== undefined) {
            turnPlayer(nextPlayerIndex, gameId);
        }
    }
};