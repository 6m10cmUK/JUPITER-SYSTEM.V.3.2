import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../interfaces/Command';
import { createStatusDisplay } from '../commons/createStatusDisplay';
import { createStatusDisplayVer7 } from '../commons/createStatusDisplayVer7';
import { rollAllStats } from '../commons/rollAllStats';
import { rollAllStatsVer7 } from '../commons/rollAllStatsVer7';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('CoCステータス作成コマンド')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('type')
                .setDescription('表示するステータスの種類')
                .setRequired(true)
                .addChoices(
                    { name: '6版', value: 'ver6' },
                    { name: '7版', value: 'ver7' }
                )
        )
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('name')
                .setDescription('キャラクターの名前')
                .setRequired(false)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const type = interaction.options.getString('type');
        const name = interaction.options.getString('name') ?? 'キャラクター名';

        // 最初に仮のメッセージを送信
        await interaction.deferReply();
        const replyMessage = await interaction.fetchReply();
        const messageId = replyMessage?.id;

        if (type === 'ver6') {
            const statsData = rollAllStats();

            const display = createStatusDisplay(
                interaction,
                statsData,
                messageId,
                0,
                '',
                name,
                '6'
            );

            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        } else if (type === 'ver7') {
            const statsData = rollAllStatsVer7();

            const display = createStatusDisplayVer7(
                interaction,
                statsData,
                messageId,
                0,
                '',
                name,
                '7'
            );

            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
    }
}; 