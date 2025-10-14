import { 
    ChatInputCommandInteraction,
    PermissionFlagsBits
} from 'discord.js';
import { createSuccessMessage, createErrorMessage } from '../../../presentation/discord/builders/messages';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';
import { 
    CategoryManagementService, 
    CategoryManagementError 
} from '../../../domain/services/CategoryManagementService';

/**
 * 陣営作成コマンドのオプション型定義
 */
export interface PartyCreateOptions {
    readonly partyNumber: number;
    readonly categoryId: string;
}

/**
 * 陣営作成エラー
 */
export class PartyCreateError extends Error {
    constructor(
        message: string,
        public readonly code: 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'OPERATION_FAILED' | 'CATEGORY_NOT_FOUND' | 'DUPLICATE_PARTY'
    ) {
        super(message);
        this.name = 'PartyCreateError';
    }
}

/**
 * 陣営作成コマンドハンドラー
 * 指定された番号の陣営（第n陣）を作成し、専用ロールとチャンネルを設定
 */
export class PartyCreateHandler {
    /**
     * 陣営作成処理を実行
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

            await this.handlePartyCreate(interaction);

        } catch (error) {
            await UnifiedErrorHandler.handleCommandError(interaction, error, {
                commandName: 'party-create',
                input: this.extractOptions(interaction)
            });
        }
    }

    /**
     * 陣営作成処理
     * @param interaction Discord インタラクション
     */
    private async handlePartyCreate(interaction: ChatInputCommandInteraction): Promise<void> {
        const partyNumber = interaction.options.getInteger('party_number') ?? 1;

        if (partyNumber < 1 || partyNumber > 100) {
            throw new PartyCreateError('陣営番号は1〜100の範囲で指定してください', 'INVALID_INPUT');
        }

        if (!interaction.guild) {
            throw new PartyCreateError('このコマンドはサーバー内でのみ使用できます', 'OPERATION_FAILED');
        }

        // 現在のチャンネルが属するカテゴリを取得
        const currentChannel = interaction.channel;
        if (!currentChannel || !('parent' in currentChannel) || !currentChannel.parent) {
            throw new PartyCreateError(
                'このコマンドはカテゴリ内のチャンネルから実行してください', 
                'CATEGORY_NOT_FOUND'
            );
        }

        const categoryId = currentChannel.parent.id;
        const categoryName = currentChannel.parent.name;

        // 既存ロール重複チェック
        const existingRole = interaction.guild.roles.cache
            .find(role => role.name === `${categoryName}_${partyNumber}`);
        
        if (existingRole) {
            throw new PartyCreateError(
                `第${partyNumber}陣は既に存在します（ロール: ${existingRole.name}）`,
                'DUPLICATE_PARTY'
            );
        }

        try {
            // CategoryManagementServiceを使用
            const categoryService = new CategoryManagementService(interaction.guild);
            const result = await categoryService.createParty(partyNumber, categoryId);

            const successMessage = [
                `**第${result.partyNumber}陣を作成しました**`,
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
                let errorCode: PartyCreateError['code'] = 'OPERATION_FAILED';
                
                switch (error.code) {
                    case 'CATEGORY_NOT_FOUND':
                        errorCode = 'CATEGORY_NOT_FOUND';
                        break;
                    case 'DUPLICATE_ROLE':
                        errorCode = 'DUPLICATE_PARTY';
                        break;
                    case 'INVALID_PARTY_NUMBER':
                        errorCode = 'INVALID_INPUT';
                        break;
                    case 'ROLE_CREATION_FAILED':
                    case 'CHANNEL_CREATION_FAILED':
                    case 'PERMISSION_SETTING_FAILED':
                        errorCode = 'OPERATION_FAILED';
                        break;
                }

                throw new PartyCreateError(error.message, errorCode);
            }
            throw new PartyCreateError(
                `陣営作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
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
    private extractOptions(interaction: ChatInputCommandInteraction): PartyCreateOptions {
        const currentChannel = interaction.channel;
        const categoryId = (currentChannel && 'parent' in currentChannel && currentChannel.parent) 
            ? currentChannel.parent.id : '';

        return {
            partyNumber: interaction.options.getInteger('party_number') ?? 1,
            categoryId
        };
    }
}