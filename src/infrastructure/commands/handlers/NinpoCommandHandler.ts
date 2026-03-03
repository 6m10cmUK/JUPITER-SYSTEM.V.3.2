import { ChatInputCommandInteraction } from 'discord.js';
import { NinpoEmbedFormatter } from '../../../presentation/formatters/NinpoEmbedFormatter';
import { NinpoComponentBuilder } from '../../../presentation/discord/builders/NinpoComponentBuilder';
import { NinpoService } from '../../../domain/services/NinpoService';
import {
    NinpoData,
    NinpoSearchCriteria,
    NinpoCategory,
    NinpoAvailableCategory,
    NinpoDisplayData
} from '../../../application/dto/NinpoDto';
import fs from 'fs';
import path from 'path';

const NINPOS_PER_PAGE = 9;

/**
 * 忍法コマンドハンドラー
 * 忍法検索・生成のビジネスロジックを適切に分離
 */
export class NinpoCommandHandler {
    constructor(
        private readonly formatter: NinpoEmbedFormatter,
        private readonly ninpoService: NinpoService = new NinpoService()
    ) {}

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
        const rawCount = interaction.options.getInteger('count') ?? 1;
        const count = Math.min(Math.max(rawCount, 1), 10);
        const categoryInput = interaction.options.getString('category') as NinpoCategory | null;
        const category: NinpoCategory = categoryInput ?? 'hanyo';

        const criteria: NinpoSearchCriteria = {
            query: '',
            searchType: 'all',
            category,
            page: 1,
            limit: count
        };

        const displayData = this.buildDisplayData(criteria);
        const embed = this.formatter.createEmbed(interaction, displayData);
        const components = NinpoComponentBuilder.createComponents(criteria, displayData);

        await interaction.editReply({ embeds: [embed], components });
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

        const displayData = this.buildDisplayData(criteria);
        const embed = this.formatter.createEmbed(interaction, displayData);
        const components = NinpoComponentBuilder.createComponents(criteria, displayData);

        await interaction.editReply({ embeds: [embed], components });
    }

    /**
     * NinpoSearchCriteria から NinpoDisplayData を構築する
     */
    buildDisplayData(criteria: NinpoSearchCriteria): NinpoDisplayData {
        const allNinpos = this.ninpoService.searchNinpo(criteria);
        const title = this.ninpoService.getTitle(criteria);

        // 検索の場合はカテゴリ分けしない
        if (criteria.searchType !== 'all') {
            const maxPage = Math.ceil(allNinpos.length / NINPOS_PER_PAGE);
            const currentPage = Math.min(criteria.page, maxPage || 1);

            return {
                title,
                ninpos: getPagedNinpos(allNinpos, currentPage),
                currentPage,
                maxPage: maxPage || 1,
                searchType: criteria.searchType
            };
        }

        // 一覧表示の場合のみカテゴリ分け
        const categoryInfo = this.ninpoService.getCategoriesWithPageInfo(allNinpos, NINPOS_PER_PAGE);
        const sortedCategories = NinpoComponentBuilder.sortCategories(Array.from(categoryInfo.keys()));

        let currentCategory = criteria.ninpoCategory || sortedCategories[0];
        if (!categoryInfo.has(currentCategory)) {
            currentCategory = sortedCategories[0];
        }

        const currentCategoryInfo = categoryInfo.get(currentCategory);
        if (!currentCategoryInfo) {
            return {
                title,
                ninpos: [],
                currentPage: 1,
                maxPage: 1,
                searchType: criteria.searchType
            };
        }
        const categoryPage = Math.min(criteria.page, currentCategoryInfo.pageCount || 1);

        return {
            title: categoryInfo.size > 1 ? `${title} - ${currentCategory}` : title,
            ninpos: getPagedNinpos(currentCategoryInfo.ninpos, categoryPage),
            currentPage: categoryPage,
            maxPage: currentCategoryInfo.pageCount,
            categoryPages: new Map(Array.from(categoryInfo.entries()).map(([cat, info]) => [cat, info.pageCount])),
            currentCategory,
            searchType: criteria.searchType
        };
    }

    /**
     * 忍法カテゴリーを型安全に取得
     * @returns 利用可能なカテゴリー情報
     */
    static getNinpoCategories(): NinpoAvailableCategory[] {
        const ninpoDir = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo');
        const categories: NinpoAvailableCategory[] = [];

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

function getPagedNinpos(ninpos: NinpoData[], page: number): NinpoData[] {
    const start = (page - 1) * NINPOS_PER_PAGE;
    const end = start + NINPOS_PER_PAGE;
    return ninpos.slice(start, end);
}
