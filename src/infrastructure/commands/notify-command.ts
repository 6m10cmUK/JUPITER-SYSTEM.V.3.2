import { SlashCommandBuilder, CommandInteraction, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../interfaces/Command';
import { createInfoMessage } from '../../presentation/discord/builders/messages';
import { WebSocketServer } from '../websocket/WebSocketServer';

export class NotifyCommand implements Command {
    data: SlashCommandBuilder;
    
    constructor(private wsServer?: WebSocketServer) {
        this.data = new SlashCommandBuilder()
            .setName('610')
            .setDescription('Windows PCに全画面通知を送信します')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('通知メッセージ')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('通知タイトル')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('duration')
                    .setDescription('表示秒数（デフォルト: 5秒）')
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(60))
            as SlashCommandBuilder;
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        const chatInteraction = interaction as ChatInputCommandInteraction;
        
        const message = chatInteraction.options.getString('message', true);
        const title = chatInteraction.options.getString('title') || 'Discord通知';
        const duration = chatInteraction.options.getInteger('duration') || 5;
        
        if (!this.wsServer) {
            await interaction.reply({
                content: '通知システムが利用できません。',
                ephemeral: true
            });
            return;
        }
        
        // WebSocket経由で通知を送信
        this.wsServer.sendNotification({
            type: 'notification',
            title,
            message,
            duration: duration * 1000, // ミリ秒に変換
            sender: interaction.user.username
        });
        
        const embed = createInfoMessage({
            title: '通知送信完了',
            description: `Windows PCに通知を送信しました\n\n**タイトル:** ${title}\n**メッセージ:** ${message}\n**表示時間:** ${duration}秒`
        });
        
        await interaction.reply({ embeds: [embed] });
    }
}

export const createNotifyCommand = (wsServer?: WebSocketServer) => new NotifyCommand(wsServer);