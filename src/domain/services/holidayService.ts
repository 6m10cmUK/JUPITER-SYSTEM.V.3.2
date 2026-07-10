import { logSystem } from '../../shared/utils/UsageLogger';

export interface Holiday {
  date: Date;
  name: string;
}

export class HolidayService {
  private holidayCache: Map<string, Holiday[]> = new Map();

  async getHolidays(startDate: Date, endDate: Date): Promise<Holiday[]> {
    const holidays: Holiday[] = [];
    const year = startDate.getFullYear();
    const nextYear = endDate.getFullYear();

    for (let y = year; y <= nextYear; y++) {
      const yearHolidays = await this.getHolidaysForYear(y);
      holidays.push(...yearHolidays.filter(h => h.date >= startDate && h.date <= endDate));
    }

    return holidays;
  }

  private async getHolidaysForYear(year: number): Promise<Holiday[]> {
    const cacheKey = year.toString();
    
    if (this.holidayCache.has(cacheKey)) {
      return this.holidayCache.get(cacheKey)!;
    }

    try {
      // Node.js 18以降ではfetchが標準で利用可能
      const response = await fetch(`https://holidays-jp.github.io/api/v1/${year}/date.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as Record<string, string>;
      
      const holidays: Holiday[] = Object.entries(data).map(([dateStr, name]) => ({
        date: new Date(dateStr),
        name: name
      }));

      this.holidayCache.set(cacheKey, holidays);
      return holidays;
    } catch (error) {
      console.error(`Failed to fetch holidays for year ${year}:`, error);
      logSystem('holiday', 'API取得失敗、デフォルト祝日データで継続');
      return this.getDefaultHolidays(year);
    }
  }

  private getDefaultHolidays(year: number): Holiday[] {
    const holidays: Holiday[] = [
      { date: new Date(year, 0, 1), name: '元日' },
      { date: new Date(year, 0, 2), name: '振替休日' },
      { date: new Date(year, 1, 11), name: '建国記念の日' },
      { date: new Date(year, 1, 23), name: '天皇誕生日' },
      { date: new Date(year, 3, 29), name: '昭和の日' },
      { date: new Date(year, 4, 3), name: '憲法記念日' },
      { date: new Date(year, 4, 4), name: 'みどりの日' },
      { date: new Date(year, 4, 5), name: 'こどもの日' },
      { date: new Date(year, 7, 11), name: '山の日' },
      { date: new Date(year, 10, 3), name: '文化の日' },
      { date: new Date(year, 10, 23), name: '勤労感謝の日' }
    ];

    return holidays;
  }

  isHoliday(date: Date, holidays: Holiday[]): boolean {
    return holidays.some(h => 
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate()
    );
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
}
