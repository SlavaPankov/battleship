import { IRoom } from "../types/interfaces/room";
import { games } from "./games";

export let rooms: IRoom[] = [];

export const removeRoom = (id: string) => {
    rooms = rooms.filter((room) => {
        if (room.roomId === id) {
          games.push(room);
          room.roomId !== id;
        }
      });
}