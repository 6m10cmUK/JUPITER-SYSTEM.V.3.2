"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollAllStats = rollAllStats;
exports.rollIndividualStatus = rollIndividualStatus;
const dice_1 = require("./dice");
/**
 * ダイスを振る関数
 * @param count ダイスを振る回数
 * @param faces ダイスの面数
 * @returns {number[]} 出目の配列
 */
function rollAllStats(version) {
    if (version === 'ver6') {
        const strRoll = (0, dice_1.rollDice)(3, 6);
        const conRoll = (0, dice_1.rollDice)(3, 6);
        const powRoll = (0, dice_1.rollDice)(3, 6);
        const dexRoll = (0, dice_1.rollDice)(3, 6);
        const appRoll = (0, dice_1.rollDice)(3, 6);
        const sizRoll = (0, dice_1.rollDice)(2, 6);
        const intRoll = (0, dice_1.rollDice)(2, 6);
        const eduRoll = (0, dice_1.rollDice)(3, 6);
        return {
            str: strRoll.reduce((a, b) => a + b, 0),
            con: conRoll.reduce((a, b) => a + b, 0),
            pow: powRoll.reduce((a, b) => a + b, 0),
            dex: dexRoll.reduce((a, b) => a + b, 0),
            app: appRoll.reduce((a, b) => a + b, 0),
            siz: sizRoll.reduce((a, b) => a + b, 0) + 6,
            int: intRoll.reduce((a, b) => a + b, 0) + 6,
            edu: eduRoll.reduce((a, b) => a + b, 0) + 3,
            details: {
                str: (0, dice_1.formatDiceDetail)(strRoll),
                con: (0, dice_1.formatDiceDetail)(conRoll),
                pow: (0, dice_1.formatDiceDetail)(powRoll),
                dex: (0, dice_1.formatDiceDetail)(dexRoll),
                app: (0, dice_1.formatDiceDetail)(appRoll),
                siz: (0, dice_1.formatDiceDetail)(sizRoll, 1, 6),
                int: (0, dice_1.formatDiceDetail)(intRoll, 1, 6),
                edu: (0, dice_1.formatDiceDetail)(eduRoll, 1, 3)
            }
        };
    }
    else if (version === 'ver7') {
        return {
            str: 0,
            con: 0,
            pow: 0,
            dex: 0,
            app: 0,
            siz: 0,
            int: 0,
            edu: 0,
            details: {
                str: '',
                con: '',
                pow: '',
                dex: '',
                app: '',
                siz: '',
                int: '',
                edu: ''
            }
        };
    }
    else {
        throw new Error('Invalid version');
    }
}
function rollIndividualStatus(stat) {
    let roll;
    let details;
    let result;
    switch (stat) {
        case 'str':
        case 'con':
        case 'pow':
        case 'dex':
        case 'app':
            roll = (0, dice_1.rollDice)(3, 6);
            details = (0, dice_1.formatDiceDetail)(roll);
            result = roll.reduce((a, b) => a + b, 0);
            break;
        case 'siz':
            roll = (0, dice_1.rollDice)(2, 6);
            details = (0, dice_1.formatDiceDetail)(roll, 1, 6);
            result = roll.reduce((a, b) => a + b, 0) + 6;
            break;
        case 'int':
            roll = (0, dice_1.rollDice)(2, 6);
            details = (0, dice_1.formatDiceDetail)(roll, 1, 6);
            result = roll.reduce((a, b) => a + b, 0) + 6;
            break;
        case 'edu':
            roll = (0, dice_1.rollDice)(3, 6);
            details = (0, dice_1.formatDiceDetail)(roll, 1, 3);
            result = roll.reduce((a, b) => a + b, 0) + 3;
            break;
        default:
            throw new Error('Invalid stat');
    }
    return {
        result: result,
        details: details
    };
}
