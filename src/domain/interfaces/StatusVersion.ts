import { SecondaryStats } from '../../application/dto/StatusDto';

export interface StatusVersion {
    version: '6' | '7';
    stats: string[];
    rollStat(statName: string): { total: number; rolls: number[] };
    calculateSecondaryStats(primaryStats: Record<string, number>): SecondaryStats;
    getDamageBonus(str: number, siz: number): string;
    getBuild?(str: number, siz: number): number; // Ver7のみ
}

export interface BaseStatusData {
    [key: string]: number;
}

export interface StatusRollResult {
    stats: BaseStatusData;
    version: '6' | '7';
}