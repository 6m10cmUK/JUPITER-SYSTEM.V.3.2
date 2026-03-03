import { ButtonInteraction } from 'discord.js';
import { NinpoEmbedFormatter } from '../presentation/formatters/NinpoEmbedFormatter';
import { NinpoComponentBuilder, resolveQueryKey } from '../presentation/discord/builders/NinpoComponentBuilder';
import { NinpoCommandHandler } from '../infrastructure/commands/handlers/NinpoCommandHandler';
import { NinpoSearchCriteria } from '../application/dto/NinpoDto';

export const prefix = 'ninpo';

export async function execute(interaction: ButtonInteraction) {
    const parts = interaction.customId.split(':');

    let criteria: NinpoSearchCriteria;

    // カテゴリー選択ボタンの場合は7つのパーツ
    if (parts.length === 7) {
        const [_, type, query, searchType, category, page, ninpoCategory] = parts;
        if (!type || !searchType || !category || !page) {
            console.error('Invalid customId format:', interaction.customId);
            return;
        }

        criteria = {
            query: decodeURIComponent(resolveQueryKey(query)),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page),
            ninpoCategory: resolveQueryKey(ninpoCategory)
        };
    } else if (parts.length === 6) {
        // 古い形式（互換性のため）
        const [_, type, query, searchType, category, page] = parts;
        if (!type || !searchType || !category || !page) {
            console.error('Invalid customId format:', interaction.customId);
            return;
        }

        criteria = {
            query: decodeURIComponent(resolveQueryKey(query)),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page)
        };
    } else {
        console.error('Invalid customId format length:', interaction.customId);
        return;
    }

    const formatter = new NinpoEmbedFormatter();
    const handler = new NinpoCommandHandler(formatter);
    const displayData = handler.buildDisplayData(criteria);
    const embed = formatter.createEmbed(interaction, displayData);
    const components = NinpoComponentBuilder.createComponents(criteria, displayData);

    await interaction.update({ embeds: [embed], components });
}
