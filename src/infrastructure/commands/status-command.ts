import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../interfaces/Command';
import { StatusCommandHandler } from './handlers/StatusCommandHandler';

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
        )
        .addBooleanOption((option) =>
            option.setName('custom')
                .setDescription('カスタムセットメニューを表示する')
                .setRequired(false)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const type = interaction.options.getString('type');
        const name = interaction.options.getString('name') ?? 'キャラクター名';
        const showCustomMenu = interaction.options.getBoolean('custom') ?? false;
        const version = type === 'ver7' ? '7' : '6';
        
        const handler = new StatusCommandHandler();
        await handler.handle(interaction, version, name, showCustomMenu);
    }
}; 