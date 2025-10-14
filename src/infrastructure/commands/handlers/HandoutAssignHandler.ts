import { 
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    User
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../../../presentation/discord/builders/messages';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';
import { 
    CategoryManagementService, 
    CategoryManagementError 
} from '../../../domain/services/CategoryManagementService';

/**
 * ハンドアウト割り当てコマンドのオプション型定義
 */
export interface HandoutAssignOptions {
    readonly user: User;
    readonly handout: number;
    readonly displayName?: string;
    readonly categoryId: string;
}

/**
 * ハンドアウト割り当てエラー
 */
export class HandoutAssignError extends Error {
    constructor(
        message: string,
        public readonly code: 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'OPERATION_FAILED' | 'CATEGORY_NOT_FOUND' | 'HANDOUT_NOT_FOUND'
    ) {
        super(message);
        this.name = 'HandoutAssignError';
    }
}

/**
 * ハンドアウト割り当てコマンドハンドラー
 * ユーザーにハンドアウトチャンネルのアクセス権を付与し、専用チャンネルを作成
 */
export class HandoutAssignHandler {
    /**
     * ハンドアウト割り当て処理を実行
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

            await this.handleHandoutAssign(interaction);

        } catch (error) {
            await UnifiedErrorHandler.handleCommandError(interaction, error, {
                commandName: 'handout-assign',
                input: this.extractOptions(interaction)
            });
        }
    }

    /**
     * ハンドアウト割り当て処理
     * @param interaction Discord インタラクション
     */
    private async handleHandoutAssign(interaction: ChatInputCommandInteraction): Promise<void> {
        const user = interaction.options.getUser('user');
        const handout = interaction.options.getInteger('handout') ?? 1;
        const displayName = interaction.options.getString('display_name') ?? undefined;

        if (!user) {
            throw new HandoutAssignError('ユーザーを指定してください', 'INVALID_INPUT');
        }

        if (handout < 1 || handout > 10) {
            throw new HandoutAssignError('ハンドアウト番号は1〜10の範囲で指定してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new HandoutAssignError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        // 現在のチャンネルが属するカテゴリを取得
        const currentChannel = interaction.channel;
        if (!currentChannel || !('parent' in currentChannel) || !currentChannel.parent) {
            throw new HandoutAssignError(
                'このコマンドはカテゴリ内のチャンネルから実行してください', 
                'CATEGORY_NOT_FOUND'
            );
        }

        const categoryId = currentChannel.parent.id;

        try {
            // CategoryManagementServiceを使用
            const categoryService = new CategoryManagementService(interaction.guild);
            const result = await categoryService.assignHandout(user, handout, categoryId, displayName);

            const successMessage = [
                `**ハンドアウト割り当てが完了しました**`,
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
                let errorCode: HandoutAssignError['code'] = 'OPERATION_FAILED';
                
                switch (error.code) {
                    case 'CATEGORY_NOT_FOUND':
                        errorCode = 'CATEGORY_NOT_FOUND';
                        break;
                    case 'HANDOUT_NOT_FOUND':
                        errorCode = 'HANDOUT_NOT_FOUND';
                        break;
                    case 'ROLE_CREATION_FAILED':
                    case 'CHANNEL_CREATION_FAILED':
                    case 'PERMISSION_SETTING_FAILED':
                        errorCode = 'OPERATION_FAILED';
                        break;
                }

                throw new HandoutAssignError(error.message, errorCode);
            }
            throw new HandoutAssignError(
                `ハンドアウト割り当てに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
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
    private extractOptions(interaction: ChatInputCommandInteraction): HandoutAssignOptions {
        const user = interaction.options.getUser('user');
        const currentChannel = interaction.channel;
        const categoryId = (currentChannel && 'parent' in currentChannel && currentChannel.parent) 
            ? currentChannel.parent.id : '';

        return {
            user: user!,
            handout: interaction.options.getInteger('handout') ?? 1,
            displayName: interaction.options.getString('display_name') ?? undefined,
            categoryId
        };
    }
}