import { DomainError } from './DomainError';

/** 名言管理エラーコード */
export type MeigenErrorCode = 'NO_GUILD' | 'NOT_FOUND' | 'INVALID_INPUT' | 'OPERATION_FAILED';

/**
 * 名言管理エラー
 */
export class MeigenError extends DomainError {
    constructor(
        message: string,
        public readonly code: MeigenErrorCode
    ) {
        super(message);
    }
}
