import fs from 'fs';
import path from 'path';
import { NinpoData, NinpoSearchCriteria } from '../../application/dto/NinpoDto';

interface NinpoFile {
    name: string;
    data: NinpoData[];
}

export class NinpoService {
    private hanyoNinpo: NinpoData[] = [];
    private hasubaNinpo: NinpoData[] = [];
    private ninpoMetadata: Map<string, string> = new Map(); // カテゴリ値 -> 表示名

    constructor() {
        this.loadNinpoData();
    }

    private loadNinpoData(): void {
        const hanyoPath = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo', 'hanyo.json');
        const hasubaPath = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo', 'hasuba.json');
        
        const hanyoFile: NinpoFile = JSON.parse(fs.readFileSync(hanyoPath, 'utf8'));
        const hasubaFile: NinpoFile = JSON.parse(fs.readFileSync(hasubaPath, 'utf8'));
        
        // sourceプロパティを追加
        this.hanyoNinpo = hanyoFile.data.map(ninpo => ({ ...ninpo, source: hanyoFile.name }));
        this.hasubaNinpo = hasubaFile.data.map(ninpo => ({ ...ninpo, source: hasubaFile.name }));
        
        this.ninpoMetadata.set('hanyo', hanyoFile.name);
        this.ninpoMetadata.set('hasuba', hasubaFile.name);
    }

    searchNinpo(criteria: NinpoSearchCriteria): NinpoData[] {
        const { query, searchType, category } = criteria;
        
        // カテゴリーに応じたデータソースを選択
        let targetNinpos: NinpoData[] = [];
        if (category === 'all' as any) {
            // 全カテゴリーから検索
            targetNinpos = [...this.hanyoNinpo, ...this.hasubaNinpo];
        } else if (category === 'hanyo') {
            targetNinpos = this.hanyoNinpo;
        } else if (category === 'hasuba') {
            targetNinpos = this.hasubaNinpo;
        }

        if (searchType === 'all') {
            return targetNinpos;
        }

        // 各フィールドで検索
        return targetNinpos.filter((ninpo: NinpoData) => {
            switch (searchType) {
                case 'name':
                    return ninpo.name.toLowerCase().includes(query.toLowerCase()) ||
                           ninpo.kana.toLowerCase().includes(query.toLowerCase());
                case 'type':
                    return ninpo.type.toLowerCase().includes(query.toLowerCase());
                case 'specialty':
                    return ninpo.specialty.toLowerCase().includes(query.toLowerCase());
                case 'category':
                    return ninpo.category.toLowerCase().includes(query.toLowerCase());
                default:
                    return false;
            }
        });
    }

    // カテゴリーごとにページ数を計算
    getCategoriesWithPageInfo(ninpos: NinpoData[], itemsPerPage: number): Map<string, { ninpos: NinpoData[], pageCount: number }> {
        const categoryMap = new Map<string, { ninpos: NinpoData[], pageCount: number }>();
        
        // カテゴリーごとにグループ化
        const grouped = ninpos.reduce((groups, ninpo) => {
            const category = ninpo.category || '未分類';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(ninpo);
            return groups;
        }, {} as Record<string, NinpoData[]>);
        
        // 各カテゴリーのページ数を計算
        Object.entries(grouped).forEach(([category, categoryNinpos]) => {
            categoryMap.set(category, {
                ninpos: categoryNinpos,
                pageCount: Math.ceil(categoryNinpos.length / itemsPerPage)
            });
        });
        
        return categoryMap;
    }

    getTitle(criteria: NinpoSearchCriteria): string {
        const { query, searchType, category } = criteria;
        
        let baseTitle = '';
        switch (searchType) {
            case 'all':
                baseTitle = '忍法一覧';
                break;
            case 'name':
                baseTitle = `忍法名検索：${query}`;
                break;
            case 'type':
                baseTitle = `忍法種別検索：${query}`;
                break;
            case 'specialty':
                baseTitle = `特技検索：${query}`;
                break;
            case 'category':
                baseTitle = `分類検索：${query}`;
                break;
            default:
                baseTitle = '忍法一覧';
        }

        // カテゴリーの接頭辞を追加
        if (category === 'all' as any) {
            return `【全流派】${baseTitle}`;
        }
        const categoryName = this.ninpoMetadata.get(category);
        if (categoryName) {
            return `【${categoryName}】${baseTitle}`;
        }
        
        return baseTitle;
    }
    
    // 静的メソッドとして公開（ninpo-command.tsから使用）
    static getNinpoMetadata(): Map<string, string> {
        const service = new NinpoService();
        return service.ninpoMetadata;
    }
}