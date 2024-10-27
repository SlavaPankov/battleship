import { IPlayer } from "./player";

export interface IRoomPlayer {
    name: string;
    index: number;
    shipsLeft: number; 
    turnIndex?: number;
    userFields?: [];
}

export interface IRoom {
    roomId: string;
    roomUsers: IRoomPlayer[];
    gameState?: boolean;
}