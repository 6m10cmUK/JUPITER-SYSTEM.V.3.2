import { ChatInputCommandInteraction, Interaction, EmbedBuilder } from 'discord.js';

/**
 * 統一されたコマンドハンドラーインターフェース
 * 全てのコマンドハンドラーが準拠すべき標準パターン
 */
export interface CommandHandler<TRequest = any, TResponse = any> {
    /**
     * コマンド処理を実行
     * @param interaction Discord インタラクション
     */
    handle(interaction: ChatInputCommandInteraction): Promise<void>;
}

/**
 * 統一されたユースケースインターフェース
 * ビジネスロジックの標準パターン
 */
export interface UseCase<TRequest, TResponse> {
    /**
     * ユースケースを実行
     * @param request リクエストデータ
     * @returns レスポンスデータ
     */
    execute(request: TRequest): Promise<TResponse>;
}

/**
 * 統一されたEmbedフォーマッターインターフェース
 * 表示ロジックの標準パターン
 */
export interface EmbedFormatter<TData> {
    /**
     * データをEmbedにフォーマット
     * @param data フォーマット対象データ
     * @param interaction Discord インタラクション
     * @returns フォーマット済みEmbed
     */
    format(data: TData, interaction: Interaction): Promise<EmbedBuilder>;
}

/**
 * 統一されたバリデーターインターフェース
 * 入力検証の標準パターン
 */
export interface Validator<TInput, TOutput = TInput> {
    /**
     * 入力を検証
     * @param input 検証対象
     * @returns 検証結果
     */
    validate(input: TInput): ValidationResult<TOutput>;
}

/**
 * バリデーション結果の統一型
 */
export interface ValidationResult<T> {
    /** 検証成功フラグ */
    isValid: boolean;
    /** 検証済みデータ（成功時） */
    data?: T;
    /** エラー情報（失敗時） */
    error?: ValidationError;
    /** エラーメッセージ（失敗時） */
    errorMessage?: string;
}

/**
 * 統一されたバリデーションエラー
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly field?: string
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * コマンドの基本メタデータ
 */
export interface CommandMetadata {
    /** コマンド名 */
    name: string;
    /** 説明 */
    description: string;
    /** カテゴリー */
    category: 'dice' | 'character' | 'utility' | 'game' | 'admin';
    /** バージョン */
    version: string;
    /** 権限レベル */
    permissions?: 'user' | 'admin' | 'owner';
}