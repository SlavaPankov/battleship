import { EWebSocketMessages } from "src/types/enums/messages";
import { players } from "../db/players"
import { IWinner } from "../types/interfaces/winner"
import { IShip } from "../types/interfaces/ship";
import { addTurnIndex, games, removeGameById } from "../db/games";
import { IField } from "../types/interfaces/Field";
import { IPlayer } from "../types/interfaces/player";
import { IAttack } from "../types/interfaces/attack";
import { rooms } from "../db/rooms";

export const findGame = (gameId: string, indexPlayer: number): boolean => {
    const game = games.find(({ roomId }) => roomId === gameId);
    return game ? game.roomUsers.some(({ turnIndex }) => turnIndex === indexPlayer) : false;
};

const sendMessageToPlayer = (player: IPlayer, type: EWebSocketMessages, data: unknown, id: number = 0) => {
    if (player?.ws) {
        player.ws.send(JSON.stringify({ type, data: JSON.stringify(data), id }));
    }
};

export const getWinnersList = (): IWinner[] => {
    return Array.from(players.values())
        .filter((player) => player.winner && player.winner > 0)
        .map(({ name, winner }) => ({ name, wins: winner }));
}

export const initiateGame = (playerName: string, roomId: string) => {
    const player = players.get(playerName);

    if (player?.ws) {
        const gameDetails = {
            idGame: roomId,
            idPlayer: player.index,
        };

        sendMessageToPlayer(player, EWebSocketMessages.CREATE_GAME, gameDetails)
    }
};

const markSurroundingCells = (x: number, y: number, field: IField, fieldSize: number) => {
    const adjacentCells = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0], [1, 0],
        [-1, 1], [0, 1], [1, 1],
    ];

    adjacentCells.forEach(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;

        if (newX >= 0 && newY >= 0 && newX < fieldSize && newY < fieldSize) {
            field.overCells.push([newX, newY]);
        }
    });
}

export const setupBattlefield = (ships: IShip[]): IField[][] => {
    const fieldSize = 10;

    const field: IField[][] = Array.from({ length: fieldSize }, () =>
        Array.from({ length: fieldSize }, () => ({ empty: true, isAttacked: false })),
    );

    ships.forEach((ship) => {
        const shipField: IField = {
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

            field[y][x] = shipField;
            shipField.shipTheCells.push([x, y]);

            if (i === 0 || i === ship.length - 1) {
                markSurroundingCells(x, y, shipField, fieldSize);
            }
        }
    });

    return field;
}

export const processTurnForPlayer = (currentPlayerIndex: number, gameId: string) => {
    const game = games.find((game) => game.roomId === gameId);

    if (game) {
        game.roomUsers.forEach((roomUser) => {
            const userPlayer = players.get(roomUser.name);

            if (userPlayer?.ws) {
                const turnData = {
                    currentPlayer: addTurnIndex(currentPlayerIndex, gameId),
                };

                sendMessageToPlayer(userPlayer, EWebSocketMessages.TURN, turnData);
            }
        });
    }
};

export const assignShipsToPlayer = (playerName: string, ships: IShip[]) => {
    const player = players.get(playerName);

    if (!player) {
        return;
    }

    player.ships = ships;
    player.ready = true;

    const game = games.find(
        (game) => game.roomUsers && game.roomUsers.some((user) => user.name === playerName),
    );

    if (!game) {
        return;
    }

    const allPlayersReady = game.roomUsers.every(({ name }) => players.get(name)?.ready);

    if (allPlayersReady) {
        game.userReady = game.roomUsers.length;
        const firstPlayerIndex = game.roomUsers[0].index;

        game.roomUsers.forEach((roomUser, index) => {
            const player = players.get(roomUser.name);

            if (player?.ws) {
                const playerField = setupBattlefield(player.ships);

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

                sendMessageToPlayer(player, EWebSocketMessages.START_GAME, startGameData);

                processTurnForPlayer(firstPlayerIndex, game.roomId);
            }
        });
    }
};

export const notifyPlayersOfAttack = (gameId: string, type: EWebSocketMessages, data: object) => {
    const game = games.find(({ roomId }) => roomId === gameId);

    if (!game) {
        return;
    }

    game.roomUsers.forEach(({ name }) => {
        const player = players.get(name);

        if (player && player.ws) {
            sendMessageToPlayer(player, type, data);
        }
    });
};

const handleShipDestruction = (field: IField, gameId: string, currentPlayer: number) => {
    field.overCells.forEach(([x, y]) => {
        notifyPlayersOfAttack(gameId, EWebSocketMessages.ATTACK, {
            position: { x, y },
            currentPlayer,
            status: "missed",
        });
    });

    field.shipTheCells.forEach(([x, y]) => {
        notifyPlayersOfAttack(gameId, EWebSocketMessages.ATTACK, {
            position: { x, y },
            currentPlayer,
            status: "killed",
        });
    });
};

export const declareGameWinner = (gameId: string, winnerIndex: number) => {
    const game = games.find(({ roomId }) => roomId === gameId);

    if (!game) {
        return;
    }

    game.roomUsers.forEach(({ name }) => {
        const player = players.get(name);

        if (player) {
            if (player.index === winnerIndex) {
                player.winner = (player.winner || 0) + 1;
            }

            if (player.ws) {
                sendMessageToPlayer(player, EWebSocketMessages.FINISH, { winPlayer: winnerIndex });
            }
        }
    });

    const updatedWinners = getWinnersList();

    players.forEach((player) => {
        sendMessageToPlayer(player, EWebSocketMessages.UPDATE_WINNERS, updatedWinners);
    });

    removeGameById(gameId);

    games.forEach((game) => {
        game.roomUsers = game.roomUsers.filter(({ index }) => index !== winnerIndex);
    });

    rooms.forEach((room) => {
        room.roomUsers = room.roomUsers.filter(({ index }) => index !== winnerIndex);
    });
};

export const executePlayerAttack = (attacker: IPlayer, attackData: IAttack) => {
    const { x, y, gameId, indexPlayer } = attackData;

    const game = games.find((game) => game.roomId === gameId);

    if (!game) {
        return;
    }

    const targetPlayer = game.roomUsers.find(({ index }) => index === Number(indexPlayer));

    if (!targetPlayer) {
        return;
    }

    const opponent = game.roomUsers.find(({ index }) => index !== Number(indexPlayer));

    if (!opponent) {
        return;
    }

    const targetField = indexPlayer === game.roomUsers[0].index ? opponent.userFields?.secondUserField : opponent.userFields?.firstUserField;

    if (!targetField) {
        return;
    }

    const cell = targetField[y][x];

    cell.isAttacked = true;

    if (!cell.empty) {
        cell.leftSide--;

        if (cell.leftSide === 0) {
            opponent.shipsLeft--;

            handleShipDestruction(cell, gameId, targetPlayer.index);

            if (opponent.shipsLeft === 0) {
                declareGameWinner(gameId, targetPlayer.index);

                return;
            }

            const nextPlayerIndex = game.roomUsers.find(({ index }) => index !== Number(indexPlayer))?.index;

            if (nextPlayerIndex !== undefined) {
                processTurnForPlayer(nextPlayerIndex, gameId);
            }
        }

        notifyPlayersOfAttack(gameId, EWebSocketMessages.ATTACK, {
            position: { y, x },
            currentPlayer: targetPlayer.index,
            status: "shot",
        });
    } else {
        notifyPlayersOfAttack(gameId, EWebSocketMessages.ATTACK, {
            position: { y, x },
            currentPlayer: targetPlayer.index,
            status: "missed",
        });

        const nextPlayerIndex = game.roomUsers.find((ru) => ru.index === +indexPlayer)?.index;

        if (nextPlayerIndex !== undefined) {
            processTurnForPlayer(nextPlayerIndex, gameId);
        }
    }
};

export const randomizeAttack = (attacker: IPlayer, gameId: string) => {
    const game = games.find(({ roomId }) => roomId === gameId);

    if (!game) {
        return;
    }

    const opponent = game.roomUsers.find(({ index }) => index !== attacker.index);

    if (!opponent) {
        return;
    }

    const targetField = attacker.index === game.roomUsers[0].index
        ? opponent.userFields?.secondUserField
        : opponent.userFields?.firstUserField;

    if (!targetField) {
        return;
    }

    const availableCells: [number, number][] = [];

    targetField.forEach((row, newY) => {
        row.forEach((cell, newX) => {
            if (!cell.empty && cell.leftSide === 0) {
                availableCells.push([newX, newY]);
            }
        });
    });

    if (availableCells.length > 0) {
        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        executePlayerAttack(attacker, { x: randomCell[0], y: randomCell[1], gameId, indexPlayer: opponent.index });
    }

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = targetField[y][x];
            if (!cell.empty && cell.leftSide > 0 && cell.isAttacked) {
                executePlayerAttack(attacker, { gameId, x, y, indexPlayer: attacker.index });
                return;
            }
        }
    }

    let unattachedCells = [];

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = targetField[y][x];
            if (!cell.isAttacked) {
                unattachedCells.push({ x, y });
            }
        }
    }

    unattachedCells = unattachedCells.filter(cell =>
        !availableCells.some(ac => ac[0] === cell.x && ac[1] === cell.y)
    );

    if (unattachedCells.length > 0) {
        const randomCell = unattachedCells[Math.floor(Math.random() * unattachedCells.length)];

        executePlayerAttack(attacker, { gameId, x: randomCell.x, y: randomCell.y, indexPlayer: attacker.index });
    }
};