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

export interface NinpoSearchCriteria {
    query: string;
    searchType: 'all' | 'name' | 'type' | 'specialty' | 'category';
    category: 'hanyo' | 'hasuba'; // 汎用、斜歯
    page: number;
    ninpoCategory?: string; // 忍法カテゴリー（汎用忍法、流派忍法等）
}

export interface NinpoDisplayData {
    title: string;
    ninpos: NinpoData[];
    currentPage: number;
    maxPage: number;
    categoryPages?: Map<string, number>; // カテゴリーごとのページ数
    currentCategory?: string; // 現在表示中のカテゴリー
    searchType?: 'all' | 'name' | 'type' | 'specialty' | 'category'; // 検索タイプ
}