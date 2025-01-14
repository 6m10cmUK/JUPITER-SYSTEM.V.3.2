"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollStatusDice = rollStatusDice;
const dice_1 = require("./dice");
function rollStatusDice() {
    const stats = {
        str: (0, dice_1.rollDice)(3, 6),
        con: (0, dice_1.rollDice)(3, 6),
        pow: (0, dice_1.rollDice)(3, 6),
        dex: (0, dice_1.rollDice)(3, 6),
        app: (0, dice_1.rollDice)(3, 6),
        siz: (0, dice_1.rollDice)(2, 6).map(v => v + 6),
        int: (0, dice_1.rollDice)(2, 6).map(v => v + 6),
        edu: (0, dice_1.rollDice)(3, 6).map(v => v + 3)
    };
    const details = {
        str: (0, dice_1.formatDiceDetail)(stats.str),
        con: (0, dice_1.formatDiceDetail)(stats.con),
        pow: (0, dice_1.formatDiceDetail)(stats.pow),
        dex: (0, dice_1.formatDiceDetail)(stats.dex),
        app: (0, dice_1.formatDiceDetail)(stats.app),
        siz: (0, dice_1.formatDiceDetail)(stats.siz.map(v => v - 6)) + '+6',
        int: (0, dice_1.formatDiceDetail)(stats.int.map(v => v - 6)) + '+6',
        edu: (0, dice_1.formatDiceDetail)(stats.edu.map(v => v - 3)) + '+3'
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
