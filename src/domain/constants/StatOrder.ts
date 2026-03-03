export const STAT_ORDER_V6 = ['STR','CON','POW','DEX','APP','SIZ','INT','EDU'] as const;
export const STAT_ORDER_V7 = [...STAT_ORDER_V6, 'LUC'] as const;
export type StatType = typeof STAT_ORDER_V7[number];
export function getStatOrder(version: string): readonly string[] {
    if (version === '6') return STAT_ORDER_V6;
    if (version === '7') return STAT_ORDER_V7;
    throw new Error(`Unknown version: ${version}`);
}
