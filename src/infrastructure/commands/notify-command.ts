import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';
import { createErrorMessage } from '../../presentation/discord/builders/messages';
import { WebSocketServer } from '../websocket/WebSocketServer';
import { logError, logResult } from '../../shared/utils/UsageLogger';
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
        try {
            const message = interaction.options.getString('message', true) || 'ユピテルに通知';
            const title = 'Discord通知';
            const duration = 10; // 10秒固定
            
            if (!this.wsServer) {
                await interaction.reply({
                    content: '通知システムが利用できません。',
                    ephemeral: true
                });
                logResult(interaction, `status=unavailable target=WindowsPC duration=${duration}s messageLength=${message.length}`);
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
            logResult(interaction, `status=success target=WindowsPC duration=${duration}s messageLength=${message.length}`);
        } catch (error) {
            logError(interaction, error, '/610');

            const errorReply = {
                ...createErrorMessage(interaction, 'NOTIFY FAILED', '通知の送信中にエラーが発生しました。'),
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(errorReply);
            } else {
                await interaction.reply(errorReply);
            }
        }
    }
}

// デフォルトエクスポート（WebSocketサーバーなし）
export const command = new NotifyCommand();

// WebSocketサーバー付きのファクトリー関数
export const createNotifyCommand = (wsServer?: WebSocketServer) => new NotifyCommand(wsServer);
