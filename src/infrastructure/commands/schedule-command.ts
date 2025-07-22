import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { Command } from './types';

let scheduler: NotificationScheduler | null = null;

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('通知のスケジュールを設定します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('once')
        .setDescription('1回だけの通知をスケジュール')
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('時刻 (HH:MM形式、例: 14:30)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('通知メッセージ')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('daily')
        .setDescription('毎日の通知をスケジュール')
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('時刻 (HH:MM形式、例: 09:00)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('通知メッセージ')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('weekly')
        .setDescription('毎週の通知をスケジュール')
        .addStringOption(option =>
          option
            .setName('day')
            .setDescription('曜日')
            .setRequired(true)
            .addChoices(
              { name: '月曜日', value: '1' },
              { name: '火曜日', value: '2' },
              { name: '水曜日', value: '3' },
              { name: '木曜日', value: '4' },
              { name: '金曜日', value: '5' },
              { name: '土曜日', value: '6' },
              { name: '日曜日', value: '0' }
            ))
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('時刻 (HH:MM形式、例: 10:00)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('通知メッセージ')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('スケジュール済みの通知一覧を表示'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('スケジュールを削除')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('スケジュールID')
            .setRequired(true))),

  async execute(interaction: CommandInteraction) {
    if (!scheduler) {
      const webSocketServer = (global as any).webSocketServer;
      scheduler = new NotificationScheduler(webSocketServer);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'once': {
        const time = interaction.options.getString('time', true);
        const message = interaction.options.getString('message', true);
        
        try {
          const id = scheduler.scheduleOnce(time, message, interaction.user.username);
          await interaction.reply({
            content: `✅ 通知をスケジュールしました\nID: ${id}\n時刻: ${time}\nメッセージ: ${message}`,
            ephemeral: true
          });
        } catch (error) {
          await interaction.reply({
            content: `❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
            ephemeral: true
          });
        }
        break;
      }

      case 'daily': {
        const time = interaction.options.getString('time', true);
        const message = interaction.options.getString('message', true);
        
        try {
          const id = scheduler.scheduleDaily(time, message, interaction.user.username);
          await interaction.reply({
            content: `✅ 毎日の通知をスケジュールしました\nID: ${id}\n時刻: 毎日 ${time}\nメッセージ: ${message}`,
            ephemeral: true
          });
        } catch (error) {
          await interaction.reply({
            content: `❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
            ephemeral: true
          });
        }
        break;
      }

      case 'weekly': {
        const day = interaction.options.getString('day', true);
        const time = interaction.options.getString('time', true);
        const message = interaction.options.getString('message', true);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        
        try {
          const id = scheduler.scheduleWeekly(parseInt(day), time, message, interaction.user.username);
          await interaction.reply({
            content: `✅ 毎週の通知をスケジュールしました\nID: ${id}\n時刻: 毎週${dayNames[parseInt(day)]}曜日 ${time}\nメッセージ: ${message}`,
            ephemeral: true
          });
        } catch (error) {
          await interaction.reply({
            content: `❌ エラー: ${error instanceof Error ? error.message : String(error)}`,
            ephemeral: true
          });
        }
        break;
      }

      case 'list': {
        const schedules = scheduler.listSchedules();
        if (schedules.length === 0) {
          await interaction.reply({
            content: 'スケジュールされた通知はありません',
            ephemeral: true
          });
        } else {
          const list = schedules.map(s => 
            `**ID: ${s.id}**\n種類: ${s.type}\n時刻: ${s.timeString}\nメッセージ: ${s.message}\n作成者: ${s.createdBy}`
          ).join('\n\n');
          await interaction.reply({
            content: `📅 **スケジュール一覧**\n\n${list}`,
            ephemeral: true
          });
        }
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id', true);
        const removed = scheduler.removeSchedule(id);
        
        if (removed) {
          await interaction.reply({
            content: `✅ スケジュール (ID: ${id}) を削除しました`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `❌ スケジュール (ID: ${id}) が見つかりません`,
            ephemeral: true
          });
        }
        break;
      }
    }
  }
};