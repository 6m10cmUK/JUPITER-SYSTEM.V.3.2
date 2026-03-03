/**
 * ステータス振り直しユースケース
 */

import { ValidationStateService } from '../../services/ValidationStateService';
import { StatValueCalculator } from '../../../domain/services/status/StatValueCalculator';
import { DiceExpressionParser } from '../../../domain/services/DiceExpressionParser';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceExpression } from '../../../domain/value-objects/DiceExpression';
import { StatusServiceFactory } from '../../../domain/services/status/StatusServiceFactory';
import { StatusResultDto } from '../../dto/StatusDto';
import { unescapeDiscordMarkdown } from '../../../shared/utils/discordUtils';

/**
 * 振り直し結果の型
 */
export interface RerollResult {
    value: number;
    details: string;
}

export class RerollStatusUseCase {
    constructor(private readonly diceService: DiceService = new DiceService()) {}

    /**
     * ステータスの振り直しを処理する
     * @param selectedStat 選択されたステータス
     * @param statusData ステータスデータ
     * @param messageId メッセージID
     * @returns 振り直し結果
     */
    reroll(
        selectedStat: string,
        statusData: StatusResultDto,
        messageId: string
    ): RerollResult {
        // 検証状態の確認
        if (ValidationStateService.isValidated(messageId)) {
            // 最適化された値を計算
            const optimalValue = StatValueCalculator.calculateOptimalValue(selectedStat, statusData.version, messageId, ValidationStateService);

            // 値が-1の場合は範囲外なので通常の振り直しを実行
            if (optimalValue !== -1 && StatValueCalculator.isValueInValidRange(selectedStat, statusData.version, optimalValue)) {
                const details = StatValueCalculator.generateOptimalDetails(selectedStat, optimalValue);

                // 検証状態をクリア
                ValidationStateService.clearValidation(messageId);

                return {
                    value: optimalValue,
                    details: details
                };
            }
        }

        // ステータス詳細からダイス式を抽出
        const currentDetails = statusData.primaryStatsDetails[selectedStat];
        const rawDiceExpression = DiceExpressionParser.extractDiceExpression(currentDetails);
        const customDiceExpression = rawDiceExpression ? unescapeDiscordMarkdown(rawDiceExpression) : null;

        if (customDiceExpression) {
            // カスタムダイス式が設定されている場合はそれを使用
            const expression = new DiceExpression(customDiceExpression);
            const roll = this.diceService.roll(expression);

            return {
                value: roll.getTotal(),
                details: roll.getDetailedExpression().replace(customDiceExpression + ' ＞ ', '')
            };
        }

        // 通常の振り直し
        const statusService = StatusServiceFactory.create(statusData.version);
        return statusService.rollIndividualStat(selectedStat);
    }

    /**
     * 振り直し確定処理
     * @param statusData ステータスデータ
     * @param statType ステータスタイプ
     * @param rerollResult 振り直し結果
     * @param details 詳細文字列
     * @param rerollCount 振り直し回数
     * @param customDiceExpression カスタムダイス式（オプション）
     * @returns 更新済みStatusResultDto
     */
    confirmReroll(
        statusData: StatusResultDto,
        statType: string,
        rerollResult: number,
        details: string,
        rerollCount: number,
        customDiceExpression?: string | null,
        rawDetails?: string,
        rawDiceExpression?: string | null
    ): StatusResultDto {
        const statusService = StatusServiceFactory.create(statusData.version);

        // primaryStats更新
        const updatedPrimaryStats = {
            ...statusData.primaryStats,
            [statType]: rerollResult
        };

        // details更新（エスケープ済みの値を使用）
        const updatedDetails = {
            ...statusData.primaryStatsDetails,
            [statType]: customDiceExpression
                ? `${customDiceExpression}: ${details}`
                : details
        };

        // 二次ステータス再計算
        const updatedSecondaryStats = statusService.calculateSecondaryStats(updatedPrimaryStats);

        // 履歴追記（生の値を使用）
        const oldValue = statusData.primaryStats[statType];
        let history = statusData.history;
        if (history && history.length > 1) {
            history += "\n";
        }
        const historyRawDetails = rawDetails ?? details;
        const historyRawDice = rawDiceExpression ?? customDiceExpression;
        if (historyRawDice) {
            history += `${statType}: ${oldValue} → ${rerollResult} ${historyRawDetails} [${historyRawDice}]`;
        } else {
            history += `${statType}: ${oldValue} → ${rerollResult} ${historyRawDetails}`;
        }

        return {
            ...statusData,
            primaryStats: updatedPrimaryStats,
            primaryStatsDetails: updatedDetails,
            secondaryStats: updatedSecondaryStats,
            rerollCount: rerollCount,
            history: history
        };
    }
}
