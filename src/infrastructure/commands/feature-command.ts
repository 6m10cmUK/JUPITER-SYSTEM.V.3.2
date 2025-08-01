import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { FeatureCommandHandler } from './handlers/FeatureCommandHandler';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('feature')
        .setDescription('ランダム特徴表')
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('取得する特徴の数')
                .setMinValue(1)
                .setMaxValue(3)
                .setRequired(false)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const handler = new FeatureCommandHandler();
        await handler.execute(interaction);
    }
};
