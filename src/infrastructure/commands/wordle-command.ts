import { Command } from '../../interfaces/Command';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction } from 'discord.js';

const wordleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('日本語版Wordleを遊ぶ（4文字）'),

  async execute(interaction: ChatInputCommandInteraction) {
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
  },
};

export const command = wordleCommand;