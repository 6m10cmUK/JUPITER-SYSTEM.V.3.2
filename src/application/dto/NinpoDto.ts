export interface NinpoData {
    name: string;
    kana: string;
    category: string;
    type: string;
    target: string;
    range: string;
    cost: string;
    specialty: string;
    description: string;
    correction?: string;
    source?: string; // 流派（汎用忍法、斜歯忍群など）
}

/**
 * 忍法のカテゴリー型定義（型安全）
 */
export type NinpoCategory = 'hanyo' | 'hasuba' | 'haguremono' | 'hirasaka' | 'kurama' | 'oni' | 'otogi';

/**
 * 忍法検索の種別
 */
export type NinpoSearchType = 'all' | 'name' | 'type' | 'specialty' | 'category' | 'effect' | 'random';

export interface NinpoSearchCriteria {
    query: string;
    searchType: NinpoSearchType;
    category: NinpoCategory;
    page: number;
    limit?: number; // ランダム表示件数
    ninpoCategory?: string; // 忍法カテゴリー（汎用忍法、流派忍法等）
}

/**
 * 忍法コマンドのオプション型定義
 */
export interface NinpoCommandOptions {
    readonly subcommand: 'name' | 'type' | 'specialty' | 'all' | 'effect' | 'random';
    readonly query: string;
    readonly category: NinpoCategory;
    readonly count?: number; // random サブコマンド用
}

/**
 * 動的カテゴリー情報
 */
export interface NinpoAvailableCategory {
    /** 表示名 */
    name: string;
    /** 値（ファイル名） */
    value: NinpoCategory;
    /** ファイルパス */
    filePath: string;
    /** 有効かどうか */
    isValid: boolean;
}

export interface NinpoDisplayData {
    title: string;
    ninpos: NinpoData[];
    currentPage: number;
    maxPage: number;
    categoryPages?: Map<string, number>; // カテゴリーごとのページ数
    currentCategory?: string; // 現在表示中のカテゴリー
    searchType?: NinpoSearchType; // 検索タイプ
}

/**
 * 忍法システム基底エラー
 */
export class NinpoSystemError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly category?: string,
        public readonly query?: string
    ) {
        super(message);
        this.name = 'NinpoSystemError';
    }
}

/**
 * 忍法検索エラー
 */
export class NinpoSearchError extends NinpoSystemError {
    constructor(
        category: string,
        query: string,
        details: string
    ) {
        super(`Ninpo search failed in ${category} for "${query}": ${details}`, 'SEARCH_ERROR', category, query);
        this.name = 'NinpoSearchError';
    }
}

/**
 * 忍法カテゴリーエラー
 */
export class NinpoCategoryError extends NinpoSystemError {
    constructor(
        category: string,
        details: string
    ) {
        super(`Invalid ninpo category "${category}": ${details}`, 'CATEGORY_ERROR', category);
        this.name = 'NinpoCategoryError';
    }
}

/**
 * 忍法データ読み込みエラー
 */
export class NinpoDataError extends NinpoSystemError {
    constructor(
        filePath: string,
        details: string
    ) {
        super(`Failed to load ninpo data from "${filePath}": ${details}`, 'DATA_ERROR');
        this.name = 'NinpoDataError';
    }
}