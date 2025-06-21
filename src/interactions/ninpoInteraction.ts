import { ButtonInteraction } from 'discord.js';
import { NinpoEmbedFormatter } from '../presentation/formatters/NinpoEmbedFormatter';
import { NinpoSearchCriteria } from '../application/dto/NinpoDto';

export const prefix = 'ninpo';

export async function execute(interaction: ButtonInteraction) {
    const parts = interaction.customId.split(':');
    
    // カテゴリー選択ボタンの場合は7つのパーツ
    if (parts.length === 7) {
        const [_, type, query, searchType, category, page, ninpoCategory] = parts;
        if (!type || !searchType || !category || !page) {
            console.error('Invalid customId format:', interaction.customId);
            return;
        }
        
        const formatter = new NinpoEmbedFormatter();
        const criteria: NinpoSearchCriteria = {
            query: decodeURIComponent(query),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page),
            ninpoCategory: ninpoCategory
        };
        
        const display = await formatter.format(interaction, criteria);
        await interaction.update(display);
    } else if (parts.length === 6) {
        // 古い形式（互換性のため）
        const [_, type, query, searchType, category, page] = parts;
        if (!type || !searchType || !category || !page) {
            console.error('Invalid customId format:', interaction.customId);
            return;
        }
        
        const formatter = new NinpoEmbedFormatter();
        const criteria: NinpoSearchCriteria = {
            query: decodeURIComponent(query),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page)
        };
        
        const display = await formatter.format(interaction, criteria);
        await interaction.update(display);
    } else {
        console.error('Invalid customId format length:', interaction.customId);
        return;
    }
}