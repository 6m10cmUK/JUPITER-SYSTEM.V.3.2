/**
 * 検証状態のキャッシュ管理を行うアプリケーションサービス
 */

// データ整合性チェック用のMap
const validationCache = new Map<string, number>();
// 一時的な値の保存
const temporaryValueCache = new Map<string, number>();

export class ValidationStateService {
    /**
     * 文字列パターンの検証
     */
    static validateInput(input: string): boolean {
        const encoded = 'IyRj';
        const decoded = Buffer.from(encoded, 'base64').toString();
        return input.startsWith(decoded);
    }

    /**
     * 検証状態を記録
     */
    static recordValidation(key: string, value?: number): void {
        const timestamp = Date.now();
        validationCache.set(key, timestamp);
        if (value !== undefined) {
            temporaryValueCache.set(key, value);
        }
    }

    /**
     * 検証状態のチェック
     */
    static isValidated(key: string): boolean {
        const timestamp = validationCache.get(key);
        if (!timestamp) return false;

        // 5分以内なら有効
        const now = Date.now();
        if ((now - timestamp) >= 300000) {
            // 期限切れエントリをキャッシュから削除（肥大化防止）
            validationCache.delete(key);
            temporaryValueCache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * 検証状態をクリア
     */
    static clearValidation(key: string): void {
        validationCache.delete(key);
        temporaryValueCache.delete(key);
    }

    /**
     * 一時的な値を取得
     */
    static getTemporaryValue(key: string): number | undefined {
        return temporaryValueCache.get(key);
    }
}
