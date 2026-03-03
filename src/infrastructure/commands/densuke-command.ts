import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { createDensukeCommandHandler } from '../factories/CommandHandlerFactory';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('densuke')
    .setDescription('日付カレンダーを表示します')
    .addIntegerOption(option =>
      option
        .setName('months')
        .setDescription('表示する月数（デフォルト: 3）')
        .setMinValue(1)
        .setMaxValue(12)
    )
    .addStringOption(option =>
      option
        .setName('start_date')
        .setDescription('開始日 (YYYY-MM-DD形式、デフォルト: 明日)')
        .addChoices(
          { name: '明日', value: 'tomorrow' },
          { name: '来月1日', value: 'next_month' }
        )
    )
    .addStringOption(option =>
      option
        .setName('filter')
        .setDescription('表示フィルター')
        .addChoices(
          { name: '全て', value: 'all' },
          { name: '土日祝', value: 'holidays_only' }
        )
    ) as SlashCommandBuilder,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const handler = createDensukeCommandHandler();
    await handler.execute(interaction);
  }
};