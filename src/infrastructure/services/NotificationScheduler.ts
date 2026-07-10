import * as cron from 'node-cron';
import { WebSocketServer } from '../websocket/WebSocketServer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { logSystem } from '../../shared/utils/UsageLogger';

interface ScheduledNotification {
  id: string;
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';
  cronExpression: string;
  message: string;
  createdBy: string;
  timeString: string;
  task?: cron.ScheduledTask;
  scheduledDate?: string;
  repeat: string;
  interval: number;
  until?: string;
  nextExecutionDate?: string;
}

interface ScheduleOptions {
  date: Date;
  message: string;
  repeat: string;
  interval: number;
  until?: Date;
  createdBy: string;
}

export class NotificationScheduler {
  private schedules: Map<string, ScheduledNotification> = new Map();
  private webSocketServer: WebSocketServer;
  private dataFile: string;

  constructor(webSocketServer: WebSocketServer) {
    this.webSocketServer = webSocketServer;
    this.dataFile = path.join(process.cwd(), 'data', 'schedules.json');
    
    // データディレクトリの作成
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 保存されたスケジュールを読み込み
    this.loadSchedules();
  }

  addSchedule(options: ScheduleOptions): string {
    const { date, message, repeat, interval, until, createdBy } = options;
    const id = uuidv4().substring(0, 8);
    
    // cronExpressionの生成
    const cronExpression = this.generateCronExpression(date, repeat, interval);
    
    // timeStringの生成
    const timeString = this.generateTimeString(date, repeat, interval, until);
    
    const schedule: ScheduledNotification = {
      id,
      type: repeat === 'none' ? 'once' : repeat as ScheduledNotification['type'],
      cronExpression,
      message,
      createdBy,
      timeString,
      scheduledDate: date.toISOString(),
      repeat,
      interval,
      until: until?.toISOString(),
      nextExecutionDate: date.toISOString()
    };

    this.createCronJob(schedule);
    this.schedules.set(schedule.id, schedule);
    this.saveSchedules();
    
    return id;
  }

  private generateCronExpression(date: Date, repeat: string, interval: number): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    
    switch (repeat) {
      case 'none':
        return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
      case 'daily':
        return interval === 1 
          ? `${minutes} ${hours} * * *`
          : `${minutes} ${hours} */${interval} * *`;
      case 'weekly':
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      case 'weekdays':
        return `${minutes} ${hours} * * 1-5`;
      case 'monthly':
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      case 'yearly':
        return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  private generateTimeString(date: Date, repeat: string, interval: number, until?: Date): string {
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = date.toLocaleDateString('ja-JP');
    
    if (repeat === 'none') {
      return `${dateStr} ${timeStr}`;
    }
    
    const repeatLabels: Record<string, string> = {
      'daily': '毎日',
      'weekdays': '毎週（平日）',
      'weekly': '毎週',
      'monthly': '毎月',
      'yearly': '毎年'
    };
    
    let result = `${repeatLabels[repeat]} ${timeStr}`;
    if (interval > 1) {
      result += ` (${interval}回ごと)`;
    }
    if (until) {
      result += ` ～ ${until.toLocaleDateString('ja-JP')}まで`;
    }
    
    return result;
  }


  private createCronJob(schedule: ScheduledNotification): void {
    const task = cron.schedule(schedule.cronExpression, () => {
      try {
        // 終了日のチェック
        if (schedule.until) {
          const untilDate = new Date(schedule.until);
          if (new Date() > untilDate) {
            this.removeSchedule(schedule.id);
            return;
          }
        }

        this.sendNotification(schedule);

        // 1回限りのスケジュールは実行後に削除
        if (schedule.type === 'once') {
          this.removeSchedule(schedule.id);
        }
      } catch (error) {
        logSystem('scheduler', `cron実行エラー: id=${schedule.id} type=${schedule.type} cron=${schedule.cronExpression} ${formatErrorMessage(error)}`);
        console.error('[Scheduler] cron実行エラー:', getErrorStack(error) ?? error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Tokyo'
    });

    schedule.task = task;
  }

  private sendNotification(schedule: ScheduledNotification): void {
    const notification = {
      type: 'notification' as const,
      title: 'スケジュール通知',
      message: schedule.message,
      sender: `Scheduler (${schedule.createdBy})`
    };

    this.webSocketServer.sendNotification(notification);
    console.log(`[Scheduler] 通知を送信: ${schedule.message}`);
  }

  removeSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.task?.stop();
      this.schedules.delete(id);
      this.saveSchedules();
      return true;
    }
    return false;
  }

  listSchedules(): ScheduledNotification[] {
    return Array.from(this.schedules.values()).map(s => ({
      id: s.id,
      type: s.type,
      cronExpression: s.cronExpression,
      message: s.message,
      createdBy: s.createdBy,
      timeString: s.timeString,
      repeat: s.repeat,
      interval: s.interval,
      until: s.until,
      nextExecutionDate: s.nextExecutionDate
    }));
  }

  private parseTime(time: string): [number, number] {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error('時刻は HH:MM 形式で入力してください');
    }

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('無効な時刻です');
    }

    return [hours, minutes];
  }

  private saveSchedules(): void {
    try {
      const data = Array.from(this.schedules.values()).map(s => ({
        id: s.id,
        type: s.type,
        cronExpression: s.cronExpression,
        message: s.message,
        createdBy: s.createdBy,
        timeString: s.timeString,
        scheduledDate: s.scheduledDate,
        repeat: s.repeat,
        interval: s.interval,
        until: s.until,
        nextExecutionDate: s.nextExecutionDate
      }));

      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('[Scheduler] スケジュールを保存しました');
    } catch (error) {
      logSystem('scheduler', `スケジュール保存失敗: path=${this.dataFile} ${formatErrorMessage(error)}`);
      console.error('[Scheduler] スケジュール保存失敗:', getErrorStack(error) ?? error);
    }
  }

  private loadSchedules(): void {
    if (!fs.existsSync(this.dataFile)) {
      console.log('[Scheduler] スケジュールファイルが存在しません');
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      const now = new Date();

      for (const schedule of data) {
        // 1回限りのスケジュールが過去の場合はスキップ
        if (schedule.type === 'once' && schedule.scheduledDate) {
          const scheduledDate = new Date(schedule.scheduledDate);
          if (scheduledDate < now) {
            console.log(`[Scheduler] 過去のスケジュール (ID: ${schedule.id}) をスキップ`);
            continue;
          }
        }

        this.createCronJob(schedule);
        this.schedules.set(schedule.id, schedule);
      }

      console.log(`[Scheduler] ${this.schedules.size}件のスケジュールを読み込みました`);
    } catch (error) {
      console.error('[Scheduler] スケジュールの読み込みに失敗:', error);
    }
  }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
