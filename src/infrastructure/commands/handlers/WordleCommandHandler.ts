import { 
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

/**
 * Wordleゲームコマンドハンドラー（統一アーキテクチャ）
 */
export class WordleCommandHandler {
    /**
     * Wordleゲーム開始処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const playButton = new ButtonBuilder()
                .setCustomId('wordle:start')
                .setLabel('ゲームを開始')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎮');

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(playButton);

            await interaction.reply({
                embeds: [{
                    title: '🎯 日本語Wordle',
                    description: '4文字のひらがな単語を当てるゲームです！\n\n**ルール:**\n• 6回以内に正解を当てましょう\n• 🟩 = 文字も位置も正解\n• 🟨 = 文字は正解、位置が違う\n• ⬜ = その文字は含まれない',
                    color: 0x333333,
                    footer: {
                        text: 'ボタンを押してゲームを開始'
                    }
                }],
                components: [row]
            });

            // 成功ログ
            console.log(`Wordle game initiated by ${interaction.user.username} in ${interaction.guildId}`);

        } catch (error) {
            await interaction.reply({
                content: 'Wordleゲームの開始中にエラーが発生しました。',
                ephemeral: true
            });

            console.error('Wordle command error:', {
                error: error instanceof Error ? error.message : String(error),
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }
}