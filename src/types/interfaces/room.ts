import { IField } from "./field";

export interface IRoomPlayer {
    name: string;
    index: number;
    shipsLeft: number; 
    turnIndex?: number;
    userFields?: {
        firstUserField: IField[][];
        secondUserField: IField[][];
    };
}

export interface IRoom {
    roomId: string;
    roomUsers: IRoomPlayer[];
    gameState?: boolean;
}