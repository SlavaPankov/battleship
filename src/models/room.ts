import { randomUUID } from "crypto";
import { IRoom } from "../types/interfaces/room";
import { IPlayer } from "../types/interfaces/player";
import { rooms } from "../db/rooms";
import { players } from "../db/players";
import { EWebSocketMessages } from "../types/enums/messages";

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
