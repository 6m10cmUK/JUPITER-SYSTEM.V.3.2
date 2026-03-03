import { 
  ModalSubmitInteraction,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { WordleService } from '../domain/services/WordleService';
import { activeGames } from '../interactions/wordleStart';

// Modal submission handler - not an InteractionHandler
export async function handleWordleGuessModal(interaction: ModalSubmitInteraction) {
    const gameKey = interaction.customId.split(':')[2];
    const game = activeGames.get(gameKey);

    if (!game) {
      await interaction.reply({ 
        content: 'ゲームが見つかりません。新しくゲームを開始してください。', 
        ephemeral: true 
      });
      return;
    }

    const guess = interaction.fields.getTextInputValue('guess');
    
    // ひらがなチェック
    if (!/^[ぁ-ん]{4}$/.test(guess)) {
      await interaction.reply({ 
        content: '4文字のひらがなを入力してください！', 
        ephemeral: true 
      });
      return;
    }

    const wordleService = new WordleService();
    const result = wordleService.checkGuess(guess, game.answer);
    game.addGuess(result);

    if (game.isCompleted) {
      // ゲーム終了
      activeGames.delete(gameKey);
      
      const embed = {
        title: game.isWon ? '🎉 正解！' : '😢 残念...',
        description: game.getGuessHistory(),
        color: game.isWon ? 0x00FF00 : 0xFF0000,
        fields: [
          {
            name: '答え',
            value: game.answer,
            inline: true
          },
          {
            name: '試行回数',
            value: `${game.getGuessCount()}回`,
            inline: true
          }
        ],
        footer: {
          text: '/wordle でもう一度プレイ'
        }
      };

      await interaction.reply({ embeds: [embed] });
    } else {
      // ゲーム継続 - 結果とボタンを表示
      const historyDisplay = game.getGuessHistory();
      
      const continueButton = new ButtonBuilder()
        .setCustomId(`wordle:continue:${gameKey}`)
        .setLabel('次の推測')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎯');

      const giveUpButton = new ButtonBuilder()
        .setCustomId(`wordle:giveup:${gameKey}`)
        .setLabel('ギブアップ')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🏳️');

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(continueButton, giveUpButton);

      await interaction.reply({ 
        embeds: [{
          title: `🎯 日本語Wordle (${game.getGuessCount()}回目)`,
          description: historyDisplay,
          color: 0x333333,
          footer: {
            text: '続けるにはボタンを押してください'
          }
        }],
        components: [row]
      });
    }
}