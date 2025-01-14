import { rollDice, formatDiceDetail } from './dice';

export function rollStatusDice() {
    const stats = {
        str: rollDice(3, 6),
        con: rollDice(3, 6),
        pow: rollDice(3, 6),
        dex: rollDice(3, 6),
        app: rollDice(3, 6),
        siz: rollDice(2, 6).map(v => v + 6),
        int: rollDice(2, 6).map(v => v + 6),
        edu: rollDice(3, 6).map(v => v + 3)
    };

    const details = {
        str: formatDiceDetail(stats.str),
        con: formatDiceDetail(stats.con),
        pow: formatDiceDetail(stats.pow),
        dex: formatDiceDetail(stats.dex),
        app: formatDiceDetail(stats.app),
        siz: formatDiceDetail(stats.siz.map(v => v - 6)) + '+6',
        int: formatDiceDetail(stats.int.map(v => v - 6)) + '+6',
        edu: formatDiceDetail(stats.edu.map(v => v - 3)) + '+3'
    };

    return {
        stats: {
            str: stats.str.reduce((a, b) => a + b, 0),
            con: stats.con.reduce((a, b) => a + b, 0),
            pow: stats.pow.reduce((a, b) => a + b, 0),
            dex: stats.dex.reduce((a, b) => a + b, 0),
            app: stats.app.reduce((a, b) => a + b, 0),
            siz: stats.siz.reduce((a, b) => a + b, 0),
            int: stats.int.reduce((a, b) => a + b, 0),
            edu: stats.edu.reduce((a, b) => a + b, 0)
        },
        details
    };
} 