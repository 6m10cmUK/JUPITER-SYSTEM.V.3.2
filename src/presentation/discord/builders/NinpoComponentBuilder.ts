import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { randomUUID } from 'crypto';
import { NinpoSearchCriteria, NinpoDisplayData } from '../../../application/dto/NinpoDto';

const MAX_SHORT_KEY_MAP_SIZE = 200;
const SHORT_KEY_TTL_MS = 30 * 60 * 1000; // 30分

interface ShortKeyEntry {
    value: string;
    createdAt: number;
}

// クエリ・カテゴリ文字列の短縮キーマッピング（customId 100文字制限対策）
const shortKeyMap = new Map<string, ShortKeyEntry>();

function cleanupShortKeyMap(): void {
    const now = Date.now();
    for (const [key, entry] of shortKeyMap.entries()) {
        if (now - entry.createdAt > SHORT_KEY_TTL_MS) {
            shortKeyMap.delete(key);
        }
    }
    // サイズ制限を超えている場合は古いエントリを削除
    if (shortKeyMap.size > MAX_SHORT_KEY_MAP_SIZE) {
        const entries = Array.from(shortKeyMap.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
        const toRemove = entries.slice(0, shortKeyMap.size - MAX_SHORT_KEY_MAP_SIZE);
        for (const [key] of toRemove) {
            shortKeyMap.delete(key);
        }
    }
}

function getShortKey(value: string, maxLen: number): string {
    if (value.length <= maxLen) return value;
    // 既存のマッピングを検索
    for (const [key, entry] of shortKeyMap.entries()) {
        if (entry.value === value) return key;
    }
    cleanupShortKeyMap();
    const shortKey = randomUUID().slice(0, 8);
    shortKeyMap.set(shortKey, { value, createdAt: Date.now() });
    return shortKey;
}

function getShortQueryKey(query: string): string {
    const encoded = encodeURIComponent(query);
    return getShortKey(encoded, 30);
}

function getShortCategoryKey(category: string): string {
    return getShortKey(category, 20);
}

export function resolveQueryKey(key: string): string {
    return shortKeyMap.get(key)?.value ?? key;
}

export class NinpoComponentBuilder {
    static createComponents(criteria: NinpoSearchCriteria, displayData: NinpoDisplayData): ActionRowBuilder<ButtonBuilder>[] {
        const { query, searchType, category } = criteria;
        const { currentPage, maxPage, categoryPages, currentCategory } = displayData;
        const encodedQuery = getShortQueryKey(query);
        const shortCurrentCategory = currentCategory ? getShortCategoryKey(currentCategory) : undefined;
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];

        // ページネーションボタン
        const pageRow = new ActionRowBuilder<ButtonBuilder>();
        pageRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`ninpo:first:${encodedQuery}:${searchType}:${category}:1:${shortCurrentCategory}`)
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:prev:${encodedQuery}:${searchType}:${category}:${currentPage - 1}:${shortCurrentCategory}`)
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:next:${encodedQuery}:${searchType}:${category}:${currentPage + 1}:${shortCurrentCategory}`)
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPage),
            new ButtonBuilder()
                .setCustomId(`ninpo:last:${encodedQuery}:${searchType}:${category}:${maxPage}:${shortCurrentCategory}`)
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
                    const shortCat = getShortCategoryKey(cat);
                    categoryRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ninpo:category:${encodedQuery}:${searchType}:${category}:1:${shortCat}`)
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
