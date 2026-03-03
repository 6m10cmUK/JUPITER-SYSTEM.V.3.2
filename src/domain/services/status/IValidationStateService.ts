/**
 * 検証状態管理のドメインインターフェース
 */
export interface IValidationStateService {
    getTemporaryValue(key: string): number | undefined;
    clearValidation(key: string): void;
}
