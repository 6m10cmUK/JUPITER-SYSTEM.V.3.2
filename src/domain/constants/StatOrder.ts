export const STAT_ORDER_V6 = ['STR','CON','POW','DEX','APP','SIZ','INT','EDU'] as const;
export const STAT_ORDER_V7 = [...STAT_ORDER_V6, 'LUC'] as const;
export type StatType = typeof STAT_ORDER_V7[number];
export function getStatOrder(version: string): readonly string[] {
    return version === '6' ? STAT_ORDER_V6 : STAT_ORDER_V7;
}
