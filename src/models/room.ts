import { randomUUID } from "crypto";
import { IRoom } from "../types/interfaces/room";
import { IPlayer } from "../types/interfaces/player";
import { removeRoom, rooms } from "../db/rooms";
import { players } from "../db/players";
import { EWebSocketMessages } from "../types/enums/messages";
import { createGame } from "./game";

export const createRoom = (player: IPlayer): IRoom => {
    const roomId = randomUUID();

    const newRoom: IRoom = {
        roomId: roomId,
        roomUsers: [],
        gameState: false,
    };

    newRoom.roomUsers.push({
        name: player.name,
        index: player.index,
        shipsLeft: 10,
    });

    rooms.forEach((room) => {
        if (room.roomUsers.some((currentPlayer) => currentPlayer.name === player.name)) {
            room.roomUsers = room.roomUsers.filter((currentPlayer) => currentPlayer.name !== player.name);
        }
    });


    rooms.push(newRoom);

    players.forEach((player) => {
        player.ws?.send(JSON.stringify({ type: EWebSocketMessages.UPDATE_ROOM, data: JSON.stringify(rooms), id: 0 }));
    });

    return newRoom;
};

export const addUserToRoom = (roomId: string, playerName: string) => {
    const currentPlayer = players.get(playerName);
    const currentRoom = rooms.find((room) => room.roomId === roomId);

    if (!currentPlayer || !currentRoom) {
        console.log('Player or room not found. Add user to room now.');
        return;
    }

    if (currentRoom.roomUsers.some((player) => player.name === currentPlayer.name)) {
        return;
    }

    rooms.forEach((room) => {
        if (room.roomUsers.some((user) => user.name === currentPlayer.name)) {
            room.roomUsers = room.roomUsers.filter((user) => user.name !== currentPlayer.name);
        }
    });

    const userData = {
        name: currentPlayer.name,
        index: currentPlayer.index,
        shipsLeft: 10
    };

    currentRoom.roomUsers.push(userData);

    if (currentRoom.roomUsers.length === 2) {
        currentRoom.gameState = true;

        currentRoom.roomUsers.forEach((player) => {
            createGame(player.name, currentRoom.roomId);
        });

        removeRoom(roomId);
    }

    players.forEach((player) => {
        player.ws?.send(JSON.stringify({ type: EWebSocketMessages.UPDATE_ROOM, data: JSON.stringify(rooms), id: 0 }));
    });
};