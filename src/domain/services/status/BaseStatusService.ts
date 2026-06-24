import { rollDice } from '../../utils/dice';
import { StatusVersion, BaseStatusData, StatusRollResult } from '../../../shared/interfaces/StatusVersion';
import { SecondaryStats } from '../../../application/dto/StatusDto';

export abstract class BaseStatusService implements StatusVersion {
    abstract version: '6' | '7';
    abstract stats: string[];
    
    abstract getStatFormula(statName: string): { count: number; sides: number; modifier: number };
    abstract getMultiplier(): number;
    
    rollStat(statName: string): { total: number; rolls: number[] } {
        const formula = this.getStatFormula(statName);
        const rolls = rollDice(formula.count, formula.sides);
        const baseTotal = rolls.reduce((sum, val) => sum + val, 0) + formula.modifier;
        const total = Math.floor(baseTotal * this.getMultiplier());
        
        return { total, rolls };
    }
    
    rollIndividualStat(statName: string): { value: number; details: string } {
        const result = this.rollStat(statName);
        const formula = this.getStatFormula(statName);
        
        // 修正値がある場合は含める
        let details: string;
        if (formula.modifier > 0) {
            details = `(${result.rolls.join(',')})+${formula.modifier}`;
        } else {
            details = `(${result.rolls.join(',')})`;
        }
        
        return {
            value: result.total,
            details
        };
    }
    
    rollAllStats(): StatusRollResult & { details: Record<string, string> } {
        const stats: BaseStatusData = {};
        const details: Record<string, string> = {};
        
        for (const stat of this.stats) {
            const result = this.rollStat(stat);
            const formula = this.getStatFormula(stat);
            stats[stat] = result.total;
            
            // 修正値がある場合は含める
            if (formula.modifier > 0) {
                details[stat] = `(${result.rolls.join(',')})+${formula.modifier}`;
            } else {
                details[stat] = `(${result.rolls.join(',')})`;
            }
        }
        
        return { stats, version: this.version, details };
    }
    
    abstract calculateSecondaryStats(primaryStats: Record<string, number>): SecondaryStats;
    abstract getDamageBonus(str: number, siz: number): string;
    
    protected calculateDamageBonusValue(total: number): string {
        if (total <= 12) return '-1d6';
        if (total <= 16) return '-1d4';
        if (total <= 24) return '0';
        if (total <= 32) return '+1d4';
        if (total <= 40) return '+1d6';
        if (total <= 56) return '+2d6';
        if (total <= 72) return '+3d6';
        if (total <= 88) return '+4d6';
        
        const extraDice = Math.floor((total - 88) / 16) + 4;
        return `+${extraDice}d6`;
    }
}