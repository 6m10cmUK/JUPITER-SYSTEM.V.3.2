import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { createErrorMessage } from '../../presentation/discord/builders/messages';
import { logError, logResult } from '../../shared/utils/UsageLogger';
import { canStopRelay, RelayError } from '../voice/relayPolicy';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('relay')
        .setDescription('ボイスチャンネルの音声を別のチャンネルに中継')
        .addSubcommand(sub => sub.setName('start').setDescription('音声中継を開始')
            .addChannelOption(option => option.setName('to').setDescription('中継先')
                .addChannelTypes(ChannelType.GuildVoice).setRequired(true)))
        .addSubcommand(sub => sub.setName('stop').setDescription('音声中継を終了'))
        .addSubcommand(sub => sub.setName('status').setDescription('音声中継の状態を表示')) as SlashCommandBuilder,

    async execute(interaction) {
        try {
            if (!interaction.guild) throw new RelayError('サーバー内で実行してください');
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const { getVoiceRelayService } = await import('../voice/VoiceRelayService');
            const service = getVoiceRelayService();
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'start') {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const from = member.voice.channel;
                if (!from) throw new RelayError('ボイスチャンネルに参加してから実行してください');
                if (from.type !== ChannelType.GuildVoice) {
                    throw new RelayError('通常のボイスチャンネルに参加してから実行してください');
                }
                const toOption = interaction.options.getChannel('to', true);
                if (from.id === toOption.id) throw new RelayError('中継元と中継先は別のチャンネルを指定してください');
                const to = await interaction.guild.channels.fetch(toOption.id);
                if (to?.type !== ChannelType.GuildVoice) {
                    throw new RelayError('通常のボイスチャンネルを指定してください');
                }
                if (!(to.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]) ?? false)) {
                    throw new RelayError('中継元に参加し、中継先の ViewChannel・Connect・Speak 権限を持つ人だけ開始できます');
                }
                const announcement = await from.send({
                    content: `🔴 この VC の参加者全員の音声が <#${to.id}> に流れます`,
                    allowedMentions: { parse: [] }
                }).catch(error => {
                    logError(interaction, error, '/relay start notification');
                    throw new RelayError('中継元に開始通知を送れなかったため、中継を開始しませんでした');
                });
                try {
                    await service.start({ guild: interaction.guild, from, to, listenerClient: interaction.client, startedBy: member.id });
                } catch (error) {
                    await announcement.delete().catch(deleteError => logError(interaction, deleteError, '/relay announcement cleanup'));
                    throw error;
                }
                await interaction.editReply({ content: `<#${from.id}> → <#${to.id}> の中継を開始しました`, allowedMentions: { parse: [] } });
            } else if (subcommand === 'stop') {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const status = service.status(guildId);
                if (!status) {
                    await interaction.editReply('中継は開始されていません');
                    return;
                }
                if (!canStopRelay({ channelId: member.voice.channelId, fromId: status.from.id,
                    userId: member.id, startedBy: status.startedBy, ownerId: process.env.OWNER_ID,
                    administrator: member.permissions.has(PermissionFlagsBits.Administrator) })) {
                    throw new RelayError('中継元の参加者・開始者・bot オーナー・管理者だけ終了できます');
                }
                service.stop(guildId);
                await interaction.editReply('中継を終了しました');
            } else {
                const status = service.status(guildId);
                await interaction.editReply({
                    content: status
                        ? `<#${status.from.id}> → <#${status.to.id}>\n開始時刻 <t:${Math.floor(status.startedAt.getTime() / 1000)}:F>`
                        : '中継は開始されていません',
                    allowedMentions: { parse: [] }
                });
            }
            logResult(interaction, `status=success action=${subcommand}`);
        } catch (error) {
            logError(interaction, error, '/relay');
            const reply = createErrorMessage(interaction, 'RELAY FAILED',
                error instanceof RelayError ? error.message : '中継の操作に失敗しました');
            if (interaction.deferred) await interaction.editReply(reply);
            else if (interaction.replied) await interaction.followUp({ ...reply, flags: MessageFlags.Ephemeral });
            else await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral });
        }
    }
};
