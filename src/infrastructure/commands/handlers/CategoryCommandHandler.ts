import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../../../presentation/discord/builders/messages';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';
import {
    CategoryManagementService,
    CategoryManagementError
} from '../../../domain/services/CategoryManagementService';
import { GuildServiceFactory } from '../../factories/CommandHandlerFactory';

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
 * カテゴリー操作エラー（後方互換性のため保持）
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
 * カテゴリー操作コマンドハンドラー（完全リファクタ版）
 * 新しいCategoryManagementServiceを使用
 */
export class CategoryCommandHandler {
    constructor(private readonly categoryServiceFactory: GuildServiceFactory<CategoryManagementService>) {}

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
     * カテゴリー作成処理（新CategoryManagementService使用）
     * @param interaction Discord インタラクション
     */
    private async handleCategoryCreate(interaction: ChatInputCommandInteraction): Promise<void> {
        const name = interaction.options.getString('name') ?? '';
        const rawHandOut = interaction.options.getInteger('handout') ?? 0;
        const handOut = Math.min(Math.max(rawHandOut, 0), 10); // 0〜10に制限

        if (!name.trim()) {
            throw new CategoryError('カテゴリ名を入力してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new CategoryError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        try {
            // 新しいCategoryManagementServiceを使用
            const categoryService = this.categoryServiceFactory(interaction.guild);
            const result = await categoryService.createCategoryWithRoles(name, handOut);

            await interaction.editReply(
                createSuccessMessage(interaction, 'CATEGORY CREATED', result.summary)
            );

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new CategoryError(error.message, 'OPERATION_FAILED');
            }
            throw new CategoryError(
                `カテゴリ作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'OPERATION_FAILED'
            );
        }
    }

    /**
     * カテゴリー削除処理（新CategoryManagementService使用）
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
            // 削除対象のカテゴリ情報を事前取得
            const targetCategory = interaction.guild.channels.cache.get(categoryId);
            if (!targetCategory || targetCategory.type !== ChannelType.GuildCategory) {
                throw new CategoryError('指定されたカテゴリが見つかりません', 'INVALID_INPUT');
            }

            const categoryName = targetCategory.name;
            const channelCount = targetCategory.children.cache.size;

            // 関連ロール数を事前計算
            const relatedRoles = interaction.guild.roles.cache
                .filter(role => role.name.startsWith(`${categoryName}_`));
            const roleCount = relatedRoles.size;

            // 削除開始メッセージを事前に送信
            const deletingMessage = [
                `**カテゴリ「${categoryName}」の削除を開始しています...**`,
                ``,
                `削除予定チャンネル数: ${channelCount}`,
                `削除予定ロール数: ${roleCount}`,
                ``,
                `⚠️ この操作は取り消せません`
            ].join('\n');

            await interaction.editReply(
                createSuccessMessage(interaction, 'DELETING CATEGORY', deletingMessage)
            );

            // 少し待機してから削除実行（ユーザーがメッセージを確認できるように）
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 削除実行（メッセージは削除後に編集不可能になるため、事前通知で完了）
            const categoryService = this.categoryServiceFactory(interaction.guild);
            await categoryService.deleteCategory(categoryId);

            // 削除後の編集は不可能なため、ここではログ出力のみ
            console.log(`カテゴリ「${categoryName}」の削除が完了しました。チャンネル: ${channelCount}個、ロール: ${roleCount}個`);

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw new CategoryError(error.message, 'OPERATION_FAILED');
            }
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
            handOut: interaction.options.getInteger('handout') ?? undefined,
            categoryId: interaction.options.getString('category-id') ?? undefined
        };
    }
}