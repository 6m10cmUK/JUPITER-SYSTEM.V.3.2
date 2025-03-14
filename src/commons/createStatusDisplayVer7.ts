import { ActionRowBuilder, StringSelectMenuBuilder, Interaction, ButtonBuilder, ButtonStyle } from 'discord.js';
import { statOrder, StatusData } from '../types/statusDataVer7';
import { generateEmbed } from './embedGenerator';

export async function createStatusDisplayVer7(
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

    const san = stats.pow;
    const hp = Math.ceil((stats.con + stats.siz) / 10);
    const mp = Math.ceil(stats.pow / 5);
    const mov = (stats.str < stats.siz && stats.dex < stats.siz) ? 7 : 8;
    const {db, build} = calculateDBandBUILD(stats.siz, stats.str);
    const knw = stats.edu;
    const ida = stats.int;

    const job_point = (stats.edu * 4).toString();
    const inter_point = (stats.int * 2).toString();

    embed.addFields(
        ...statOrder.map((stat, index) => ({
            name: `${index + 1}️⃣ ${stat.toUpperCase()}: ${stats[stat]}`,
            value: stats.details[stat] || '(詳細なし)',
            inline: true
        }))
    );

    embed.addFields(
        { name: `Total: ${total}`, value: `**DB: ${db} BUILD: ${build}**`, inline: false },
        { name: `KNW: ${knw}\nIDA: ${ida}\nMOV: ${mov}`, value: '\u200B', inline: true },
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
                .setStyle(ButtonStyle.Link)
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

function calculateDBandBUILD(siz: number, str: number): {db: string, build: string} {
    const total = siz + str;
    
    if (total <= 64) {
        return {db: '-2', build: '-2'};
    } else if (total <= 84) {
        return {db: '-1', build: '-1'};
    } else if (total <= 124) {
        return {db: '0', build: '0'};
    } else if (total <= 164) {
        return {db: '+1D4', build: '1'};
    } else if (total <= 204) {
        return {db: '+1D6', build: '2'};
    } else if (total <= 284) {
        return {db: '+2D6', build: '3'};
    } else if (total <= 364) {
        return {db: '+3D6', build: '4'};
    } else if (total <= 444) {
        return {db: '+4D6', build: '5'};
    } else if (total <= 524) {
        return {db: '+5D6', build: '6'};
    } else {
        return {db: '+5D6', build: '6'};
    }

}