import { ChatInputCommandInteraction } from 'discord.js';
import { HolidayService } from '../../../domain/services/holidayService';
import { DensukeEmbedFormatter } from '../../../presentation/formatters/densukeEmbedFormatter';
import { logResult } from '../../../shared/utils/UsageLogger';

export class DensukeCommandHandler {
  constructor(private holidayService: HolidayService, private formatter: DensukeEmbedFormatter) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const months = interaction.options.getInteger('months') ?? 3;
      const startDateStr = interaction.options.getString('start_date');
      const filter = interaction.options.getString('filter') ?? 'all';

      let startDate: Date;
      if (!startDateStr) {
        // デフォルトは明日
        startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
      } else if (startDateStr === 'tomorrow') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
      } else if (startDateStr === 'next_month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(1);
      } else {
        // YYYY-MM-DD形式の日付
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          await interaction.editReply({
            content: '❌ 開始日の形式が正しくありません。YYYY-MM-DD形式で入力してください。'
          });
          return;
        }
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      const holidays = await this.holidayService.getHolidays(startDate, endDate);
      const embed = this.formatter.formatCalendar(startDate, endDate, holidays, filter);

      await interaction.editReply({ embeds: [embed] });
      logResult(
        interaction,
        `status=success url=https://densuke.biz/ start=${formatDateForLog(startDate)} end=${formatDateForLog(endDate)} holidays=${holidays.length}`
      );
    } catch (error) {
      console.error('Error in densuke command:', error);
      await interaction.editReply({
        content: '❌ カレンダーの生成中にエラーが発生しました。'
      });
    }
  }
}

function formatDateForLog(date: Date): string {
  return date.toISOString().slice(0, 10);
}
