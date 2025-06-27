import { 
  ButtonInteraction,
  StringSelectMenuInteraction
} from 'discord.js';
import { activeGames } from './wordleStart';

export const prefix = 'wordle:giveup';

export async function execute(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  if (!interaction.isButton()) return;
  
  const gameKey = interaction.customId.split(':')[2];
  const game = activeGames.get(gameKey);

  if (!game) {
    await interaction.reply({ 
      content: 'ゲームが見つかりません。', 
      ephemeral: true 
    });
    return;
  }

  // ゲームを終了
  activeGames.delete(gameKey);
  
  await interaction.update({
    embeds: [{
      title: '😢 ギブアップ',
      description: game.getGuessHistory(),
      color: 0xFF0000,
      fields: [
        {
          name: '答え',
          value: game.answer,
          inline: true
        },
        {
          name: '試行回数',
          value: `${game.guesses.length}回`,
          inline: true
        }
      ],
      footer: {
        text: '/wordle でもう一度プレイ'
      }
    }],
    components: []
  });
}