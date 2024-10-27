import { IRoom } from "./room";

export interface IGame extends Omit<IRoom, 'gameState'> {
    userReady?: boolean;
}
