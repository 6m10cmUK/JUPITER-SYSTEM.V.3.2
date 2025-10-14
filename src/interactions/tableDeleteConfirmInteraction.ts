import {
    ButtonInteraction,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../presentation/discord/builders/messages';
import { CategoryManagementService } from '../domain/services/CategoryManagementService';

export const prefix = 'table_delete';

export async function execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ このコマンドはサーバー内でのみ使用できます',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // 権限チェック（管理者またはサーバーオーナー）
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    const hasAdminPermission = member?.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !hasAdminPermission) {
        await interaction.reply({
            content: '❌ このコマンドは管理者またはサーバーオーナーのみ使用できます',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // customIdから操作とカテゴリIDを抽出
    const [, action, categoryId] = interaction.customId.split(':');
    console.log(`Table delete action: ${action}, categoryId: ${categoryId}`);

    try {
        if (action === 'confirm') {
            await handleDeleteConfirm(interaction, categoryId);
        } else if (action === 'cancel') {
            await handleDeleteCancel(interaction, categoryId);
        } else {
            await interaction.reply({
                content: '❌ 不明な操作です',
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error('テーブル削除操作エラー:', error);
        await interaction.reply({
            content: '❌ 操作の実行中にエラーが発生しました',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * 削除確認処理
 */
async function handleDeleteConfirm(interaction: ButtonInteraction, categoryId: string): Promise<void> {
    try {
        await interaction.deferUpdate();

        // カテゴリ情報を取得
        const targetCategory = interaction.guild!.channels.cache.get(categoryId);
        if (!targetCategory || targetCategory.type !== 4) {
            await interaction.followUp({
                content: '❌ 指定されたカテゴリが見つかりません',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const categoryName = targetCategory.name;
        const channelCount = targetCategory.children.cache.size;
        const relatedRoles = interaction.guild!.roles.cache
            .filter(role => role.name.startsWith(`${categoryName}_`));
        const roleCount = relatedRoles.size;

        // 削除実行メッセージに更新
        const deletingMessage = [
            `🔄 **カテゴリ「${categoryName}」を削除実行中...**`,
            ``,
            `📺 削除中チャンネル数: ${channelCount}個`,
            `👥 削除中ロール数: ${roleCount}個`,
            ``,
            `⏳ しばらくお待ちください...`
        ].join('\n');

        await interaction.editReply({
            content: deletingMessage,
            embeds: [],
            components: []
        });

        // 削除実行
        const categoryService = new CategoryManagementService(interaction.guild!);
        const result = await categoryService.deleteCategory(categoryId);

        // 完了ログ（メッセージ編集は削除後不可能）
        console.log(`テーブル削除実行完了:`, {
            categoryName: result.categoryName,
            deletedChannels: result.deletedChannelsCount,
            deletedRoles: result.deletedRolesCount,
            executor: interaction.user.username,
            executorId: interaction.user.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('削除実行エラー:', error);
        await interaction.followUp({
            content: `❌ カテゴリ削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * 削除キャンセル処理
 */
async function handleDeleteCancel(interaction: ButtonInteraction, categoryId: string): Promise<void> {
    try {
        const targetCategory = interaction.guild!.channels.cache.get(categoryId);
        const categoryName = targetCategory?.name || '不明なカテゴリ';

        const cancelMessage = [
            `✅ **削除をキャンセルしました**`,
            ``,
            `📂 **カテゴリ:** ${categoryName}`,
            `🛡️ **状態:** 保持されました`,
            ``,
            `💡 削除したい場合は、再度 \`/table delete\` を実行してください`
        ].join('\n');

        await interaction.update({
            embeds: [],
            components: [],
            content: cancelMessage
        });

    } catch (error) {
        console.error('削除キャンセルエラー:', error);
        await interaction.reply({
            content: '❌ キャンセル処理でエラーが発生しました',
            flags: MessageFlags.Ephemeral
        });
    }
}