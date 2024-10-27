import { IShip } from "./ship";

export interface IPlayer {
    id: 0;
    name: string;
    password: string;
    index: number;
    error: boolean;
    ws: WebSocket;
    winner: number;
    ready: boolean;
    ships: IShip[];
}