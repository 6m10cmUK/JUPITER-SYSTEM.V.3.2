/**
 * ステータス値の入れ替えユースケース
 */

import { StatusResultDto } from '../../dto/StatusDto';
import { StatusServiceFactory } from '../../../domain/services/status/StatusServiceFactory';

export class SwapStatsUseCase {
    /**
     * 2つのステータスの値を入れ替える
     * @param statusData ステータスデータ
     * @param beforeStat 入れ替え元のステータス名
     * @param afterStat 入れ替え先のステータス名
     * @returns 更新済みStatusResultDto
     */
    execute(statusData: StatusResultDto, beforeStat: string, afterStat: string): StatusResultDto {
        // 指定されたステータスがprimaryStatsに存在するかチェック
        if (!(beforeStat in statusData.primaryStats) || !(afterStat in statusData.primaryStats)) {
            throw new Error(`無効なステータス名: ${beforeStat}, ${afterStat}`);
        }
        if (!(beforeStat in statusData.primaryStatsDetails) || !(afterStat in statusData.primaryStatsDetails)) {
            throw new Error(`ステータス詳細が見つかりません: ${beforeStat}, ${afterStat}`);
        }

        // 値の交換
        const updatedPrimaryStats = {
            ...statusData.primaryStats,
            [beforeStat]: statusData.primaryStats[afterStat],
            [afterStat]: statusData.primaryStats[beforeStat]
        };

        // 詳細の交換
        const updatedDetails = {
            ...statusData.primaryStatsDetails,
            [beforeStat]: statusData.primaryStatsDetails[afterStat],
            [afterStat]: statusData.primaryStatsDetails[beforeStat]
        };

        // 二次ステータス再計算
        const statusService = StatusServiceFactory.create(statusData.version);
        const updatedSecondaryStats = statusService.calculateSecondaryStats(updatedPrimaryStats);

        // 履歴追記
        let history = statusData.history;
        if (history && history.length > 0) {
            history += "\n";
        }
        history += `${beforeStat}: ${updatedPrimaryStats[beforeStat]} ⇄ ${afterStat}: ${updatedPrimaryStats[afterStat]}`;

        return {
            ...statusData,
            primaryStats: updatedPrimaryStats,
            primaryStatsDetails: updatedDetails,
            secondaryStats: updatedSecondaryStats,
            history: history
        };
    }
}
