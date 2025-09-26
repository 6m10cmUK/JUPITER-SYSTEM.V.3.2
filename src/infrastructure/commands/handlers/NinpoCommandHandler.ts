import { ChatInputCommandInteraction } from 'discord.js';
import { NinpoEmbedFormatter } from '../../../presentation/formatters/NinpoEmbedFormatter';
import { 
    NinpoSearchCriteria, 
    NinpoCategory, 
    NinpoAvailableCategory,
    NinpoCommandOptions 
} from '../../../application/dto/NinpoDto';
import fs from 'fs';
import path from 'path';

/**
 * 忍法コマンドハンドラー
 * 忍法検索・生成のビジネスロジックを適切に分離
 */
export class NinpoCommandHandler {
    private readonly formatter: NinpoEmbedFormatter;

    constructor() {
        this.formatter = new NinpoEmbedFormatter();
    }

    /**
     * 忍法検索・生成処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        
        await interaction.deferReply();

        try {
            if (subcommand === 'random') {
                await this.handleRandomNinpo(interaction);
            } else {
                await this.handleNinpoSearch(interaction, subcommand);
            }
        } catch (error) {
            await interaction.editReply({
                content: '忍法検索の処理中にエラーが発生しました。'
            });
            console.error('Ninpo command error:', {
                error: error instanceof Error ? error.message : String(error),
                subcommand,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }

    /**
     * ランダム忍法生成処理
     * @param interaction Discord インタラクション
     */
    private async handleRandomNinpo(interaction: ChatInputCommandInteraction): Promise<void> {
        const count = interaction.options.getInteger('count') ?? 1;
        const category = interaction.options.getString('category') ?? '';
        
        const criteria: NinpoSearchCriteria = {
            query: category,
            searchType: 'all',
            category: 'hanyo',
            page: count
        };
        
        const display = await this.formatter.format(interaction, criteria);
        await interaction.editReply(display);
    }

    /**
     * 忍法検索処理
     * @param interaction Discord インタラクション
     * @param subcommand サブコマンド種別
     */
    private async handleNinpoSearch(
        interaction: ChatInputCommandInteraction,
        subcommand: string
    ): Promise<void> {
        const query = interaction.options.getString('query') ?? '';
        const criteria: NinpoSearchCriteria = {
            query,
            searchType: subcommand as NinpoSearchCriteria['searchType'],
            category: 'hanyo',
            page: 1
        };
        
        const display = await this.formatter.format(interaction, criteria);
        await interaction.editReply(display);
    }

    /**
     * 忍法カテゴリーを型安全に取得
     * @returns 利用可能なカテゴリー情報
     */
    static getNinpoCategories(): NinpoAvailableCategory[] {
        const ninpoDir = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo');
        const categories: NinpoAvailableCategory[] = [];
        
        // 定義済みカテゴリーのみを処理（型安全）
        const knownCategories: NinpoCategory[] = [
            'hanyo', 'hasuba', 'haguremono', 'hirasaka', 
            'kurama', 'oni', 'otogi'
        ];
        
        try {
            const files = fs.readdirSync(ninpoDir);
            
            for (const category of knownCategories) {
                const fileName = `${category}.json`;
                const filePath = path.join(ninpoDir, fileName);
                const isValid = files.includes(fileName) && fs.existsSync(filePath);
                
                categories.push({
                    name: this.formatCategoryName(category),
                    value: category,
                    filePath,
                    isValid
                });
            }
        } catch (error) {
            console.error('Error reading ninpo categories:', error);
            // エラー時はデフォルトカテゴリーを返す
            return [{
                name: '汎用',
                value: 'hanyo',
                filePath: path.join(ninpoDir, 'hanyo.json'),
                isValid: false
            }];
        }
        
        return categories;
    }

    /**
     * カテゴリー名を表示用にフォーマット
     * @param category カテゴリー値
     * @returns 表示用カテゴリー名
     */
    private static formatCategoryName(category: NinpoCategory): string {
        const nameMap: Record<NinpoCategory, string> = {
            'hanyo': '汎用忍法',
            'hasuba': '斜歯忍群',
            'haguremono': 'ハグレモノ',
            'hirasaka': '比良坂機関',
            'kurama': '鞍馬神流',
            'oni': '隠忍の血統',
            'otogi': '私立御斎学園'
        };
        
        return nameMap[category] || category;
    }
}