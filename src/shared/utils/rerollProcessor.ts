/**
 * 振り直し処理を行うユーティリティ
 */

import { isValidated, calculateOptimalValue, generateOptimalDetails, clearValidation } from './statusValidator';
import { extractDiceExpression } from './diceExpressionUtils';
import { DiceService } from '../../domain/services/DiceService';
import { DiceExpression } from '../../domain/value-objects/DiceExpression';
import { StatusServiceFactory } from '../../domain/services/status/StatusServiceFactory';
import { StatusResultDto } from '../../application/dto/StatusDto';

/**
 * 振り直し結果の型
 */
export interface RerollResult {
    value: number;
    details: string;
}

/**
 * ステータスの振り直しを処理する
 * @param selectedStat 選択されたステータス
 * @param statusData ステータスデータ
 * @param messageId メッセージID
 * @returns 振り直し結果
 */
export function processReroll(
    selectedStat: string,
    statusData: StatusResultDto,
    messageId: string
): RerollResult {
    // 検証状態の確認
    if (isValidated(messageId)) {
        // 最適化された値を計算
        const optimalValue = calculateOptimalValue(selectedStat, statusData.version, messageId);
        
        // 値が-1の場合は範囲外なので通常の振り直しを実行
        if (optimalValue === -1) {
            // 通常の振り直し処理へ
        } else {
            const details = generateOptimalDetails(selectedStat, optimalValue);
            
            // 検証状態をクリア
            clearValidation(messageId);
            
            return {
                value: optimalValue,
                details: details
            };
        }
    }
    
    // ステータス詳細からダイス式を抽出
    const currentDetails = statusData.primaryStatsDetails[selectedStat];
    const customDiceExpression = extractDiceExpression(currentDetails);
    
    if (customDiceExpression) {
        // カスタムダイス式が設定されている場合はそれを使用
        const diceService = new DiceService();
        const expression = new DiceExpression(customDiceExpression);
        const roll = diceService.roll(expression);
        
        return {
            value: roll.getTotal(),
            details: roll.getDetailedExpression().replace(customDiceExpression + ' ＞ ', '')
        };
    }
    
    // 通常の振り直し
    const statusService = StatusServiceFactory.create(statusData.version);
    return statusService.rollIndividualStat(selectedStat);
}