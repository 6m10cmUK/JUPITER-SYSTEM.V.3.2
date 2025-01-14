import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../interfaces/Command';
import { createStatusDisplay } from '../commons/createStatus';
import { rollAllStats } from '../commons/rollAllStats';

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
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const type = interaction.options.getString('type');
        // 最初に仮のメッセージを送信
        await interaction.deferReply();
        const replyMessage = await interaction.fetchReply();
        const messageId = replyMessage?.id;

        if (type === 'ver6') {
            const statsData = rollAllStats(type);

            const display = createStatusDisplay(
                interaction,
                statsData,
                messageId,
                0,
                ''
            );

            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        } else if (type === 'ver7') {
            const statsData = rollAllStats(type); // 7版用のロジックを使用

            const display = createStatusDisplay(
                interaction,
                statsData,
                messageId,
                0,
                ''
            );

            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
    }
}; 