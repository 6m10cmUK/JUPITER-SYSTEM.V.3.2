import fs from 'fs';
import path from 'path';
import { NinpoData, NinpoSearchCriteria } from '../../application/dto/NinpoDto';
import { getDataDir } from '../../shared/utils/dataPath';

interface NinpoFile {
    name: string;
    data: NinpoData[];
}

export class NinpoService {
    private allNinpo: Map<string, NinpoData[]> = new Map(); // ファイルID -> 忍法データ
    private ninpoMetadata: Map<string, string> = new Map(); // ファイルID -> 表示名

    constructor() {
        this.loadNinpoData();
    }

    private loadNinpoData(): void {
        const ninpoDir = path.join(getDataDir(), 'shinobigami', 'ninpo');
        
        try {
            const files = fs.readdirSync(ninpoDir).filter(file => file.endsWith('.json'));
            
            files.forEach(filename => {
                const filePath = path.join(ninpoDir, filename);
                const fileId = filename.replace('.json', '');
                
                try {
                    const fileContent: NinpoFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    
                    // sourceプロパティを追加
                    const ninpoData = fileContent.data.map(ninpo => ({ ...ninpo, source: fileContent.name }));
                    
                    this.allNinpo.set(fileId, ninpoData);
                    this.ninpoMetadata.set(fileId, fileContent.name);
                } catch (error) {
                    console.error(`Error loading ninpo file ${filename}:`, error);
                }
            });
        } catch (error) {
            console.error('Error reading ninpo directory:', error);
        }
    }

    searchNinpo(criteria: NinpoSearchCriteria): NinpoData[] {
        const { query, searchType, category } = criteria;
        
        // カテゴリーに応じたデータソースを選択
        let targetNinpos: NinpoData[] = [];
        if (category === 'all' as any) {
            // 全カテゴリーから検索
            targetNinpos = Array.from(this.allNinpo.values()).flat();
        } else {
            // 特定のファイルIDから検索
            const ninpoData = this.allNinpo.get(category);
            if (ninpoData) {
                targetNinpos = ninpoData;
            }
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
                case 'effect':
                    return ninpo.description.toLowerCase().includes(query.toLowerCase());
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
            const pageCount = Math.max(1, Math.ceil(categoryNinpos.length / itemsPerPage)); // 最低1ページは確保
            categoryMap.set(category, {
                ninpos: categoryNinpos,
                pageCount: pageCount
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
            case 'effect':
                baseTitle = `効果検索：${query}`;
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
