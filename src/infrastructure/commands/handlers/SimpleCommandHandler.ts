import { ChatInputCommandInteraction } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';

/**
 * シンプルなコマンド用の汎用ハンドラー
 * 複雑なロジックを持たないコマンドの統一処理
 */
export class SimpleCommandHandler {
    /**
     * R6Sコマンド処理
     * @param interaction Discord インタラクション
     */
    async handleR6S(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const embed = generateEmbed(interaction)
                .setTitle('Rainbow Six Siege')
                .setDescription('R6S関連機能（実装準備中）')
                .setColor(0x333333);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await this.handleError(interaction, error, 'r6s');
        }
    }

    /**
     * テストコマンド処理
     * @param interaction Discord インタラクション
     */
    async handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const embed = generateEmbed(interaction)
                .setTitle('🧪 テストコマンド')
                .setDescription('システムテスト機能')
                .setColor(0x00FF00);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await this.handleError(interaction, error, 'test');
        }
    }

    /**
     * 通知コマンド処理
     * @param interaction Discord インタラクション
     */
    async handleNotify(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const embed = generateEmbed(interaction)
                .setTitle('📢 通知システム')
                .setDescription('通知機能（実装準備中）')
                .setColor(0x0099FF);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await this.handleError(interaction, error, 'notify');
        }
    }

    /**
     * エラーハンドリング
     * @param interaction Discord インタラクション
     * @param error エラー
     * @param commandName コマンド名
     */
    private async handleError(
        interaction: ChatInputCommandInteraction, 
        error: unknown, 
        commandName: string
    ): Promise<void> {
        await interaction.reply({
            content: `${commandName}コマンドの処理中にエラーが発生しました。`,
            ephemeral: true
        });

        console.error(`${commandName} command error:`, {
            error: error instanceof Error ? error.message : String(error),
            userId: interaction.user.id,
            guildId: interaction.guildId
        });
    }
}