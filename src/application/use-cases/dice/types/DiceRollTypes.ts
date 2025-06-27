import { DiceRoll } from '../../../../domain/entities/DiceRoll';
import { CoCDiceRoll, FARRoll } from '../../../../domain/entities/CoCDiceRoll';

export type DiceRollResult = DiceRoll | CoCDiceRoll | FARRoll;

export function isDiceRoll(roll: DiceRollResult): roll is DiceRoll {
    return roll instanceof DiceRoll && !(roll instanceof CoCDiceRoll) && !(roll instanceof FARRoll);
}

export function isCoCDiceRoll(roll: DiceRollResult): roll is CoCDiceRoll {
    return roll instanceof CoCDiceRoll;
}

export function isFARRoll(roll: DiceRollResult): roll is FARRoll {
    return roll instanceof FARRoll;
}