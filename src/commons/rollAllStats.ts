import { rollDice, formatDiceDetail } from './dice';
import { StatusData } from '../types/statusData';


/**
 * ダイスを振る関数
 * @param count ダイスを振る回数
 * @param faces ダイスの面数
 * @returns {number[]} 出目の配列
 */
export function rollAllStats(version: string): StatusData {
    if (version === 'ver6') {
        const strRoll = rollDice(3, 6);
        const conRoll = rollDice(3, 6);
        const powRoll = rollDice(3, 6);
        const dexRoll = rollDice(3, 6);
        const appRoll = rollDice(3, 6);
        const sizRoll = rollDice(2, 6);
        const intRoll = rollDice(2, 6);
        const eduRoll = rollDice(3, 6);
    
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
                str: formatDiceDetail(strRoll),
                con: formatDiceDetail(conRoll),
                pow: formatDiceDetail(powRoll),
                dex: formatDiceDetail(dexRoll),
                app: formatDiceDetail(appRoll),
                siz: formatDiceDetail(sizRoll, 1, 6),
                int: formatDiceDetail(intRoll, 1, 6),
                edu: formatDiceDetail(eduRoll, 1, 3)
            }
        };
    } else if (version === 'ver7') {
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
    } else {
        throw new Error('Invalid version');
    }
}

export function rollIndividualStatus(
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
            roll = rollDice(3, 6);
            details = formatDiceDetail(roll);
            result = roll.reduce((a, b) => a + b, 0);
            break;
        case 'siz':
            roll = rollDice(2, 6);
            details = formatDiceDetail(roll, 1, 6);
            result = roll.reduce((a, b) => a + b, 0) + 6;
            break;
        case 'int':
            roll = rollDice(2, 6);
            details = formatDiceDetail(roll, 1, 6);
            result = roll.reduce((a, b) => a + b, 0) + 6;
            break;
        case 'edu':
            roll = rollDice(3, 6);
            details = formatDiceDetail(roll, 1, 3);
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
