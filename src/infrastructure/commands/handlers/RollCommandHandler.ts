import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../../shared/interfaces/Command';
import { RollDiceUseCase } from '../../../application/use-cases/dice/RollDiceUseCase';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceEmbedFormatter } from '../../../presentation/formatters/DiceEmbedFormatter';
import { DiceSystemError, InvalidExpressionError } from '../../../shared/errors/DiceSystemError';
import { CommandHandler } from '../../../shared/interfaces/patterns/CommandPatterns';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';
import { logResult } from '../../../shared/utils/UsageLogger';

/**
 * ダイスロールコマンドハンドラー
 * 基本的なダイス記法（1d6, 2d10+5など）をサポート
 */

export class RollCommandHandler implements Command, CommandHandler {
    data = new SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('set')
                .setDescription('(n)d(n)')
                .setRequired(true)
        ) as SlashCommandBuilder;

    constructor(
        private readonly rollDiceUseCase: RollDiceUseCase,
        private readonly formatter: DiceEmbedFormatter
    ) {}

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
            
            // 成功ログ（簡潔に）
            logResult(
                interaction,
                `${expression} ＞ ${response.rolls.map(roll => roll.result).join(' ')}`
            );
            
        } catch (error) {
            // ユーザーフレンドリーなエラーメッセージ
            let userMessage = 'ダイスロールの処理中にエラーが発生しました。';
            
            if (error instanceof InvalidExpressionError) {
                userMessage = `無効なダイス式です: ${error.expression}\n詳細: ${error.message}`;
            } else if (error instanceof DiceSystemError) {
                userMessage = `ダイスシステムエラー: ${error.message}`;
            }
            
            await interaction.reply({
                content: userMessage,
                ephemeral: true
            });
            
            // 詳細ログはコンソールに出力（デバッグ用）
            console.error('Dice roll error:', {
                error: error instanceof Error ? error.message : String(error),
                expression,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * 統一インターフェース準拠のhandleメソッド
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        await this.execute(interaction);
    }
}
