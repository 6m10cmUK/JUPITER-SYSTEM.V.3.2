import { BaseStatusService } from './BaseStatusService';
import { SecondaryStats } from '../../../application/dto/StatusDto';

export class StatusServiceVer7 extends BaseStatusService {
    version: '6' | '7' = '7';
    stats = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'LUC'];
    
    protected getMultiplier(): number {
        return 5; // Ver7は5倍
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
            HP: Math.ceil((primaryStats.CON + primaryStats.SIZ) / 10),
            MP: Math.ceil(primaryStats.POW / 5),
            SAN: primaryStats.POW,
            DB: this.getDamageBonus(primaryStats.STR, primaryStats.SIZ),
            JobPoints: primaryStats.EDU * 4,
            InterestPoints: primaryStats.INT * 2,
            KNW: primaryStats.EDU,
            IDA: primaryStats.INT,
            MOV: this.calculateMovement(primaryStats),
            BUILD: this.getBuild(primaryStats.STR, primaryStats.SIZ)
        };
    }
    
    getDamageBonus(str: number, siz: number): string {
        const total = str + siz;
        if (total <= 64) return '-2';
        if (total <= 84) return '-1';
        if (total <= 124) return '0';
        if (total <= 164) return '+1d4';
        if (total <= 204) return '+1d6';
        if (total <= 284) return '+2d6';
        if (total <= 364) return '+3d6';
        if (total <= 444) return '+4d6';
        if (total <= 524) return '+5d6';
        
        const extraDice = Math.floor((total - 524) / 80) + 5;
        return `+${extraDice}d6`;
    }
    
    getBuild(str: number, siz: number): number {
        const total = str + siz;
        if (total <= 64) return -2;
        if (total <= 84) return -1;
        if (total <= 124) return 0;
        if (total <= 164) return 1;
        if (total <= 204) return 2;
        if (total <= 284) return 3;
        if (total <= 364) return 4;
        if (total <= 444) return 5;
        if (total <= 524) return 6;
        
        return Math.floor((total - 524) / 80) + 6;
    }
    
    private calculateMovement(stats: Record<string, number>): number {
        if (stats.DEX < stats.SIZ && stats.STR < stats.SIZ) return 7;
        if (stats.DEX > stats.SIZ || stats.STR > stats.SIZ) return 9;
        if (stats.DEX > stats.SIZ && stats.STR > stats.SIZ) return 9;
        return 8;
    }
}