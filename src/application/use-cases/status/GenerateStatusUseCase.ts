import { StatusGenerationDto, StatusResultDto, SecondaryStats } from '../../dto/StatusDto';
import { StatusServiceFactory } from '../../../domain/services/status/StatusServiceFactory';

export class GenerateStatusUseCase {
    execute(dto: StatusGenerationDto): StatusResultDto {
        const statusService = StatusServiceFactory.create(dto.version);
        const rollResult = statusService.rollAllStats();
        const secondaryStats = statusService.calculateSecondaryStats(rollResult.stats);
        
        return {
            version: dto.version,
            characterName: dto.characterName,
            primaryStats: rollResult.stats,
            primaryStatsDetails: rollResult.details,
            secondaryStats: secondaryStats,
            rerollCount: 0,
            history: ''
        };
    }
    
    rerollStat(
        currentStats: StatusResultDto,
        statName: string
    ): StatusResultDto {
        const statusService = StatusServiceFactory.create(currentStats.version);
        const newRoll = statusService.rollStat(statName);
        
        // 統計を更新
        const updatedPrimaryStats = {
            ...currentStats.primaryStats,
            [statName]: newRoll.total
        };
        
        // 詳細を更新
        const updatedPrimaryStatsDetails = {
            ...currentStats.primaryStatsDetails,
            [statName]: `(${newRoll.rolls.join(',')})`
        };
        
        // 二次統計を再計算
        const updatedSecondaryStats = statusService.calculateSecondaryStats(updatedPrimaryStats);
        
        // 履歴を更新
        const oldValue = currentStats.primaryStats[statName];
        const historyEntry = `${statName}: ${oldValue} → ${newRoll.total}\n`;
        
        return {
            ...currentStats,
            primaryStats: updatedPrimaryStats,
            primaryStatsDetails: updatedPrimaryStatsDetails,
            secondaryStats: updatedSecondaryStats,
            rerollCount: currentStats.rerollCount + 1,
            history: currentStats.history + historyEntry
        };
    }
    
    changeStat(
        currentStats: StatusResultDto,
        statName: string,
        newValue: number
    ): StatusResultDto {
        const statusService = StatusServiceFactory.create(currentStats.version);
        
        // 統計を更新
        const updatedPrimaryStats = {
            ...currentStats.primaryStats,
            [statName]: newValue
        };
        
        // 二次統計を再計算
        const updatedSecondaryStats = statusService.calculateSecondaryStats(updatedPrimaryStats);
        
        // 履歴を更新
        const oldValue = currentStats.primaryStats[statName];
        const historyEntry = `${statName}: ${oldValue} → ${newValue} (手動変更)\n`;
        
        return {
            ...currentStats,
            primaryStats: updatedPrimaryStats,
            secondaryStats: updatedSecondaryStats,
            history: currentStats.history + historyEntry
        };
    }
}