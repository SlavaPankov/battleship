import { games } from "src/db/games";
import { EShipType } from "src/types/enums/shipTypes";
import { IShip } from "src/types/interfaces/ship";

export const isBotInGame = (gameId: string, botName: string): boolean => {
    const game = games.find(({ roomId }) => roomId === gameId);
    return game ? game.roomUsers.some(({ name }) => name === botName) : false;
};

const isValidPlacement = (
    startX: number,
    startY: number,
    shipLength: number,
    isVertical: boolean,
    grid: boolean[][],
): boolean => {
    for (let i = 0; i < shipLength; i++) {
        const x = startX + (isVertical ? 0 : i);
        const y = startY + (isVertical ? i : 0);

        if (x < 0 || y < 0 || x >= grid.length || y >= grid.length || grid[y][x]) {
            return false;
        }

        for (let offsetX = -1; offsetX <= 1; offsetX++) {
            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                const neighborX = x + offsetX;
                const neighborY = y + offsetY;
                if (
                    neighborX >= 0 &&
                    neighborX < grid.length &&
                    neighborY >= 0 &&
                    neighborY < grid.length &&
                    grid[neighborY][neighborX]
                ) {
                    return false;
                }
            }
        }
    }

    return true;
};

const placeShipOnGrid = (
    startX: number,
    startY: number,
    shipLength: number,
    isVertical: boolean,
    grid: boolean[][],
): void => {
    for (let i = 0; i < shipLength; i++) {
        const x = startX + (isVertical ? 0 : i);
        const y = startY + (isVertical ? i : 0);
        grid[y][x] = true;
    }
};

export const generateRandomShips = (): IShip[] => {
    const gridSize = 10;
    const shipSpecifications = [
        { type: EShipType.huge, length: 4, count: 1 },
        { type: EShipType.large, length: 3, count: 2 },
        { type: EShipType.medium, length: 2, count: 3 },
        { type: EShipType.small, length: 1, count: 4 },
    ];

    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    const ships = [];

    for (const { type, length, count } of shipSpecifications) {
        for (let i = 0; i < count; i++) {
            let shipPlaced = false;
            while (!shipPlaced) {
                const direction = Math.random() < 0.5;
                const startX = Math.floor(Math.random() * gridSize);
                const startY = Math.floor(Math.random() * gridSize);

                if (isValidPlacement(startX, startY, length, direction, grid)) {
                    placeShipOnGrid(startX, startY, length, direction, grid);

                    ships.push({ position: { x: startX, y: startY }, direction, type, length });
                    shipPlaced = true;
                }
            }
        }
    }

    return ships;
};