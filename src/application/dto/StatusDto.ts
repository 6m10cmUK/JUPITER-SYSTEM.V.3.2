/**
 * CoC TRPG のバージョン型定義
 */
export type CoCVersion = '6' | '7';

/**
 * ステータスコマンドで使用される型文字列
 */
export type StatusType = 'ver6' | 'ver7';

/**
 * ステータスコマンドのオプション型定義
 */
export interface StatusCommandOptions {
    readonly type: StatusType;
    readonly name: string | null;
    readonly custom: boolean | null;
}

/**
 * ステータス生成リクエストのDTO
 */
export interface StatusGenerationDto {
    version: CoCVersion;
    characterName: string;
    userId: string;
    messageId: string;
}

/**
 * CoC TRPG の二次ステータス定義
 */
export interface SecondaryStats {
    /** ヒットポイント */
    HP: number;
    /** マジックポイント */
    MP: number;
    /** 正気度 */
    SAN: number;
    /** ダメージボーナス（文字列形式: "+1D4", "±0" など） */
    DB: string;
    /** 基礎職業ポイント */
    JobPoints: number;
    /** 興味ポイント */
    InterestPoints: number;
    /** 幸運（6版）またはラック（7版） */
    LUC?: number;
    /** 知識 */
    KNW?: number;
    /** アイデア */
    IDA?: number;
    /** 移動力（7版のみ） */
    MOV?: number;
    /** ビルド（7版のみ） */
    BUILD?: number;
}

/**
 * ステータス生成結果のDTO
 */
export interface StatusResultDto {
    version: CoCVersion;
    characterName: string;
    primaryStats: Record<string, number>;
    primaryStatsDetails: Record<string, string>;
    secondaryStats: SecondaryStats;
    rerollCount: number;
    history: string;
}

/**
 * ステータス生成エラーの型定義
 */
export class StatusGenerationError extends Error {
    constructor(
        message: string,
        public readonly code: 'INVALID_VERSION' | 'VALIDATION_FAILED' | 'GENERATION_ERROR'
    ) {
        super(message);
        this.name = 'StatusGenerationError';
    }
}