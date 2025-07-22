import * as cron from 'node-cron';
import { WebSocketServer } from '../websocket/WebSocketServer';
import { v4 as uuidv4 } from 'uuid';

interface ScheduledNotification {
  id: string;
  type: 'once' | 'daily' | 'weekly';
  cronExpression: string;
  message: string;
  createdBy: string;
  timeString: string;
  task?: cron.ScheduledTask;
}

export class NotificationScheduler {
  private schedules: Map<string, ScheduledNotification> = new Map();
  private webSocketServer: WebSocketServer;

  constructor(webSocketServer: WebSocketServer) {
    this.webSocketServer = webSocketServer;
  }

  scheduleOnce(time: string, message: string, createdBy: string): string {
    const [hours, minutes] = this.parseTime(time);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // 過去の時刻の場合は翌日に設定
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const id = uuidv4().substring(0, 8);
    const schedule: ScheduledNotification = {
      id,
      type: 'once',
      cronExpression: `${minutes} ${hours} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`,
      message,
      createdBy,
      timeString: `${scheduledTime.toLocaleDateString('ja-JP')} ${time}`
    };

    this.addSchedule(schedule);
    return id;
  }

  scheduleDaily(time: string, message: string, createdBy: string): string {
    const [hours, minutes] = this.parseTime(time);
    const id = uuidv4().substring(0, 8);
    
    const schedule: ScheduledNotification = {
      id,
      type: 'daily',
      cronExpression: `${minutes} ${hours} * * *`,
      message,
      createdBy,
      timeString: `毎日 ${time}`
    };

    this.addSchedule(schedule);
    return id;
  }

  scheduleWeekly(dayOfWeek: number, time: string, message: string, createdBy: string): string {
    const [hours, minutes] = this.parseTime(time);
    const id = uuidv4().substring(0, 8);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    const schedule: ScheduledNotification = {
      id,
      type: 'weekly',
      cronExpression: `${minutes} ${hours} * * ${dayOfWeek}`,
      message,
      createdBy,
      timeString: `毎週${dayNames[dayOfWeek]}曜日 ${time}`
    };

    this.addSchedule(schedule);
    return id;
  }

  private addSchedule(schedule: ScheduledNotification): void {
    const task = cron.schedule(schedule.cronExpression, () => {
      this.sendNotification(schedule);

      // 1回限りのスケジュールは実行後に削除
      if (schedule.type === 'once') {
        this.removeSchedule(schedule.id);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Tokyo'
    });

    schedule.task = task;
    this.schedules.set(schedule.id, schedule);
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
      timeString: s.timeString
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
}