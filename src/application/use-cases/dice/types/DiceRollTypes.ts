import { DiceRoll, CCBRoll } from '../../../../domain/entities/DiceRoll';
import { CoCDiceRoll, FARRoll } from '../../../../domain/entities/CoCDiceRoll';

export type DiceRollResult = DiceRoll | CoCDiceRoll | FARRoll | CCBRoll;

export function isDiceRoll(roll: DiceRollResult): roll is DiceRoll {
    return roll instanceof DiceRoll && !(roll instanceof CoCDiceRoll) && !(roll instanceof FARRoll) && !(roll instanceof CCBRoll);
}

export function isCoCDiceRoll(roll: DiceRollResult): roll is CoCDiceRoll {
    return roll instanceof CoCDiceRoll;
}

export function isFARRoll(roll: DiceRollResult): roll is FARRoll {
    return roll instanceof FARRoll;
}

/**
 * CCBRoll（故障ナンバー付きロール）の型ガード
 * @param roll ダイスロール結果
 * @returns CCBRollかどうか
 */
export function isCCBRoll(roll: DiceRollResult): roll is CCBRoll {
    return roll instanceof CCBRoll;
}

/**
 * 故障ナンバーが実際に設定されているCCBRollの型ガード
 * @param roll ダイスロール結果
 * @returns 故障ナンバーが設定されているCCBRollかどうか
 */
export function isBreakdownAwareCCBRoll(
    roll: DiceRollResult
): roll is CCBRoll & { getBreakdownNumber(): number } {
    if (!(roll instanceof CCBRoll)) return false;
    const breakdownNumber = roll.getBreakdownNumber();
    return typeof breakdownNumber === 'number';
}