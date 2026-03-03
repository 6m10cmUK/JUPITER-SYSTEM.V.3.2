import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';
import { WebSocketServer } from '../websocket/WebSocketServer';
import * as packageJson from '../../../package.json';

export class NotifyCommand implements Command {
    data = new SlashCommandBuilder()
        .setName('610')
        .setDescription('ユピテルのwindowsPCに通知が送信されます。PC前にいたら流石に気付きます。')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('通知メッセージ')
                .setRequired(true)
                .setAutocomplete(true)) as SlashCommandBuilder;
    
    constructor(private wsServer?: WebSocketServer) {
    }

    async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        await interaction.respond([
            { name: 'ユピテルに通知', value: 'ユピテルに通知' }
        ]);
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        
        const message = interaction.options.getString('message', true) || 'ユピテルに通知';
        const title = 'Discord通知';
        const duration = 10; // 10秒固定
        
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
        
        const embed = generateEmbed(interaction)
            .setTitle(`[JUPITER-SYSTEM ${packageJson.version}] 通知送信完了`)
            .setDescription(message)
            .setColor(0x610610);
        
        await interaction.reply({ embeds: [embed] });
    }
}

// デフォルトエクスポート（WebSocketサーバーなし）
export const command = new NotifyCommand();

// WebSocketサーバー付きのファクトリー関数
export const createNotifyCommand = (wsServer?: WebSocketServer) => new NotifyCommand(wsServer);