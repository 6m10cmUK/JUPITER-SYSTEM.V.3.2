import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../../interfaces/Command';
import { RollDiceUseCase } from '../../../application/use-cases/dice/RollDiceUseCase';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceEmbedFormatter } from '../../../presentation/formatters/DiceEmbedFormatter';

/**
 * ダイスロールコマンドハンドラー
 * 基本的なダイス記法（1d6, 2d10+5など）をサポート
 */

export class RollCommandHandler implements Command {
    private readonly rollDiceUseCase: RollDiceUseCase;
    private readonly formatter: DiceEmbedFormatter;

    data = new SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('set')
                .setDescription('(n)d(n)')
                .setRequired(true)
        ) as SlashCommandBuilder;

    constructor() {
        const diceService = new DiceService();
        this.rollDiceUseCase = new RollDiceUseCase(diceService);
        this.formatter = new DiceEmbedFormatter();
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const expression = interaction.options.getString('set') ?? '';
        
        try {
            const response = await this.rollDiceUseCase.execute({
                expression,
                userId: interaction.user.id,
                guildId: interaction.guildId ?? undefined
            });

            const embed = this.formatter.formatResponse(response, interaction);
            
            await interaction.reply({ embeds: [embed] });
            
            console.log(
                `${interaction.guildId} ${interaction.user.username} ${expression} ${response.rolls.map(r => r.result).join(' ')}`
            );
        } catch (error) {
            await interaction.reply({
                content: 'ダイスロールの処理中にエラーが発生しました。',
                ephemeral: true
            });
            console.error('Dice roll error:', error);
        }
    }
}

export const command = new RollCommandHandler();