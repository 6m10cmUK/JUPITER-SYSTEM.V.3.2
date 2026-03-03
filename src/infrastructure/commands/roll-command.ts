import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { createRollCommandHandler } from '../factories/CommandHandlerFactory';

/**
 * ダイスロールコマンド
 * 基本的なダイス記法（1d6, 2d10+5など）をサポート
 */
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('set')
                .setDescription('(n)d(n)')
                .setRequired(true)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const handler = createRollCommandHandler();
        await handler.handle(interaction);
    }
};
