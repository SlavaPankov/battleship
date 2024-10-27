import { players } from "src/db/players"

export const create = (name: string, password: string, ws: WebSocket) => {
    if (players.has(name)) {
        const player = players.get(name);

        if (player.password === password) {
            players.set(name, { ...player, ws });

            return { name, index: player.index, error: false, errorText: '' }
        } else {
            return {
                error: true,
                errorText: 'Invalid username or password',
            }
        }
    } 

    const index = players.size + 1;

    players.set(name, {
        id: 0,
        name,
        password,
        index,
        error: false,
        errorText: '',
        ws,
    });

    return {
        name,
        index,
        error: false,
        errorText: '',
    }
}