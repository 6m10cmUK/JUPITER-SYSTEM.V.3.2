import { ActionRowBuilder, StringSelectMenuBuilder, Interaction, ButtonBuilder, ButtonStyle } from 'discord.js';
import { statOrder, StatusData } from '../types/statusData';
import { generateEmbed } from './embedGenerator';

export async function createStatusDisplay(
    interaction: Interaction,
    stats: StatusData,
    messageId: string,
    rerollCount: number,
    history: string,
    name: string,
    ver: string
) {
    const userId = interaction.user.id;
    const embed = await createStatusEmbed(interaction, stats, userId, rerollCount, history, name, ver);
    const components = createStatusComponents(stats, messageId, userId, ver);

    return {
        embeds: [embed],
        components: components
    };
}

async function createStatusEmbed(
    interaction: Interaction,
    stats: StatusData,
    userId: string,
    rerollCount: number,
    history: string,
    name: string,
    ver: string
) {
    const user = await interaction.client.users.fetch(userId);
    
    const embed = generateEmbed(interaction)
        .setTitle(`CoC ${ver} CHAR STATUS`)
        .setDescription(`NAME: ${name}`)
        .setFooter({ text: ver });
    
    
    const total = statOrder.reduce((sum, stat) => sum + stats[stat], 0);
    const db = calculateDamageBonus(stats.siz, stats.str);

    const luc = (stats.pow * 5).toString();
    const knw = (stats.edu * 5).toString();
    const ida = (stats.int * 5).toString();

    const hp = Math.ceil((stats.con + stats.siz) / 2).toString();
    const mp = stats.pow.toString();
    const san = (stats.pow * 5).toString();

    const job_point = (stats.edu * 20).toString();
    const inter_point = (stats.int * 10).toString();

    embed.addFields(
        ...statOrder.map((stat, index) => ({
            name: `${index + 1}️⃣ ${stat.toUpperCase()}: ${stats[stat]}`,
            value: stats.details[stat] || '(詳細なし)',
            inline: true
        }))
    );

    embed.addFields(
        { name: '\u200B', value: '\u200B', inline: true },
        { name: `Total: ${total}`, value: `**DB: ${db}**`, inline: false },
        { name: `LUC: ${luc}\nKNW: ${knw}\nIDA: ${ida}`, value: '\u200B', inline: true },
        { name: `HP: ${hp}\nMP: ${mp}\nSAN: ${san}`, value: '\u200B', inline: true },
        { name: `基礎職業P: ${job_point} 興味P: ${inter_point}`, value: `**振り直し回数: ${rerollCount}**`, inline: false },
        { name: `変更履歴`, value: history || '\u200B', inline: false },
    );

    return embed;
}

function createStatusComponents(stats: Partial<StatusData>, messageId?: string, userId?: string, ver?: string) {
    const rerollSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`reroll:${messageId}:${userId}`)
                .setPlaceholder('振り直すステータス')
                .addOptions(
                    statOrder.map(stat => ({
                        label: `${statOrder.indexOf(stat) + 1}️⃣ ${stat.toUpperCase()}`,
                        value: stat,
                        description: `${stats[stat] ?? 0} ${stats.details?.[stat] || ''}`
                    }))
                )
        );

        const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setURL(`https://iachara.com/new/costom/webdice?var=${ver}&STR=${stats.str}&CON=${stats.con}&POW=${stats.pow}&DEX=${stats.dex}&APP=${stats.app}&SIZ=${stats.siz}&INT=${stats.int}&EDU=${stats.edu}`)
                .setLabel('iacharaに出力')
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setCustomId(`changeName:${messageId}:${userId}`)
                .setLabel('名前変更')
                .setStyle(ButtonStyle.Primary)
        );

        const ChangeSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`change:${messageId}:${userId}`)
                .setPlaceholder('入れ替えるステータス')
                .addOptions(
                    statOrder.map(stat => ({
                        label: `${statOrder.indexOf(stat) + 1}️⃣ ${stat.toUpperCase()}`,
                        value: stat,
                        description: `${stats[stat] ?? 0} ${stats.details?.[stat] || ''}`
                    }))
                )
        );

    return [rerollSelectRow, buttonRow, ChangeSelectRow];
}

function calculateDamageBonus(siz: number, str: number): string {
    const total = siz + str;
    if (total <= 12) {
        return '-1D6';
    } else if (total <= 16) {
        return '-1D4';
    } else if (total <= 24) {
        return '±0';
    } else if (total <= 32) {
        return '+1D4';
    } else {
        return '+1D6';
    }
}