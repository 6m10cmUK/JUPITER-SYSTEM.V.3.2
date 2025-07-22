import { 
  SlashCommandBuilder, 
  CommandInteraction, 
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { Command } from './types';

let scheduler: NotificationScheduler | null = null;

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('通知のスケジュールを設定します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('新しい通知をスケジュール')
        .addStringOption(option =>
          option
            .setName('date')
            .setDescription('日付 (YYYY-MM-DD形式、例: 2024-12-31) または "today", "tomorrow"')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('時刻 (HH:MM形式、例: 14:30)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('通知メッセージ')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('repeat')
            .setDescription('繰り返し設定')
            .setRequired(false)
            .addChoices(
              { name: '繰り返しなし', value: 'none' },
              { name: '毎日', value: 'daily' },
              { name: '毎週（平日）', value: 'weekdays' },
              { name: '毎週', value: 'weekly' },
              { name: '毎月', value: 'monthly' },
              { name: '毎年', value: 'yearly' }
            ))
        .addIntegerOption(option =>
          option
            .setName('interval')
            .setDescription('繰り返し間隔（例: 2を指定すると「2日ごと」）')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365))
        .addStringOption(option =>
          option
            .setName('until')
            .setDescription('終了日 (YYYY-MM-DD形式) - 繰り返しの終了日')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('quick')
        .setDescription('モーダルで簡単に通知をスケジュール'))
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
    if (!interaction.isChatInputCommand()) return;
    
    if (!scheduler) {
      scheduler = (global as any).scheduler || new NotificationScheduler((global as any).webSocketServer);
    }

    const subcommand = interaction.options.getSubcommand();
    
    if (!scheduler) {
      await interaction.reply({
        content: '❌ スケジューラーの初期化に失敗しました',
        ephemeral: true
      });
      return;
    }

    switch (subcommand) {
      case 'add': {
        const dateStr = interaction.options.getString('date', true);
        const time = interaction.options.getString('time', true);
        const message = interaction.options.getString('message', true);
        const repeat = interaction.options.getString('repeat') || 'none';
        const interval = interaction.options.getInteger('interval') || 1;
        const until = interaction.options.getString('until');
        
        try {
          // 日付の解析
          let date: Date;
          const today = new Date();
          if (dateStr.toLowerCase() === 'today') {
            date = today;
          } else if (dateStr.toLowerCase() === 'tomorrow') {
            date = new Date(today);
            date.setDate(date.getDate() + 1);
          } else {
            date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              throw new Error('無効な日付形式です');
            }
          }
          
          // 時刻の設定
          const [hours, minutes] = time.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
          
          // スケジュールの作成
          const id = scheduler.addSchedule({
            date,
            message,
            repeat,
            interval,
            until: until ? new Date(until) : undefined,
            createdBy: interaction.user.username
          });
          
          // 確認メッセージの作成
          let confirmMessage = `✅ 通知をスケジュールしました\n`;
          confirmMessage += `ID: ${id}\n`;
          confirmMessage += `日時: ${date.toLocaleDateString('ja-JP')} ${time}\n`;
          confirmMessage += `メッセージ: ${message}\n`;
          
          if (repeat !== 'none') {
            const repeatLabels: Record<string, string> = {
              'daily': '毎日',
              'weekdays': '毎週（平日）',
              'weekly': '毎週',
              'monthly': '毎月',
              'yearly': '毎年'
            };
            confirmMessage += `繰り返し: ${repeatLabels[repeat]}`;
            if (interval > 1) {
              confirmMessage += ` (${interval}回ごと)`;
            }
            confirmMessage += '\n';
            if (until) {
              confirmMessage += `終了日: ${new Date(until).toLocaleDateString('ja-JP')}\n`;
            }
          }
          
          await interaction.reply({
            content: confirmMessage,
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

      case 'quick': {
        // モーダルの作成
        const modal = new ModalBuilder()
          .setCustomId('schedule_modal')
          .setTitle('通知のスケジュール設定');

        // 日付入力
        const dateInput = new TextInputBuilder()
          .setCustomId('date_input')
          .setLabel('日付')
          .setPlaceholder('YYYY-MM-DD または today, tomorrow')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(new Date().toISOString().split('T')[0]);

        // 時刻入力
        const timeInput = new TextInputBuilder()
          .setCustomId('time_input')
          .setLabel('時刻')
          .setPlaceholder('HH:MM (例: 14:30)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue('12:00');

        // メッセージ入力
        const messageInput = new TextInputBuilder()
          .setCustomId('message_input')
          .setLabel('通知メッセージ')
          .setPlaceholder('通知したい内容を入力')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        // 繰り返し設定（オプション）
        const repeatInput = new TextInputBuilder()
          .setCustomId('repeat_input')
          .setLabel('繰り返し設定（オプション）')
          .setPlaceholder('none, daily, weekdays, weekly, monthly, yearly')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue('none');

        // 終了日（オプション）
        const untilInput = new TextInputBuilder()
          .setCustomId('until_input')
          .setLabel('終了日（オプション）')
          .setPlaceholder('YYYY-MM-DD (繰り返しの終了日)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        // モーダルに追加
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(repeatInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(untilInput)
        );

        await interaction.showModal(modal);
        
        // モーダルの送信を待つ
        try {
          const modalSubmit = await interaction.awaitModalSubmit({
            time: 300000, // 5分
            filter: i => i.customId === 'schedule_modal' && i.user.id === interaction.user.id
          });

          const dateStr = modalSubmit.fields.getTextInputValue('date_input');
          const time = modalSubmit.fields.getTextInputValue('time_input');
          const message = modalSubmit.fields.getTextInputValue('message_input');
          const repeat = modalSubmit.fields.getTextInputValue('repeat_input') || 'none';
          const until = modalSubmit.fields.getTextInputValue('until_input');

          // 日付の解析
          let date: Date;
          const today = new Date();
          if (dateStr.toLowerCase() === 'today') {
            date = today;
          } else if (dateStr.toLowerCase() === 'tomorrow') {
            date = new Date(today);
            date.setDate(date.getDate() + 1);
          } else {
            date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              await modalSubmit.reply({
                content: '❌ 無効な日付形式です',
                ephemeral: true
              });
              return;
            }
          }

          // 時刻の設定
          const [hours, minutes] = time.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);

          // スケジュールの作成
          const id = scheduler.addSchedule({
            date,
            message,
            repeat,
            interval: 1,
            until: until ? new Date(until) : undefined,
            createdBy: modalSubmit.user.username
          });

          // 確認メッセージ
          let confirmMessage = `✅ 通知をスケジュールしました\n`;
          confirmMessage += `ID: ${id}\n`;
          confirmMessage += `日時: ${date.toLocaleDateString('ja-JP')} ${time}\n`;
          confirmMessage += `メッセージ: ${message}\n`;
          
          if (repeat !== 'none') {
            const repeatLabels: Record<string, string> = {
              'daily': '毎日',
              'weekdays': '毎週（平日）',
              'weekly': '毎週',
              'monthly': '毎月',
              'yearly': '毎年'
            };
            confirmMessage += `繰り返し: ${repeatLabels[repeat] || repeat}\n`;
            if (until) {
              confirmMessage += `終了日: ${new Date(until).toLocaleDateString('ja-JP')}\n`;
            }
          }

          await modalSubmit.reply({
            content: confirmMessage,
            ephemeral: true
          });

        } catch (error) {
          console.error('Modal timeout or error:', error);
        }
        break;
      }
    }
  }
};