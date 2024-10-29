import { IShip } from "./ship";

export interface IPlayer {
    id?: 0;
    name?: string;
    password?: string;
    index?: number;
    error?: boolean;
    errorText?: string;
    ws?: WebSocket;
    winner?: number;
    ready?: boolean;
    ships?: IShip[];
    isBot?: boolean;
}