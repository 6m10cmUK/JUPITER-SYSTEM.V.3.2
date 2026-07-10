import { 
  ButtonInteraction,
  StringSelectMenuInteraction
} from 'discord.js';
import { activeGames } from './wordleStart';
import { logResult } from '../shared/utils/UsageLogger';

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
    logResult(interaction, `status=failed action=giveup gameKey=${gameKey} cause=game-not-found`);
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
          value: `${game.getGuessCount()}回`,
          inline: true
        }
      ],
      footer: {
        text: '/wordle でもう一度プレイ'
      }
    }],
    components: []
  });
  logResult(
    interaction,
    `status=success action=giveup gameKey=${gameKey} guesses=${game.getGuessCount()} answer=${game.answer}`
  );
}
