import { ButtonInteraction } from 'discord.js';
import { NinpoEmbedFormatter } from '../presentation/formatters/NinpoEmbedFormatter';
import { NinpoComponentBuilder, resolveQueryKey, resolveCategoryKey } from '../presentation/discord/builders/NinpoComponentBuilder';
import { NinpoCommandHandler } from '../infrastructure/commands/handlers/NinpoCommandHandler';
import { NinpoSearchCriteria } from '../application/dto/NinpoDto';
import { logResult } from '../shared/utils/UsageLogger';

export const prefix = 'ninpo';

export async function execute(interaction: ButtonInteraction) {
    const parts = interaction.customId.split(':');

    let criteria: NinpoSearchCriteria;

    // カテゴリー選択ボタンの場合は7つのパーツ
    if (parts.length === 7) {
        const [_, type, query, searchType, category, page, ninpoCategory] = parts;
        if (!type || !searchType || !category || !page) {
            logResult(interaction, `status=failed cause=invalid-custom-id customId=${interaction.customId}`);
            return;
        }

        const resolvedQuery = resolveQueryKey(query);
        const resolvedCategory = resolveCategoryKey(ninpoCategory);
        if (resolvedQuery === null) {
            logResult(interaction, `status=failed cause=query-key-not-found key=${query}`);
            return;
        }

        criteria = {
            query: decodeURIComponent(resolvedQuery),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page),
            ninpoCategory: resolvedCategory ?? undefined
        };
    } else if (parts.length === 6) {
        // 古い形式（互換性のため）
        const [_, type, query, searchType, category, page] = parts;
        if (!type || !searchType || !category || !page) {
            logResult(interaction, `status=failed cause=invalid-custom-id customId=${interaction.customId}`);
            return;
        }

        const resolvedQuery2 = resolveQueryKey(query);
        if (resolvedQuery2 === null) {
            logResult(interaction, `status=failed cause=query-key-not-found key=${query}`);
            return;
        }

        criteria = {
            query: decodeURIComponent(resolvedQuery2),
            searchType: searchType as NinpoSearchCriteria['searchType'],
            category: category as NinpoSearchCriteria['category'],
            page: Number(page)
        };
    } else {
        logResult(interaction, `status=failed cause=invalid-custom-id customId=${interaction.customId}`);
        return;
    }

    const formatter = new NinpoEmbedFormatter();
    const handler = new NinpoCommandHandler(formatter);
    const displayData = handler.buildDisplayData(criteria);
    const embed = formatter.createEmbed(interaction, displayData);
    const components = NinpoComponentBuilder.createComponents(criteria, displayData);

    await interaction.update({ embeds: [embed], components });
    logResult(
        interaction,
        `status=success action=${parts[1] ?? '-'} searchType=${criteria.searchType} category=${criteria.category} page=${displayData.currentPage}/${displayData.maxPage} displayed=${displayData.ninpos.length}`
    );
}
