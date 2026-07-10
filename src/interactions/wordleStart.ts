import { 
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { WordleGame } from '../domain/entities/WordleGame';
import * as wordleWords from '../data/wordle-words.json';
import { logResult } from '../shared/utils/UsageLogger';

// ゲーム状態を保存するMap（本番ではRedisなどを使用推奨）
export const activeGames = new Map<string, WordleGame>();

export const prefix = 'wordle:start';

export async function execute(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  try {
    // Type guard to ensure this is a button interaction
    if (!interaction.isButton()) return;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    const gameKey = `${userId}:${channelId}`;

    // ランダムに答えを選択
    const answer = wordleWords.words[Math.floor(Math.random() * wordleWords.words.length)];
    
    // 新しいゲームを作成
    const game = new WordleGame(userId, channelId, answer, new Date());
    activeGames.set(gameKey, game);

    // モーダルを作成
    const modal = new ModalBuilder()
      .setCustomId(`wordle:guess:${gameKey}`)
      .setTitle('🎯 日本語Wordle');

    const guessInput = new TextInputBuilder()
      .setCustomId('guess')
      .setLabel('4文字のひらがなを入力してください')
      .setPlaceholder('例: あさがお')
      .setStyle(TextInputStyle.Short)
      .setMinLength(4)
      .setMaxLength(4)
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(guessInput);

    modal.addComponents(row);

    await interaction.showModal(modal);
    logResult(interaction, `status=success action=start gameKey=${gameKey} answer=${answer}`);
  } catch (error) {
    console.error('Error in wordleStart execute:', error);
    throw error;
  }
}
