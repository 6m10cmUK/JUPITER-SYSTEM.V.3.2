/**
 * 特徴表関連のDTO定義
 */

/**
 * 個別特徴のデータ構造
 */
export interface FeatureData {
    /** 特徴名 */
    name: string;
    /** 特徴の詳細説明 */
    detail: string;
}

/**
 * 特徴表の構造（6x10の配列）
 */
export type FeatureTable = FeatureData[][];

/**
 * 特徴生成リクエスト
 */
export interface FeatureGenerationRequest {
    /** 生成する特徴の数 */
    count: number;
    /** ユーザーID */
    userId: string;
    /** ギルドID */
    guildId?: string;
}

/**
 * 特徴生成結果
 */
export interface FeatureGenerationResult {
    /** 生成された特徴のリスト */
    features: GeneratedFeature[];
    /** 事前設定値が使用されたかどうか */
    usedPredefinedValues: boolean;
}

/**
 * 生成された特徴の情報
 */
export interface GeneratedFeature {
    /** ダイス目（1-6） */
    diceIndex: number;
    /** 詳細番号（1-10） */
    detailNumber: number;
    /** 特徴データ */
    feature: FeatureData;
    /** 事前設定値かどうか */
    isPredefined: boolean;
}

/**
 * 特徴システム基底エラー
 */
export class FeatureSystemError extends Error {
    constructor(
        message: string, 
        public readonly code: string
    ) {
        super(message);
        this.name = 'FeatureSystemError';
    }
}

/**
 * 特徴生成エラー
 */
export class FeatureGenerationError extends FeatureSystemError {
    constructor(
        message: string,
        code: 'DATA_LOAD_ERROR' | 'INVALID_COUNT' | 'GENERATION_ERROR'
    ) {
        super(message, code);
        this.name = 'FeatureGenerationError';
    }
}

/**
 * 特徴データ検証エラー
 */
export class FeatureValidationError extends FeatureSystemError {
    constructor(
        public readonly featureIndex: number,
        public readonly detailIndex: number,
        details: string
    ) {
        super(`Feature validation failed at [${featureIndex}][${detailIndex}]: ${details}`, 'VALIDATION_ERROR');
        this.name = 'FeatureValidationError';
    }
}