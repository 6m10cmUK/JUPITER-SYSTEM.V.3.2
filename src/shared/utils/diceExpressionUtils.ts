/**
 * 後方互換のための再エクスポートラッパー
 * 新規コードでは DiceExpressionParser を直接使用すること
 */

import { DiceExpressionParser } from '../../domain/services/DiceExpressionParser';

export function extractDiceExpression(details: string): string | null {
    return DiceExpressionParser.extractDiceExpression(details);
}

export function extractDiceResult(details: string): string {
    return DiceExpressionParser.extractDiceResult(details);
}
