import { EmbedBuilder, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { NinpoData, NinpoSearchCriteria, NinpoDisplayData } from '../../application/dto/NinpoDto';
import { NinpoService } from '../../domain/services/NinpoService';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class NinpoEmbedFormatter {
    private ninpoService: NinpoService;
    private readonly NINPOS_PER_PAGE = 9; // 1ページ9個表示

    constructor() {
        this.ninpoService = new NinpoService();
    }

    async format(interaction: Interaction, criteria: NinpoSearchCriteria): Promise<{
        embeds: EmbedBuilder[];
        components: ActionRowBuilder<ButtonBuilder>[];
    }> {
        const allNinpos = this.ninpoService.searchNinpo(criteria);
        const title = this.ninpoService.getTitle(criteria);
        
        // 検索の場合はカテゴリ分けしない
        if (criteria.searchType !== 'all') {
            const maxPage = Math.ceil(allNinpos.length / this.NINPOS_PER_PAGE);
            const currentPage = Math.min(criteria.page, maxPage || 1);
            
            const displayData: NinpoDisplayData = {
                title,
                ninpos: this.getPagedNinpos(allNinpos, currentPage),
                currentPage,
                maxPage: maxPage || 1,
                searchType: criteria.searchType
            };
            
            const embed = this.createEmbed(interaction, displayData);
            const components = this.createComponents(criteria, displayData);
            
            return {
                embeds: [embed],
                components
            };
        }
        
        // 一覧表示の場合のみカテゴリ分け
        const categoryInfo = this.ninpoService.getCategoriesWithPageInfo(allNinpos, this.NINPOS_PER_PAGE);
        
        // カテゴリーをソート（データから動的に取得）
        const sortedCategories = this.sortCategories(Array.from(categoryInfo.keys()));
        
        // 現在のカテゴリーを決定
        let currentCategory = criteria.ninpoCategory || sortedCategories[0];
        if (!categoryInfo.has(currentCategory)) {
            currentCategory = sortedCategories[0];
        }
        
        const currentCategoryInfo = categoryInfo.get(currentCategory);
        if (!currentCategoryInfo) {
            throw new Error(`Category ${currentCategory} not found in category info`);
        }
        const categoryPage = Math.min(criteria.page, currentCategoryInfo.pageCount || 1);
        
        const displayData: NinpoDisplayData = {
            title: categoryInfo.size > 1 ? `${title} - ${currentCategory}` : title,
            ninpos: this.getPagedNinpos(currentCategoryInfo.ninpos, categoryPage),
            currentPage: categoryPage,
            maxPage: currentCategoryInfo.pageCount,
            categoryPages: new Map(Array.from(categoryInfo.entries()).map(([cat, info]) => [cat, info.pageCount])),
            currentCategory,
            searchType: criteria.searchType
        };

        const embed = this.createEmbed(interaction, displayData);
        const components = this.createComponents(criteria, displayData);

        return {
            embeds: [embed],
            components
        };
    }

    private getPagedNinpos(ninpos: NinpoData[], page: number): NinpoData[] {
        const start = (page - 1) * this.NINPOS_PER_PAGE;
        const end = start + this.NINPOS_PER_PAGE;
        return ninpos.slice(start, end);
    }

    private createEmbed(interaction: Interaction, displayData: NinpoDisplayData): EmbedBuilder {
        const { title, ninpos, currentPage, maxPage, categoryPages, currentCategory } = displayData;

        const embed = generateEmbed(interaction)
            .setTitle(`🥷 ${title}`)
            .setDescription(`${currentPage} / ${maxPage} ページ`)
            .setFooter({ text: `シノビガミ忍法データベース | ${currentPage} / ${maxPage}` })
            .setColor(0x5C0BB5); // 紫色（忍者っぽい色）

        // カテゴリー情報を表示（複数カテゴリーがある場合）
        if (categoryPages && categoryPages.size > 1) {
            const sortedCategories = this.sortCategories(Array.from(categoryPages.keys()));
            const categoryInfo = sortedCategories
                .map(cat => {
                    const pages = categoryPages.get(cat)!;
                    if (cat === currentCategory) {
                        return `**${cat.toUpperCase()}(${pages}p)**`;
                    }
                    return `${cat}(${pages}p)`;
                })
                .join(' | ');
            embed.addFields({
                name: 'カテゴリー',
                value: categoryInfo,
                inline: false
            });
        }
        
        // 忍法を表示
        ninpos.forEach((ninpo: NinpoData) => {
            // コンパクトな表示形式
            const title = `${ninpo.name}（${ninpo.kana}）`;
            
            // 1行目：基本情報
            let basicInfo = `［${ninpo.type}］${ninpo.specialty} | 対象:${ninpo.target} 射程:${ninpo.range}${ninpo.cost ? ` コスト:${ninpo.cost}` : ''}${ninpo.correction ? ` **${ninpo.correction}**` : ''}`;
            
            // 検索タイプに応じて表示を変更
            if (displayData.searchType && displayData.searchType !== 'all') {
                if (displayData.searchType === 'name' && ninpo.source) {
                    // 名前検索：流派とカテゴリを表示
                    basicInfo = `【${ninpo.source}・${ninpo.category}】\n${basicInfo}`;
                } else {
                    // その他の検索：カテゴリのみ表示
                    basicInfo = `【${ninpo.category}】\n${basicInfo}`;
                }
            }
            
            // 2行目以降：効果（省略なし）
            const value = `${basicInfo}\n${ninpo.description}`;

            // フィールドとして追加（インライン表示）
            embed.addFields({ 
                name: title,
                value: value,
                inline: true
            });
        });

        // 3で割り切れない場合、空白フィールドを追加して調整
        const remainder = ninpos.length % 3;
        if (remainder !== 0) {
            const emptyFieldsCount = 3 - remainder;
            for (let i = 0; i < emptyFieldsCount; i++) {
                embed.addFields({
                    name: '\u200B', // 幅ゼロスペース
                    value: '\u200B',
                    inline: true
                });
            }
        }

        return embed;
    }

    private createComponents(criteria: NinpoSearchCriteria, displayData: NinpoDisplayData): ActionRowBuilder<ButtonBuilder>[] {
        const { query, searchType, category } = criteria;
        const { currentPage, maxPage, categoryPages, currentCategory } = displayData;
        const encodedQuery = encodeURIComponent(query);
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];

        // ページネーションボタン
        const pageRow = new ActionRowBuilder<ButtonBuilder>();
        pageRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`ninpo:first:${encodedQuery}:${searchType}:${category}:1:${currentCategory}`)
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:prev:${encodedQuery}:${searchType}:${category}:${currentPage - 1}:${currentCategory}`)
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:next:${encodedQuery}:${searchType}:${category}:${currentPage + 1}:${currentCategory}`)
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPage),
            new ButtonBuilder()
                .setCustomId(`ninpo:last:${encodedQuery}:${searchType}:${category}:${maxPage}:${currentCategory}`)
                .setLabel('>>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPage)
        );
        rows.push(pageRow);

        // カテゴリー選択ボタン（複数カテゴリーがある場合のみ表示）
        if (categoryPages && categoryPages.size > 1) {
            const sortedCategories = this.sortCategories(Array.from(categoryPages.keys()));
            
            // 5個ずつのグループに分割（Discordの制限）
            for (let i = 0; i < sortedCategories.length; i += 5) {
                const categoryRow = new ActionRowBuilder<ButtonBuilder>();
                const categoriesChunk = sortedCategories.slice(i, i + 5);
                
                categoriesChunk.forEach(cat => {
                    categoryRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ninpo:category:${encodedQuery}:${searchType}:${category}:1:${cat}`)
                            .setLabel(cat)
                            .setStyle(cat === currentCategory ? ButtonStyle.Success : ButtonStyle.Secondary)
                    );
                });
                
                rows.push(categoryRow);
            }
        }

        return rows;
    }

    private sortCategories(categories: string[]): string[] {
        // 優先順位の定義（この順序は固定）
        const priorityOrder = ['汎用忍法', '流派忍法', '秘伝忍法'];
        
        // カテゴリーを優先順位カテゴリーとその他に分ける
        const priorityCategories: string[] = [];
        const otherCategories: string[] = [];
        
        categories.forEach(cat => {
            if (priorityOrder.includes(cat)) {
                priorityCategories.push(cat);
            } else {
                otherCategories.push(cat);
            }
        });
        
        // 優先順位カテゴリーをソート
        priorityCategories.sort((a, b) => {
            return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
        });
        
        // その他のカテゴリーをアルファベット順でソート
        otherCategories.sort((a, b) => a.localeCompare(b));
        
        // 結合して返す
        return [...priorityCategories, ...otherCategories];
    }
}