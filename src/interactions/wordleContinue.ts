import { 
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { activeGames } from './wordleStart';

export const prefix = 'wordle:continue';

export async function execute(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  if (!interaction.isButton()) return;
  
  const gameKey = interaction.customId.split(':')[2];
  const game = activeGames.get(gameKey);

  if (!game) {
    await interaction.reply({ 
      content: 'ゲームが見つかりません。新しくゲームを開始してください。', 
      ephemeral: true 
    });
    return;
  }

  // モーダルを作成
  const modal = new ModalBuilder()
    .setCustomId(`wordle:guess:${gameKey}`)
    .setTitle(`🎯 日本語Wordle (${game.getGuessCount() + 1}回目)`);

  const historyDisplay = game.getGuessHistory();
  
  const guessInput = new TextInputBuilder()
    .setCustomId('guess')
    .setLabel(`履歴:\n${historyDisplay || 'まだ推測していません'}`)
    .setPlaceholder('4文字のひらがなを入力')
    .setStyle(TextInputStyle.Short)
    .setMinLength(4)
    .setMaxLength(4)
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>()
    .addComponents(guessInput);

  modal.addComponents(row);

  await interaction.showModal(modal);
}