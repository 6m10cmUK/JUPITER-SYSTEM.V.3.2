import { EmbedBuilder, Interaction } from 'discord.js';
import { NinpoData, NinpoDisplayData } from '../../application/dto/NinpoDto';
import { generateEmbed } from '../discord/builders/embedGenerator';
import { NinpoComponentBuilder } from '../discord/builders/NinpoComponentBuilder';

export class NinpoEmbedFormatter {
    createEmbed(interaction: Interaction, displayData: NinpoDisplayData): EmbedBuilder {
        const { title, ninpos, currentPage, maxPage, categoryPages, currentCategory } = displayData;

        const embed = generateEmbed(interaction)
            .setTitle(`${title}`)
            .setDescription(`${currentPage} / ${maxPage} ページ`)
            .setFooter({ text: `シノビガミ忍法データベース | ${currentPage} / ${maxPage}` })
            .setColor(0x5C0BB5);

        // カテゴリー情報を表示（複数カテゴリーがある場合）
        if (categoryPages && categoryPages.size > 1) {
            const sortedCategories = NinpoComponentBuilder.sortCategories(Array.from(categoryPages.keys()));
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
            const title = `${ninpo.name}（${ninpo.kana}）`;

            const parts = [];
            parts.push(`［${ninpo.type}］`);

            if (ninpo.specialty && ninpo.specialty !== '') {
                parts.push(ninpo.specialty);
            }
            if (ninpo.target && ninpo.target !== '') {
                parts.push(`対象:${ninpo.target}`);
            }
            if (ninpo.range && ninpo.range !== '') {
                parts.push(`射程:${ninpo.range}`);
            }
            if (ninpo.cost && ninpo.cost !== '') {
                parts.push(`コスト:${ninpo.cost}`);
            }
            if (ninpo.correction && ninpo.correction !== '') {
                parts.push(`**${ninpo.correction}**`);
            }

            let basicInfo = parts.join(' | ');

            if (displayData.searchType && displayData.searchType !== 'all') {
                if ((displayData.searchType === 'name' || displayData.searchType === 'effect') && ninpo.source) {
                    basicInfo = `【${ninpo.source}・${ninpo.category}】\n${basicInfo}`;
                } else {
                    basicInfo = `【${ninpo.category}】\n${basicInfo}`;
                }
            }

            const value = `${basicInfo}\n${ninpo.description}`;

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
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                });
            }
        }

        return embed;
    }
}
