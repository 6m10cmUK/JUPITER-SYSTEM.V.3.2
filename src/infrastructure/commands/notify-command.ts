import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../interfaces/Command';
import { createInfoMessage } from '../../presentation/discord/builders/messages';
import { WebSocketServer } from '../websocket/WebSocketServer';

export class NotifyCommand implements Command {
    data = new SlashCommandBuilder()
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
                .setMaxValue(60)) as SlashCommandBuilder;
    
    constructor(private wsServer?: WebSocketServer) {
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        
        const message = interaction.options.getString('message', true);
        const title = interaction.options.getString('title') || 'Discord通知';
        const duration = interaction.options.getInteger('duration') || 5;
        
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
        
        const embedMessage = createInfoMessage(
            interaction,
            '通知送信完了',
            `Windows PCに通知を送信しました\n\n**タイトル:** ${title}\n**メッセージ:** ${message}\n**表示時間:** ${duration}秒`
        );
        
        await interaction.reply(embedMessage);
    }
}

export const createNotifyCommand = (wsServer?: WebSocketServer) => new NotifyCommand(wsServer);