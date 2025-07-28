import { EmbedBuilder } from 'discord.js';
import { Holiday, HolidayService } from '../../domain/services/holidayService';

export class DensukeEmbedFormatter {
  private holidayService: HolidayService;

  constructor() {
    this.holidayService = new HolidayService();
  }

  formatCalendar(startDate: Date, endDate: Date, holidays: Holiday[], filter: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('伝助日付データセット')
      .setColor(0x333333)
      .setTimestamp();

    const dateArray: string[] = [];
    const currentDate = new Date(startDate);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dayOfWeek = dayNames[currentDate.getDay()];
      
      const isWeekend = this.holidayService.isWeekend(currentDate);
      const holiday = holidays.find(h => 
        h.date.getFullYear() === currentDate.getFullYear() &&
        h.date.getMonth() === currentDate.getMonth() &&
        h.date.getDate() === currentDate.getDate()
      );

      let dayLabel = dayOfWeek;
      if (holiday) {
        dayLabel = `${dayOfWeek}・祝`;
      }

      const shouldShow = filter === 'all' || isWeekend || holiday;

      if (shouldShow) {
        const line = `${year}/${month}/${day}（${dayLabel}）`;
        dateArray.push(line);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (dateArray.length === 0) {
      embed.setDescription('該当なし');
    } else {
      // まずDescriptionに収める試み（最大4096文字）
      const content = dateArray.join('\n');
      const maxDescriptionLength = 4096;
      
      if (content.length <= maxDescriptionLength) {
        embed.setDescription(content);
      } else {
        // 4096文字を超える場合はDescriptionとFieldsに分割
        const descriptionArray = [];
        let currentLength = 0;
        let remainingArray = [...dateArray];
        
        // Descriptionに入る分を計算
        for (let i = 0; i < dateArray.length; i++) {
          const line = dateArray[i];
          if (currentLength + line.length + 1 > maxDescriptionLength - 10) {
            remainingArray = dateArray.slice(i);
            break;
          }
          descriptionArray.push(line);
          currentLength += line.length + 1;
        }
        
        embed.setDescription(descriptionArray.join('\n'));
        
        // 残りをFieldsに分割（各Field最大1024文字、最大25フィールド）
        const maxFieldLength = 1024;
        const maxFields = 25;
        let fieldCount = 0;
        
        while (remainingArray.length > 0 && fieldCount < maxFields) {
          const fieldArray = [];
          let fieldLength = 0;
          
          while (remainingArray.length > 0) {
            const line = remainingArray[0];
            if (fieldLength + line.length + 1 > maxFieldLength - 10) {
              break;
            }
            fieldArray.push(remainingArray.shift());
            fieldLength += line.length + 1;
          }
          
          if (fieldArray.length > 0) {
            embed.addFields({
              name: '\u200B', // ゼロ幅スペース（見えないが有効な文字）
              value: fieldArray.join('\n'),
              inline: false
            });
            fieldCount++;
          }
        }
        
        // まだ残っている場合は省略メッセージ
        if (remainingArray.length > 0) {
          embed.setFooter({ 
            text: `フィルター: ${filter === 'holidays_only' ? '土日祝のみ' : '全て'} | 他${remainingArray.length}件省略` 
          });
          return embed;
        }
      }
    }

    const filterText = filter === 'holidays_only' ? '土日祝のみ' : '全て';
    embed.setFooter({ text: `フィルター: ${filterText}` });

    return embed;
  }
}