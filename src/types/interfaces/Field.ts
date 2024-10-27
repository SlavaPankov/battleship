interface IEmptyField {
    empty: false;
    leftSide: number;
    pastTheCells: number[];
    shipTheCells: Array<[number, number]>;
    overCells: Array<[number, number]>;
    isAttacked?: boolean;
}

interface IFullField {
    empty: true;
    isAttacked: boolean;
    overCells?: Array<[number, number]>;
    leftSide?: number;
    pastTheCells?: number[];
    shipTheCells?: Array<[number, number]>;
}

export type IField = IEmptyField | IFullField;