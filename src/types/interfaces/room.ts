import { IPlayer } from "./player";

export interface IRoom {
    roomId: string;
    roomUsers: IPlayer[];
}