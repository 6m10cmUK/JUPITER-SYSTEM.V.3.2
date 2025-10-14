import {
    Guild,
    Role,
    CategoryChannel,
    TextChannel,
    VoiceChannel,
    User,
    ChannelType,
    OverwriteType,
    PermissionFlagsBits
} from 'discord.js';

/**
 * カテゴリ管理システムのエラー型定義
 */
export type CategoryErrorCode = 
    | 'ROLE_CREATION_FAILED'
    | 'CHANNEL_CREATION_FAILED'
    | 'PERMISSION_SETTING_FAILED'
    | 'CATEGORY_NOT_FOUND'
    | 'HANDOUT_NOT_FOUND'
    | 'DUPLICATE_ROLE'
    | 'INVALID_PARTY_NUMBER'
    | 'USER_NOT_FOUND'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'OPERATION_FAILED';

/**
 * カテゴリ管理システム専用エラー
 */
export class CategoryManagementError extends Error {
    constructor(
        message: string,
        public readonly code: CategoryErrorCode,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'CategoryManagementError';
    }
}

/**
 * カテゴリ作成結果
 */
export interface CategoryCreationResult {
    category: CategoryChannel;
    roles: {
        firstParty: Role;
        passedMembers: Role;
    };
    channels: {
        overview: TextChannel;
        schedule: TextChannel;
        firstParty: TextChannel;
        passedMembers: TextChannel;
        handouts: TextChannel[];
        voices?: {
            session: VoiceChannel;
            secret: VoiceChannel;
        };
    };
    summary: string;
}

/**
 * ハンドアウト割り当て結果
 */
export interface HandoutAssignResult {
    handoutChannel: TextChannel;
    userChannel: TextChannel;
    user: User;
    handoutNumber: number;
    displayName: string;
}

/**
 * 陣営作成結果
 */
export interface PartyCreationResult {
    role: Role;
    channel: TextChannel;
    partyNumber: number;
    categoryName: string;
}

/**
 * カテゴリ削除結果
 */
export interface CategoryDeletionResult {
    deletedChannelsCount: number;
    deletedRolesCount: number;
    categoryName: string;
}

/**
 * カテゴリ管理サービス
 * CoCシナリオ運営のためのDiscordカテゴリ・チャンネル・ロール管理
 */
export class CategoryManagementService {
    constructor(private readonly guild: Guild) {}

    /**
     * カテゴリとロール、基本チャンネルを作成
     * @param name カテゴリ名
     * @param handoutCount ハンドアウトチャンネル数 (0-10)
     * @param createVoice ボイスチャンネルを作成するか
     * @returns カテゴリ作成結果
     */
    async createCategoryWithRoles(name: string, handoutCount: number = 0, createVoice: boolean = false): Promise<CategoryCreationResult> {
        try {
            // 並列でロール作成
            const [firstPartyRole, passedMembersRole] = await Promise.all([
                this.createRole(`${name}_1`),
                this.createRole(`${name}_通過者`)
            ]);

            // カテゴリ作成（ロール必須設定）
            const category = await this.guild.channels.create({
                name,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        type: OverwriteType.Role,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: firstPartyRole.id,
                        type: OverwriteType.Role,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: passedMembersRole.id,
                        type: OverwriteType.Role,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            // 基本チャンネルを並列作成
            const [overview, schedule, firstParty, passedMembers] = await Promise.all([
                this.createBasicChannel(category, '概要', [firstPartyRole, passedMembersRole]),
                this.createBasicChannel(category, '日程', [firstPartyRole, passedMembersRole]),
                this.createBasicChannel(category, '第1陣', [firstPartyRole, passedMembersRole]),
                this.createBasicChannel(category, '通過者', [passedMembersRole])
            ]);

            // ハンドアウトチャンネル作成
            const handouts: TextChannel[] = [];
            if (handoutCount > 0) {
                const handoutPromises = [];
                for (let i = 1; i <= handoutCount; i++) {
                    handoutPromises.push(
                        this.createHandoutChannel(category, `ho-${i}`, [passedMembersRole])
                    );
                }
                handouts.push(...await Promise.all(handoutPromises));
            }

            // ボイスチャンネル作成（オプション）
            let voices: { session: VoiceChannel; secret: VoiceChannel } | undefined;
            if (createVoice) {
                const [sessionVoice, secretVoice] = await Promise.all([
                    this.createVoiceChannel(category, 'セッション中', [firstPartyRole, passedMembersRole]),
                    this.createVoiceChannel(category, '秘匿', [passedMembersRole])
                ]);
                voices = { session: sessionVoice, secret: secretVoice };
            }

            // サマリー作成
            const summary = this.createCategorySummary(name, handoutCount, createVoice, {
                category,
                roles: { firstParty: firstPartyRole, passedMembers: passedMembersRole },
                channels: { overview, schedule, firstParty, passedMembers, handouts, voices }
            });

            return {
                category,
                roles: {
                    firstParty: firstPartyRole,
                    passedMembers: passedMembersRole
                },
                channels: {
                    overview,
                    schedule,
                    firstParty,
                    passedMembers,
                    handouts,
                    voices
                },
                summary
            };

        } catch (error) {
            throw new CategoryManagementError(
                `カテゴリ作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'CATEGORY_NOT_FOUND',
                { name, handoutCount, originalError: error }
            );
        }
    }

    /**
     * ハンドアウトをユーザーに割り当て
     * @param user 対象ユーザー
     * @param handoutNumber ハンドアウト番号 (1-10)
     * @param categoryId カテゴリID
     * @param displayName 表示名（オプション）
     * @returns ハンドアウト割り当て結果
     */
    async assignHandout(
        user: User, 
        handoutNumber: number, 
        categoryId: string,
        displayName?: string
    ): Promise<HandoutAssignResult> {
        try {
            const category = this.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                throw new CategoryManagementError(
                    '指定されたカテゴリが見つかりません',
                    'CATEGORY_NOT_FOUND',
                    { categoryId }
                );
            }

            const handoutChannelName = `ho-${handoutNumber}`;
            const handoutChannel = category.children.cache
                .find(ch => ch.name === handoutChannelName && ch.type === ChannelType.GuildText) as TextChannel;

            if (!handoutChannel) {
                throw new CategoryManagementError(
                    `ハンドアウトチャンネル ${handoutChannelName} が見つかりません`,
                    'HANDOUT_NOT_FOUND',
                    { handoutNumber, categoryId }
                );
            }

            // 通過者ロールを取得
            const categoryName = category.name;
            const passedMembersRole = this.guild.roles.cache
                .find(role => role.name === `${categoryName}_通過者`);

            if (!passedMembersRole) {
                throw new CategoryManagementError(
                    `通過者ロール ${categoryName}_通過者 が見つかりません`,
                    'ROLE_CREATION_FAILED',
                    { categoryName }
                );
            }

            // ハンドアウトチャンネルにユーザー権限付与
            await handoutChannel.permissionOverwrites.create(user.id, {
                ViewChannel: true,
                SendMessages: true
            });

            // ユーザー専用チャンネル作成
            const finalDisplayName = displayName || user.username;
            const userChannel = await this.guild.channels.create({
                name: finalDisplayName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        type: OverwriteType.Role,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        type: OverwriteType.Member,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: passedMembersRole.id,
                        type: OverwriteType.Role,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            return {
                handoutChannel,
                userChannel,
                user,
                handoutNumber,
                displayName: finalDisplayName
            };

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw error;
            }
            throw new CategoryManagementError(
                `ハンドアウト割り当てに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'PERMISSION_SETTING_FAILED',
                { user: user.id, handoutNumber, categoryId, originalError: error }
            );
        }
    }

    /**
     * 新しい陣営（第n陣）を作成
     * @param partyNumber 陣営番号 (1-100)
     * @param categoryId カテゴリID
     * @returns 陣営作成結果
     */
    async createParty(partyNumber: number, categoryId: string): Promise<PartyCreationResult> {
        try {
            const category = this.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                throw new CategoryManagementError(
                    '指定されたカテゴリが見つかりません',
                    'CATEGORY_NOT_FOUND',
                    { categoryId }
                );
            }

            const categoryName = category.name;
            
            // 通過者ロールを取得
            const passedMembersRole = this.guild.roles.cache
                .find(role => role.name === `${categoryName}_通過者`);

            if (!passedMembersRole) {
                throw new CategoryManagementError(
                    `通過者ロール ${categoryName}_通過者 が見つかりません`,
                    'ROLE_CREATION_FAILED',
                    { categoryName }
                );
            }

            // 陣営ロール作成
            const partyRole = await this.createRole(`${categoryName}_${partyNumber}`);

            // 陣営チャンネル作成
            const partyChannel = await this.guild.channels.create({
                name: `第${partyNumber}陣`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        type: OverwriteType.Role,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: partyRole.id,
                        type: OverwriteType.Role,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: passedMembersRole.id,
                        type: OverwriteType.Role,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            return {
                role: partyRole,
                channel: partyChannel,
                partyNumber,
                categoryName
            };

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw error;
            }
            throw new CategoryManagementError(
                `陣営作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'CHANNEL_CREATION_FAILED',
                { partyNumber, categoryId, originalError: error }
            );
        }
    }

    /**
     * カテゴリと関連要素を完全削除
     * @param categoryId カテゴリID
     * @returns 削除結果
     */
    async deleteCategory(categoryId: string): Promise<CategoryDeletionResult> {
        try {
            const category = this.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                throw new CategoryManagementError(
                    '指定されたカテゴリが見つかりません',
                    'CATEGORY_NOT_FOUND',
                    { categoryId }
                );
            }

            const categoryName = category.name;
            
            // カテゴリ内のチャンネルを取得
            const channels = category.children.cache.values();
            const channelDeletions = [];
            for (const channel of channels) {
                channelDeletions.push(channel.delete());
            }

            // 関連ロールを取得（{カテゴリ名}_* パターン）
            const relatedRoles = this.guild.roles.cache
                .filter(role => role.name.startsWith(`${categoryName}_`));
            const roleDeletions = relatedRoles.map(role => role.delete());

            // 並列削除実行
            const [deletedChannels, deletedRoles] = await Promise.all([
                Promise.all(channelDeletions),
                Promise.all(roleDeletions)
            ]);

            // カテゴリ削除
            await category.delete();

            return {
                deletedChannelsCount: deletedChannels.length,
                deletedRolesCount: deletedRoles.length,
                categoryName
            };

        } catch (error) {
            if (error instanceof CategoryManagementError) {
                throw error;
            }
            throw new CategoryManagementError(
                `カテゴリ削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'CATEGORY_NOT_FOUND',
                { categoryId, originalError: error }
            );
        }
    }

    /**
     * ロールを作成
     */
    private async createRole(name: string): Promise<Role> {
        try {
            return await this.guild.roles.create({
                name,
                mentionable: true,
                reason: `カテゴリ管理システムによる自動作成: ${name}`
            });
        } catch (error) {
            throw new CategoryManagementError(
                `ロール作成に失敗しました: ${name}`,
                'ROLE_CREATION_FAILED',
                { name, originalError: error }
            );
        }
    }

    /**
     * 基本チャンネルを作成
     */
    private async createBasicChannel(
        category: CategoryChannel, 
        name: string, 
        allowedRoles: Role[]
    ): Promise<TextChannel> {
        try {
            const permissionOverwrites = [
                {
                    id: this.guild.roles.everyone.id,
                    type: OverwriteType.Role as const,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                ...allowedRoles.map(role => ({
                    id: role.id,
                    type: OverwriteType.Role as const,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }))
            ];

            return await this.guild.channels.create({
                name,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites
            });
        } catch (error) {
            throw new CategoryManagementError(
                `チャンネル作成に失敗しました: ${name}`,
                'CHANNEL_CREATION_FAILED',
                { name, categoryId: category.id, originalError: error }
            );
        }
    }

    /**
     * ハンドアウトチャンネルを作成（everyoneの送信権限を明示的に禁止）
     */
    private async createHandoutChannel(
        category: CategoryChannel, 
        name: string, 
        allowedRoles: Role[]
    ): Promise<TextChannel> {
        try {
            const permissionOverwrites = [
                {
                    id: this.guild.roles.everyone.id,
                    type: OverwriteType.Role as const,
                    deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                },
                ...allowedRoles.map(role => ({
                    id: role.id,
                    type: OverwriteType.Role as const,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }))
            ];

            return await this.guild.channels.create({
                name,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites
            });
        } catch (error) {
            throw new CategoryManagementError(
                `ハンドアウトチャンネル作成に失敗しました: ${name}`,
                'CHANNEL_CREATION_FAILED',
                { name, categoryId: category.id, originalError: error }
            );
        }
    }

    /**
     * ボイスチャンネルを作成
     */
    private async createVoiceChannel(
        category: CategoryChannel, 
        name: string, 
        allowedRoles: Role[]
    ): Promise<VoiceChannel> {
        try {
            const permissionOverwrites = [
                {
                    id: this.guild.roles.everyone.id,
                    type: OverwriteType.Role as const,
                    deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                },
                ...allowedRoles.map(role => ({
                    id: role.id,
                    type: OverwriteType.Role as const,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                }))
            ];

            return await this.guild.channels.create({
                name,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites
            });
        } catch (error) {
            throw new CategoryManagementError(
                `ボイスチャンネル作成に失敗しました: ${name}`,
                'CHANNEL_CREATION_FAILED',
                { name, categoryId: category.id, originalError: error }
            );
        }
    }


    /**
     * カテゴリ作成サマリーを生成
     */
    private createCategorySummary(
        name: string, 
        handoutCount: number,
        createVoice: boolean,
        result: Omit<CategoryCreationResult, 'summary'>
    ): string {
        const lines = [
            `**カテゴリ「${name}」を作成しました**`,
            ``,
            `**作成されたロール:**`,
            `- ${result.roles.firstParty.name}`,
            `- ${result.roles.passedMembers.name}`,
            ``,
            `**作成されたチャンネル:**`,
            `- ${result.channels.overview.name}`,
            `- ${result.channels.schedule.name}`,
            `- ${result.channels.firstParty.name}`,
            `- ${result.channels.passedMembers.name}`
        ];

        if (result.channels.handouts.length > 0) {
            lines.push(``, `**ハンドアウトチャンネル:**`);
            result.channels.handouts.forEach(channel => {
                lines.push(`- ${channel.name}`);
            });
        }

        if (result.channels.voices) {
            lines.push(``, `**ボイスチャンネル:**`);
            lines.push(`- 🔊 ${result.channels.voices.session.name}`);
            lines.push(`- 🤫 ${result.channels.voices.secret.name}`);
        }

        return lines.join('\n');
    }
}