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
  ComponentType,
  EmbedBuilder,
  AutocompleteInteraction
} from 'discord.js';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { Command } from './types';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';

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
            .setDescription('日付を選択または入力 (YYYY-MM-DD)')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('時刻 (HH:MM)')
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
        .setName('list')
        .setDescription('スケジュール済みの通知一覧を表示'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('スケジュールを削除')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('スケジュールIDを選択')
            .setRequired(true)
            .setAutocomplete(true))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!scheduler) {
      scheduler = (global as any).scheduler || new NotificationScheduler((global as any).webSocketServer);
    }
    
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'date') {
      const value = focusedOption.value.toLowerCase();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // オートコンプリートの選択肢
      const choices = [
        { name: `今日 (${today.toLocaleDateString('ja-JP')})`, value: 'today' },
        { name: `明日 (${tomorrow.toLocaleDateString('ja-JP')})`, value: 'tomorrow' }
      ];
      
      // フィルタリング
      const filtered = choices.filter(choice => 
        choice.name.toLowerCase().includes(value) || 
        choice.value.toLowerCase().includes(value)
      );
      
      await interaction.respond(filtered.slice(0, 25));
    } else if (focusedOption.name === 'id' && scheduler) {
      const schedules = scheduler.listSchedules();
      const value = focusedOption.value.toLowerCase();
      
      const choices = schedules.map(s => ({
        name: `${s.id} - ${s.timeString} - ${s.message.substring(0, 50)}${s.message.length > 50 ? '...' : ''}`,
        value: s.id
      }));
      
      const filtered = choices.filter(choice => 
        choice.name.toLowerCase().includes(value) || 
        choice.value.toLowerCase().includes(value)
      );
      
      await interaction.respond(filtered.slice(0, 25));
    }
  },

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
          const dateStrLower = dateStr.toLowerCase();
          
          if (dateStrLower === 'today') {
            date = today;
          } else if (dateStrLower === 'tomorrow') {
            date = new Date(today);
            date.setDate(date.getDate() + 1);
          } else if (/^\d{8}$/.test(dateStr)) {
            // YYYYMMDD形式
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1; // 月は0ベース
            const day = parseInt(dateStr.substring(6, 8));
            date = new Date(year, month, day);
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // YYYY-MM-DD形式
            date = new Date(dateStr);
          } else {
            // その他の形式を試す
            date = new Date(dateStr);
          }
          
          if (isNaN(date.getTime())) {
            throw new Error('無効な日付形式です。YYYY-MM-DD、YYYYMMDD、today、tomorrow のいずれかを使用してください');
          }
          
          // 時刻の設定
          let hours: number, minutes: number;
          
          if (/^\d{4}$/.test(time)) {
            // HHMM形式
            hours = parseInt(time.substring(0, 2));
            minutes = parseInt(time.substring(2, 4));
          } else if (/^\d{1,2}:\d{2}$/.test(time)) {
            // HH:MM形式
            [hours, minutes] = time.split(':').map(Number);
          } else {
            throw new Error('無効な時刻形式です。HH:MM または HHMM を使用してください');
          }
          
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error('時刻の範囲が不正です');
          }
          
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
          const repeatLabels: Record<string, string> = {
            'none': 'なし',
            'daily': '毎日',
            'weekdays': '毎週（平日）',
            'weekly': '毎週',
            'monthly': '毎月',
            'yearly': '毎年'
          };
          
          const embed = generateEmbed(interaction)
            .setTitle('✅ 通知スケジュール設定完了')
            .setDescription('新しい通知がスケジュールされました')
            .addFields([
              { name: 'ID', value: id, inline: true },
              { name: '日時', value: `${date.toLocaleDateString('ja-JP')} ${time}`, inline: true },
              { name: '繰り返し', value: repeatLabels[repeat] + (interval > 1 ? ` (${interval}回ごと)` : ''), inline: true },
              { name: 'メッセージ', value: message }
            ]);
          
          if (until) {
            embed.addFields({ name: '終了日', value: new Date(until).toLocaleDateString('ja-JP'), inline: true });
          }
          
          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } catch (error) {
          const errorEmbed = generateEmbed(interaction)
            .setTitle('❌ エラーが発生しました')
            .setDescription(error instanceof Error ? error.message : String(error));
          
          await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
          });
        }
        break;
      }

      case 'list': {
        const schedules = scheduler.listSchedules();
        if (schedules.length === 0) {
          const embed = generateEmbed(interaction)
            .setTitle('📅 スケジュール一覧')
            .setDescription('スケジュールされた通知はありません');
          
          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          const embed = generateEmbed(interaction)
            .setTitle('📅 スケジュール一覧')
            .setDescription(`現在 ${schedules.length} 件のスケジュールが登録されています`);
          
          schedules.forEach(s => {
            embed.addFields({
              name: `ID: ${s.id} - ${s.timeString}`,
              value: `メッセージ: ${s.message}\n作成者: ${s.createdBy}`,
              inline: false
            });
          });
          
          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        }
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id', true);
        const removed = scheduler.removeSchedule(id);
        
        if (removed) {
          const embed = generateEmbed(interaction)
            .setTitle('✅ スケジュール削除完了')
            .setDescription(`スケジュール (ID: ${id}) を削除しました`);
          
          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          const embed = generateEmbed(interaction)
            .setTitle('❌ エラー')
            .setDescription(`スケジュール (ID: ${id}) が見つかりません`);
          
          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        }
        break;
      }

    }
  }
};