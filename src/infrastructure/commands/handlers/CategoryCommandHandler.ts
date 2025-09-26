import { 
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ChannelType,
    OverwriteType
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../../../presentation/discord/builders/messages';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';

/**
 * カテゴリー操作コマンドのオプション型定義
 */
export interface CategoryCommandOptions {
    readonly operation: 'create' | 'delete';
    readonly name: string;
    readonly handOut?: number;
    readonly categoryId?: string;
}

/**
 * カテゴリー操作エラー
 */
export class CategoryError extends Error {
    constructor(
        message: string,
        public readonly code: 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'OPERATION_FAILED'
    ) {
        super(message);
        this.name = 'CategoryError';
    }
}

/**
 * カテゴリー操作コマンドハンドラー（統一アーキテクチャ）
 * 作成・削除の両方を統一的に処理
 */
export class CategoryCommandHandler {
    /**
     * カテゴリー操作処理を実行
     * @param interaction Discord インタラクション
     * @param operation 操作種別
     */
    async handle(
        interaction: ChatInputCommandInteraction, 
        operation: 'create' | 'delete'
    ): Promise<void> {
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

            // 操作に応じた処理
            if (operation === 'create') {
                await this.handleCategoryCreate(interaction);
            } else {
                await this.handleCategoryDelete(interaction);
            }

        } catch (error) {
            await UnifiedErrorHandler.handleCommandError(interaction, error, {
                commandName: `category-${operation}`,
                input: this.extractOptions(interaction, operation)
            });
        }
    }

    /**
     * カテゴリー作成処理
     * @param interaction Discord インタラクション
     */
    private async handleCategoryCreate(interaction: ChatInputCommandInteraction): Promise<void> {
        const name = interaction.options.getString('name') ?? '';
        const handOut = interaction.options.getInteger('hand-out') ?? 0;

        if (!name.trim()) {
            throw new CategoryError('カテゴリ名を入力してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new CategoryError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        try {
            // メインカテゴリー作成
            const category = await interaction.guild.channels.create({
                name: name,
                type: ChannelType.GuildCategory
            });

            // 秘匿チャンネル作成
            const createdChannels = [];
            for (let i = 1; i <= handOut; i++) {
                const handOutChannel = await interaction.guild.channels.create({
                    name: `秘匿${i}`,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            type: OverwriteType.Role,
                            deny: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });
                createdChannels.push(`<#${handOutChannel.id}>`);
            }

            // 成功メッセージ
            let successMessage = `カテゴリ「${name}」を作成しました。`;
            if (createdChannels.length > 0) {
                successMessage += `\n秘匿チャンネル: ${createdChannels.join(', ')}`;
            }

            await interaction.editReply(
                createSuccessMessage(interaction, 'CATEGORY CREATED', successMessage)
            );

        } catch (error) {
            throw new CategoryError(
                `カテゴリ作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * カテゴリー削除処理
     * @param interaction Discord インタラクション
     */
    private async handleCategoryDelete(interaction: ChatInputCommandInteraction): Promise<void> {
        const categoryId = interaction.options.getString('category-id') ?? '';

        if (!categoryId.trim()) {
            throw new CategoryError('カテゴリIDを入力してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new CategoryError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        try {
            const category = interaction.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                throw new CategoryError('指定されたカテゴリが見つかりません', 'INVALID_INPUT');
            }

            await category.delete();

            await interaction.editReply(
                createSuccessMessage(interaction, 'CATEGORY DELETED', `カテゴリ「${category.name}」を削除しました。`)
            );

        } catch (error) {
            throw new CategoryError(
                `カテゴリ削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
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
     * @param operation 操作種別
     * @returns オプション
     */
    private extractOptions(interaction: ChatInputCommandInteraction, operation: 'create' | 'delete'): CategoryCommandOptions {
        return {
            operation,
            name: interaction.options.getString('name') ?? '',
            handOut: interaction.options.getInteger('hand-out') || undefined,
            categoryId: interaction.options.getString('category-id') || undefined
        };
    }
}