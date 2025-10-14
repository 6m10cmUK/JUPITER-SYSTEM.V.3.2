import { 
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ThreadChannel,
    User
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../../../presentation/discord/builders/messages';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';
import { 
    CategoryManagementService, 
    CategoryManagementError 
} from '../../../domain/services/CategoryManagementService';

/**
 * テーブル管理コマンドのオプション型定義
 */
export interface TableCommandOptions {
    readonly subcommand: 'setup' | 'handout' | 'add' | 'delete';
    readonly name?: string;
    readonly handout?: number;
    readonly voice?: boolean;
    readonly user?: User;
    readonly number?: number;
    readonly displayName?: string;
    readonly partyNumber?: number;
}

/**
 * テーブル管理エラー
 */
export class TableError extends Error {
    constructor(
        message: string,
        public readonly code: 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'OPERATION_FAILED'
    ) {
        super(message);
        this.name = 'TableError';
    }
}

/**
 * テーブル管理コマンドハンドラー（統合版）
 * 旧カテゴリ管理4コマンドを統合したサブコマンド処理
 */
export class TableCommandHandler {
    /**
     * テーブル管理処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // 並列処理：権限チェックとdefer
            const [permissionResult] = await Promise.all([
                this.checkPermissions(interaction),
                interaction.deferReply()
            ]);

            if (!permissionResult.hasPermission) {
                await interaction.editReply(
                    createErrorMessage(interaction, 'PERMISSION DENIED', permissionResult.message)
                );
                return;
            }

            // サブコマンドに応じた処理
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'setup':
                    await this.handleSetup(interaction);
                    break;
                case 'handout':
                    await this.handleHandout(interaction);
                    break;
                case 'add':
                    await this.handleAdd(interaction);
                    break;
                case 'delete':
                    await this.handleDelete(interaction);
                    break;
                default:
                    throw new TableError('不明なサブコマンドです', 'INVALID_INPUT');
            }

        } catch (error) {
            await UnifiedErrorHandler.handleCommandError(interaction, error, {
                commandName: 'table',
                subcommand: interaction.options.getSubcommand(),
                input: this.extractOptions(interaction)
            });
        }
    }

    /**
     * setup: カテゴリセットアップ処理（旧 category-create）
     * @param interaction Discord インタラクション
     */
    private async handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
        const name = interaction.options.getString('name') ?? '';
        const rawHandout = interaction.options.getInteger('handout') ?? 0;
        const handout = Math.min(Math.max(rawHandout, 0), 10); // 0〜10に制限
        const voice = interaction.options.getBoolean('voice') ?? false; // デフォルトfalse

        if (!name.trim()) {
            throw new TableError('カテゴリ名を入力してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new TableError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        try {
            const categoryService = new CategoryManagementService(interaction.guild);
            const result = await categoryService.createCategoryWithRoles(name, handout, voice);

            await interaction.editReply(
                createSuccessMessage(interaction, 'TABLE SETUP COMPLETED', result.summary)
            );

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new TableError(error.message, 'OPERATION_FAILED');
            }
            throw new TableError(
                `テーブルセットアップに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * handout: ハンドアウト割り当て処理（旧 handout-assign）
     * @param interaction Discord インタラクション
     */
    private async handleHandout(interaction: ChatInputCommandInteraction): Promise<void> {
        const user = interaction.options.getUser('user');
        const number = interaction.options.getInteger('number') ?? 1;
        const displayName = interaction.options.getString('display_name') ?? undefined;

        if (!user) {
            throw new TableError('ユーザーを指定してください', 'INVALID_INPUT');
        }

        if (number < 1 || number > 10) {
            throw new TableError('ハンドアウト番号は1〜10の範囲で指定してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new TableError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        // 現在のチャンネルが属するカテゴリを取得（スレッド/通常両対応）
        const ch = interaction.channel;
        const parentOrSelf = (ch && typeof (ch as any).isThread === 'function' && (ch as any).isThread())
            ? (ch as ThreadChannel).parent
            : (ch as any)?.parent;
        const category = parentOrSelf?.type === ChannelType.GuildCategory ? parentOrSelf : parentOrSelf?.parent;
        if (!category || category.type !== ChannelType.GuildCategory) {
            throw new TableError('このコマンドはカテゴリ内のチャンネルから実行してください', 'INVALID_INPUT');
        }
        const categoryId = category.id;

        try {
            // サーバープロフィール（displayName）をデフォルト表示名として使用
            const member = interaction.guild.members.cache.get(user.id);
            const finalDisplayName = displayName || (member ? member.displayName : user.username);

            const categoryService = new CategoryManagementService(interaction.guild);
            const result = await categoryService.assignHandout(user, number, categoryId, finalDisplayName);

            const successMessage = [
                `✅ **ハンドアウト割り当て完了**`,
                ``,
                `👤 **対象ユーザー:** ${user.username}`,
                `📋 **ハンドアウト:** ho-${result.handoutNumber}`,
                `💬 **専用チャンネル:** ${result.userChannel.name}`,
                `📝 **表示名:** ${result.displayName}`,
                ``,
                `✅ ${result.handoutChannel.name} チャンネルへのアクセス権を付与しました`,
                `✅ ${result.userChannel.name} チャンネルを作成しました`
            ].join('\n');

            await interaction.editReply(
                createSuccessMessage(interaction, 'HANDOUT ASSIGNED', successMessage)
            );

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new TableError(error.message, 'OPERATION_FAILED');
            }
            throw new TableError(
                `ハンドアウト割り当てに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * add: 第n陣作成処理（旧 party-create）
     * @param interaction Discord インタラクション
     */
    private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
        const partyNumber = interaction.options.getInteger('party_number') ?? 1;

        if (partyNumber < 1 || partyNumber > 100) {
            throw new TableError('陣営番号は1〜100の範囲で指定してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new TableError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        // 現在のチャンネルが属するカテゴリを取得（スレッド/通常両対応）
        const ch = interaction.channel;
        const parentOrSelf = (ch && typeof (ch as any).isThread === 'function' && (ch as any).isThread())
            ? (ch as ThreadChannel).parent
            : (ch as any)?.parent;
        const category = parentOrSelf?.type === ChannelType.GuildCategory ? parentOrSelf : parentOrSelf?.parent;
        if (!category || category.type !== ChannelType.GuildCategory) {
            throw new TableError('このコマンドはカテゴリ内のチャンネルから実行してください', 'INVALID_INPUT');
        }
        const categoryId = category.id;
        const categoryName = category.name;

        // 既存ロール重複チェック
        const existingRole = interaction.guild.roles.cache
            .find(role => role.name === `${categoryName}_${partyNumber}`);
        
        if (existingRole) {
            throw new TableError(
                `第${partyNumber}陣は既に存在します（ロール: ${existingRole.name}）`,
                'INVALID_INPUT'
            );
        }

        try {
            const categoryService = new CategoryManagementService(interaction.guild);
            const result = await categoryService.createParty(partyNumber, categoryId);

            const successMessage = [
                `✅ **第${result.partyNumber}陣を作成しました**`,
                ``,
                `🏷️ **作成されたロール:** ${result.role.name}`,
                `💬 **作成されたチャンネル:** ${result.channel.name}`,
                `📂 **所属カテゴリ:** ${result.categoryName}`,
                ``,
                `✅ ロール「${result.role.name}」のメンバーがチャンネルにアクセスできます`,
                `✅ 通過者ロールのメンバーも閲覧可能です`
            ].join('\n');

            await interaction.editReply(
                createSuccessMessage(interaction, 'PARTY CREATED', successMessage)
            );

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new TableError(error.message, 'OPERATION_FAILED');
            }
            throw new TableError(
                `陣営作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * delete: カテゴリ削除処理（現在のカテゴリ対象）
     * @param interaction Discord インタラクション
     */
    private async handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) {
            throw new TableError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        // 現在のチャンネルの親カテゴリを使用（スレッド/通常両対応）
        const ch = interaction.channel;
        const parentOrSelf = (ch && typeof (ch as any).isThread === 'function' && (ch as any).isThread())
            ? (ch as ThreadChannel).parent
            : (ch as any)?.parent;
        const category = parentOrSelf?.type === ChannelType.GuildCategory ? parentOrSelf : parentOrSelf?.parent;
        if (!category || category.type !== ChannelType.GuildCategory) {
            throw new TableError('このコマンドはカテゴリ内のチャンネルから実行してください', 'INVALID_INPUT');
        }
        const categoryId = category.id;

        try {
            // 削除対象のカテゴリ情報を事前取得
            const targetCategory = interaction.guild.channels.cache.get(categoryId);
            if (!targetCategory || targetCategory.type !== ChannelType.GuildCategory) {
                throw new TableError('指定されたカテゴリが見つかりません', 'INVALID_INPUT');
            }

            const categoryName = targetCategory.name;
            const channelCount = targetCategory.children.cache.size;

            // 関連ロール数を事前計算
            const relatedRoles = interaction.guild.roles.cache
                .filter(role => role.name.startsWith(`${categoryName}_`));
            const roleCount = relatedRoles.size;

            // 削除確認メッセージを表示
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ カテゴリ削除確認')
                .setColor(0xFF6B6B) // 危険色（赤）
                .addFields(
                    {
                        name: '🗑️ 削除対象',
                        value: `**カテゴリ:** ${categoryName}\n**カテゴリID:** ${categoryId}`,
                        inline: false
                    },
                    {
                        name: '📊 削除される内容',
                        value: [
                            `📺 チャンネル数: ${channelCount}個`,
                            `👥 ロール数: ${roleCount}個`,
                            `🔗 関連する全ての要素`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '⚠️ 重要な注意',
                        value: [
                            '❌ **この操作は取り消せません**',
                            '🗂️ 全てのチャンネルとメッセージが削除されます',
                            '👥 ロールも完全に削除されます',
                            '',
                            '🤔 **本当に削除しますか？**'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: '削除を実行する場合は下のボタンを押してください' });

            // 削除確認ボタン
            const confirmButton = new ButtonBuilder()
                .setCustomId(`table_delete:confirm:${categoryId}`)
                .setLabel('🗑️ 削除を実行')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`table_delete:cancel:${categoryId}`)
                .setLabel('❌ キャンセル')
                .setStyle(ButtonStyle.Secondary);

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(confirmButton, cancelButton);

            await interaction.editReply({
                embeds: [confirmEmbed],
                components: [actionRow]
            });

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new TableError(error.message, 'OPERATION_FAILED');
            }
            throw new TableError(
                `削除確認の表示に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * 権限チェック（管理者またはサーバーオーナー）
     * @param interaction Discord インタラクション
     * @returns 権限チェック結果
     */
    private async checkPermissions(interaction: ChatInputCommandInteraction): Promise<{
        hasPermission: boolean;
        message: string;
    }> {
        if (!interaction.guild) {
            return {
                hasPermission: false,
                message: 'このコマンドはサーバー内でのみ使用できます'
            };
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member) {
            return {
                hasPermission: false,
                message: 'メンバー情報を取得できませんでした'
            };
        }

        // サーバーオーナーまたは管理者権限チェック
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isOwner && !hasAdminPermission) {
            return {
                hasPermission: false,
                message: 'このコマンドは管理者またはサーバーオーナーのみ使用できます'
            };
        }

        return {
            hasPermission: true,
            message: 'OK'
        };
    }

    /**
     * オプションを抽出
     * @param interaction Discord インタラクション
     * @returns オプション
     */
    private extractOptions(interaction: ChatInputCommandInteraction): TableCommandOptions {
        const subcommand = interaction.options.getSubcommand() as TableCommandOptions['subcommand'];
        const currentChannel = interaction.channel;
        const categoryId = (currentChannel && 'parent' in currentChannel && currentChannel.parent) 
            ? currentChannel.parent.id : '';

        return {
            subcommand,
            name: interaction.options.getString('name') ?? undefined,
            handout: interaction.options.getInteger('handout') ?? undefined,
            voice: interaction.options.getBoolean('voice') ?? undefined,
            user: interaction.options.getUser('user') ?? undefined,
            number: interaction.options.getInteger('number') ?? undefined,
            displayName: interaction.options.getString('display_name') ?? undefined,
            partyNumber: interaction.options.getInteger('party_number') ?? undefined
        };
    }
}