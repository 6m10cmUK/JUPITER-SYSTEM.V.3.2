/**
 * 後方互換のための再エクスポートラッパー
 * 新規コードでは RerollStatusUseCase を直接使用すること
 */

import { RerollStatusUseCase, RerollResult } from '../../application/use-cases/status/RerollStatusUseCase';
import { StatusResultDto } from '../../application/dto/StatusDto';

export type { RerollResult };

const useCase = new RerollStatusUseCase();

export function processReroll(
    selectedStat: string,
    statusData: StatusResultDto,
    messageId: string
): RerollResult {
    return useCase.reroll(selectedStat, statusData, messageId);
}
