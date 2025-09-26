import { CoCVersion, StatusType, StatusGenerationError } from '../../application/dto/StatusDto';

/**
 * セキュリティ関連のユーティリティクラス
 * 入力サニタイゼーションと検証を提供
 */
export class SecurityUtils {
    /**
     * ステータスコマンドの入力をサニタイズ
     * @param input 生の入力オブジェクト
     * @returns サニタイズされた安全な入力
     */
    static sanitizeStatusInput(input: {
        type: string | null;
        name: string | null;
        custom: boolean | null;
    }): {
        version: CoCVersion;
        name: string;
        showCustomMenu: boolean;
    } {
        // 型検証
        const validTypes = ['ver6', 'ver7'] as const;
        if (!input.type || !validTypes.includes(input.type as StatusType)) {
            throw new StatusGenerationError('無効なバージョンです', 'INVALID_VERSION');
        }
        
        // 名前のサニタイゼーション
        const sanitizedName = this.sanitizeCharacterName(input.name);
        
        return {
            version: input.type === 'ver7' ? '7' : '6',
            name: sanitizedName,
            showCustomMenu: Boolean(input.custom)
        };
    }
    
    /**
     * キャラクター名をサニタイズ
     * @param name 入力された名前
     * @returns サニタイズされた名前
     */
    static sanitizeCharacterName(name: string | null): string {
        if (!name || typeof name !== 'string') {
            return 'キャラクター名';
        }
        
        // 長さ制限
        let sanitized = name.slice(0, 50);
        
        // XSS対策: 危険な文字を除去
        sanitized = sanitized.replace(/[<>]/g, '');
        
        // 制御文字を除去
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        
        // Discordマークダウンのエスケープ（必要に応じて）
        // sanitized = sanitized.replace(/[*_~`|]/g, '\\$&');
        
        // 空文字になった場合はデフォルト値
        if (!sanitized.trim()) {
            return 'キャラクター名';
        }
        
        return sanitized.trim();
    }
    
    /**
     * ユーザーIDの検証
     * @param userId Discord ユーザーID
     * @returns 有効かどうか
     */
    static isValidUserId(userId: string): boolean {
        // Discord ユーザーIDは18-19桁の数字
        return /^\d{17,19}$/.test(userId);
    }
    
    /**
     * メッセージIDの検証
     * @param messageId Discord メッセージID
     * @returns 有効かどうか
     */
    static isValidMessageId(messageId: string): boolean {
        // Discord メッセージIDは18-19桁の数字
        return /^\d{17,19}$/.test(messageId);
    }
}