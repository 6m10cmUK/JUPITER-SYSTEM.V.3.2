import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { ChoiceCommandHandler } from './handlers/ChoiceCommandHandler';

/**
 * 選択肢ランダム選択コマンド
 * 複数の選択肢からランダムに1つを選ぶ機能を提供
 */
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('choice')
        .setDescription('選択肢からランダムに選ぶ')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('args')
                .setDescription('選択肢')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        // ChoiceCommandHandlerに処理を委譲（統一パターン）
        const handler = new ChoiceCommandHandler();
        await handler.handle(interaction);
    }
}; 