import { BaseStatusService } from './BaseStatusService';
import { SecondaryStats } from '../../../application/dto/StatusDto';

export class StatusServiceVer6 extends BaseStatusService {
    version: '6' | '7' = '6';
    stats = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU'];
    
    protected getMultiplier(): number {
        return 1; // Ver6は倍率なし
    }
    
    protected getStatFormula(statName: string): { count: number; sides: number; modifier: number } {
        switch (statName) {
            case 'SIZ':
            case 'INT':
                return { count: 2, sides: 6, modifier: 6 };
            case 'EDU':
                return { count: 3, sides: 6, modifier: 3 };
            default:
                return { count: 3, sides: 6, modifier: 0 };
        }
    }
    
    calculateSecondaryStats(primaryStats: Record<string, number>): SecondaryStats {
        return {
            HP: Math.ceil((primaryStats.CON + primaryStats.SIZ) / 2),
            MP: primaryStats.POW,
            SAN: primaryStats.POW * 5,
            DB: this.getDamageBonus(primaryStats.STR, primaryStats.SIZ),
            JobPoints: primaryStats.EDU * 20,
            InterestPoints: primaryStats.INT * 10,
            LUC: primaryStats.POW * 5,
            KNW: primaryStats.EDU * 5,
            IDA: primaryStats.INT * 5,
            MOV: this.calculateMovement(primaryStats)
        };
    }
    
    getDamageBonus(str: number, siz: number): string {
        return this.calculateDamageBonusValue(str + siz);
    }
    
    private calculateMovement(stats: Record<string, number>): number {
        if (stats.DEX < stats.SIZ && stats.STR < stats.SIZ) return 7;
        if (stats.DEX > stats.SIZ && stats.STR > stats.SIZ) return 9;
        return 8;
    }
}