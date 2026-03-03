import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { NinpoSearchCriteria, NinpoDisplayData } from '../../../application/dto/NinpoDto';

// クエリ文字列の短縮キーマッピング（customId 100文字制限対策）
const queryKeyMap = new Map<string, string>();

function getShortQueryKey(query: string): string {
    const encoded = encodeURIComponent(query);
    if (encoded.length <= 30) return encoded;
    // 既存のマッピングを検索
    for (const [key, value] of queryKeyMap.entries()) {
        if (value === encoded) return key;
    }
    // 新しい短縮キーを生成（タイムスタンプベース）
    const shortKey = `q_${Date.now().toString(36)}`;
    queryKeyMap.set(shortKey, encoded);
    return shortKey;
}

export function resolveQueryKey(key: string): string {
    return queryKeyMap.get(key) ?? key;
}

export class NinpoComponentBuilder {
    static createComponents(criteria: NinpoSearchCriteria, displayData: NinpoDisplayData): ActionRowBuilder<ButtonBuilder>[] {
        const { query, searchType, category } = criteria;
        const { currentPage, maxPage, categoryPages, currentCategory } = displayData;
        const encodedQuery = getShortQueryKey(query);
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

    static sortCategories(categories: string[]): string[] {
        const priorityOrder = ['汎用忍法', '流派忍法', '秘伝忍法'];

        const priorityCategories: string[] = [];
        const otherCategories: string[] = [];

        categories.forEach(cat => {
            if (priorityOrder.includes(cat)) {
                priorityCategories.push(cat);
            } else {
                otherCategories.push(cat);
            }
        });

        priorityCategories.sort((a, b) => {
            return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
        });

        otherCategories.sort((a, b) => a.localeCompare(b));

        return [...priorityCategories, ...otherCategories];
    }
}
