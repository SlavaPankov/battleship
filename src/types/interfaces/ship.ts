import { EShipType } from "../enums/shipTypes";

export interface IShipPosition {
    x: number;
    y: number;
}

export interface IShip {
    position: IShipPosition;
    direction: boolean;
    length: number;
    type: EShipType;
}