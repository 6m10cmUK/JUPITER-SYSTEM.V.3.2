"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollSingleStat = rollSingleStat;
exports.rollAllStats = rollAllStats;
const dice_1 = require("./dice");
function rollStat(count, bonus = 0) {
    const results = (0, dice_1.rollDice)(count, 6);
    const sum = results.reduce((a, b) => a + b, 0) + bonus;
    return {
        value: sum,
        detail: (0, dice_1.formatDiceDetail)(results, 1, bonus)
    };
}
const roll3d6 = () => rollStat(3);
const roll2d6plus6 = () => rollStat(2, 6);
const roll3d6plus3 = () => rollStat(3, 3);
function rollSingleStat(statType) {
    switch (statType) {
        case 'siz':
            return roll2d6plus6();
        case 'int':
            return roll2d6plus6();
        case 'edu':
            return roll3d6plus3();
        default:
            return roll3d6();
    }
}
function rollAllStats() {
    const strRoll = roll3d6();
    const conRoll = roll3d6();
    const powRoll = roll3d6();
    const dexRoll = roll3d6();
    const appRoll = roll3d6();
    const sizRoll = roll2d6plus6();
    const intRoll = roll2d6plus6();
    const eduRoll = roll3d6plus3();
    return {
        stats: {
            str: strRoll.value,
            con: conRoll.value,
            pow: powRoll.value,
            dex: dexRoll.value,
            app: appRoll.value,
            siz: sizRoll.value,
            int: intRoll.value,
            edu: eduRoll.value,
        },
        details: {
            str: strRoll.detail,
            con: conRoll.detail,
            pow: powRoll.detail,
            dex: dexRoll.detail,
            app: appRoll.detail,
            siz: sizRoll.detail,
            int: intRoll.detail,
            edu: eduRoll.detail,
        }
    };
}
