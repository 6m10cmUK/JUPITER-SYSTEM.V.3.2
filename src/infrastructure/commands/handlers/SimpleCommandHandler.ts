import { ChatInputCommandInteraction, ChannelType, PermissionFlagsBits } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';

/**
 * シンプルなコマンド用の汎用ハンドラー
 * 複雑なロジックを持たないコマンドの統一処理
 */
export class SimpleCommandHandler {
    /**
     * R6Sコマンド処理
     * @param interaction Discord インタラクション
     */
    async handleR6S(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const embed = generateEmbed(interaction)
                .setTitle('Rainbow Six Siege')
                .setDescription('R6S関連機能（実装準備中）')
                .setColor(0x333333);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await this.handleError(interaction, error, 'r6s');
        }
    }

    /**
     * テストコマンド処理 - ボイスチャンネル削除機能
     * @param interaction Discord インタラクション
     */
    async handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            await interaction.deferReply();

            // 権限チェック
            if (!interaction.guild) {
                await interaction.editReply('❌ このコマンドはサーバー内でのみ使用できます');
                return;
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const hasAdminPermission = member?.permissions.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !hasAdminPermission) {
                await interaction.editReply('❌ このコマンドは管理者またはサーバーオーナーのみ使用できます');
                return;
            }

            // 「秘匿」「セッション中」ボイスチャンネルを検索
            const targetChannels = interaction.guild.channels.cache
                .filter(channel => 
                    channel.type === ChannelType.GuildVoice && 
                    (channel.name === '秘匿' || channel.name === 'セッション中')
                );

            if (targetChannels.size === 0) {
                await interaction.editReply('ℹ️ 削除対象のボイスチャンネルが見つかりませんでした');
                return;
            }

            const channelNames = targetChannels.map(ch => ch.name);
            console.log(`ボイスチャンネル削除開始: ${channelNames.join(', ')} (${targetChannels.size}個)`);

            // 並列削除実行
            const deletionPromises = targetChannels.map(channel => channel.delete('テストコマンドによる自動削除'));
            await Promise.all(deletionPromises);

            const embed = generateEmbed(interaction)
                .setTitle('🗑️ ボイスチャンネル削除完了')
                .setDescription([
                    `**削除されたボイスチャンネル:**`,
                    ...channelNames.map(name => `- ${name}`),
                    ``,
                    `**削除数:** ${targetChannels.size}個`,
                    `**実行者:** ${interaction.user.username}`
                ].join('\n'))
                .setColor(0xFF6B6B); // 赤色

            await interaction.editReply({ embeds: [embed] });

            // 削除ログ
            console.log(`ボイスチャンネル削除完了:`, {
                deletedChannels: channelNames,
                count: targetChannels.size,
                executor: interaction.user.username,
                executorId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await this.handleError(interaction, error, 'test');
        }
    }

    /**
     * 通知コマンド処理
     * @param interaction Discord インタラクション
     */
    async handleNotify(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const embed = generateEmbed(interaction)
                .setTitle('📢 通知システム')
                .setDescription('通知機能（実装準備中）')
                .setColor(0x0099FF);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await this.handleError(interaction, error, 'notify');
        }
    }

    /**
     * 統一エラーハンドリング（二重応答対策付き）
     * @param interaction Discord インタラクション
     * @param error エラー
     * @param commandName コマンド名
     */
    private async handleError(
        interaction: ChatInputCommandInteraction, 
        error: unknown, 
        commandName: string
    ): Promise<void> {
        const errorMessage = `${commandName}コマンドの処理中にエラーが発生しました。`;
        
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        } catch {
            // 二次的な応答エラーは握りつぶす
        }

        // 統一構造化ログ
        console.error(`${commandName} command error`, {
            err: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : String(error),
            userId: interaction.user.id,
            guildId: interaction.guildId ?? 'DM',
            command: commandName
        });
    }
}