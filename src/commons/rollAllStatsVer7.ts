import { rollDice, formatDiceDetail } from './dice';
import { StatusData } from '../types/statusDataVer7';


/**
 * ダイスを振る関数
 * @param count ダイスを振る回数
 * @param faces ダイスの面数
 * @returns {number[]} 出目の配列
 */
export function rollAllStatsVer7(): StatusData {
        const strRoll = rollDice(3, 6);
        const conRoll = rollDice(3, 6);
        const powRoll = rollDice(3, 6);
        const dexRoll = rollDice(3, 6);
        const appRoll = rollDice(3, 6);
        const sizRoll = rollDice(2, 6);
        const intRoll = rollDice(2, 6);
        const eduRoll = rollDice(3, 6);
        const lucRoll = rollDice(3, 6);
        return {
            str: (strRoll.reduce((a, b) => a + b, 0)) * 5,
            con: (conRoll.reduce((a, b) => a + b, 0)) * 5,
            pow: (powRoll.reduce((a, b) => a + b, 0)) * 5,
            dex: (dexRoll.reduce((a, b) => a + b, 0)) * 5,
            app: (appRoll.reduce((a, b) => a + b, 0)) * 5,
            siz: (sizRoll.reduce((a, b) => a + b, 0) + 6) * 5,
            int: (intRoll.reduce((a, b) => a + b, 0) + 6) * 5,
            edu: (eduRoll.reduce((a, b) => a + b, 0) + 3) * 5,
            luc: (lucRoll.reduce((a, b) => a + b, 0)) * 5,
            details: {
                str: formatDiceDetail(strRoll, 5),
                con: formatDiceDetail(conRoll, 5),
                pow: formatDiceDetail(powRoll, 5),
                dex: formatDiceDetail(dexRoll, 5),
                app: formatDiceDetail(appRoll, 5),
                siz: formatDiceDetail(sizRoll, 5, 6),
                int: formatDiceDetail(intRoll, 5, 6),
                edu: formatDiceDetail(eduRoll, 5, 3),
                luc: formatDiceDetail(lucRoll, 5)
            }
        };
}

export function rollIndividualStatusVer7(
    stat: string
): { result: number, details: string } {
    let roll;
    let details;
    let result;
    switch (stat) {
        case 'str':
        case 'con':
        case 'pow':
        case 'dex':
        case 'app':
        case 'luc':
            roll = rollDice(3, 6);
            details = formatDiceDetail(roll, 5);
            result = roll.reduce((a, b) => a + b, 0) * 5;
            break;
        case 'siz':
        case 'int':
            roll = rollDice(2, 6);
            details = formatDiceDetail(roll, 5, 6);
            result = (roll.reduce((a, b) => a + b, 0) + 6) * 5;
            break;
        case 'edu':
            roll = rollDice(3, 6);
            details = formatDiceDetail(roll, 5, 3);
            result = (roll.reduce((a, b) => a + b, 0) + 3) * 5;
            break;
        default:
            throw new Error('Invalid stat');
    }

    return {
        result: result,
        details: details
    };
}
