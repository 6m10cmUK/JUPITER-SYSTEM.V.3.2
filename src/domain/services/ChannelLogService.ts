import {
    Guild,
    CategoryChannel,
    TextChannel,
    ThreadChannel,
    Message,
    ChannelType,
    OverwriteType,
    PermissionFlagsBits,
    AttachmentBuilder,
    Collection,
    EmbedBuilder
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

/**
 * ログエラー型定義
 */
export type LogErrorCode = 
    | 'CATEGORY_NOT_FOUND'
    | 'LOG_CATEGORY_CREATION_FAILED'
    | 'MESSAGE_FETCH_FAILED'
    | 'THREAD_CREATION_FAILED'
    | 'LOG_SEND_FAILED'
    | 'PERMISSION_DENIED'
    | 'CHANNEL_ACCESS_DENIED'
    | 'ATTACHMENT_DOWNLOAD_FAILED'
    | 'FILE_CLEANUP_FAILED';

/**
 * チャンネルログ専用エラー
 */
export class ChannelLogError extends Error {
    constructor(
        message: string,
        public readonly code: LogErrorCode,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'ChannelLogError';
    }
}

/**
 * メッセージデータ
 */
export interface MessageData {
    id: string;
    content: string;
    author: {
        username: string;
        displayName: string;
        id: string;
    };
    timestamp: Date;
    editedTimestamp?: Date;
    attachments: AttachmentData[];
    embeds: any[];
    mentions: string[];
    reactions: ReactionData[];
}

/**
 * 添付ファイルデータ
 */
export interface AttachmentData {
    id: string;
    filename: string;
    url: string;
    proxyUrl: string;
    size: number;
    contentType: string;
    description?: string;
    tempPath?: string;
}

/**
 * リアクションデータ
 */
export interface ReactionData {
    emoji: string;
    count: number;
    users: string[];
}

/**
 * チャンネルログ
 */
export interface ChannelLog {
    channelName: string;
    channelId: string;
    channelType: 'basic' | 'handout' | 'user_specific';
    messageCount: number;
    messages: MessageData[];
    attachmentCount: number;
    collectionStartTime: Date;
    collectionEndTime: Date;
}

/**
 * カテゴリログデータ
 */
export interface CategoryLogData {
    categoryName: string;
    categoryId: string;
    collectionDate: Date;
    channelLogs: ChannelLog[];
    totalMessages: number;
    totalChannels: number;
    totalAttachments: number;
}

/**
 * ログ結果
 */
export interface LogResult {
    logChannel: TextChannel;
    threads: ThreadChannel[];
    totalMessages: number;
    totalAttachments: number;
    processedChannels: number;
    skippedChannels: string[];
    errors: string[];
}

/**
 * チャンネルログサービス
 * カテゴリ内メッセージの収集・保存を担当
 */
export class ChannelLogService {
    private readonly tempDir = path.join(process.cwd(), 'temp', 'attachments');

    constructor(private readonly guild: Guild) {
        // 一時ディレクトリ確保
        this.ensureTempDir();
    }

    /**
     * カテゴリ内の全ログを収集・保存
     * @param categoryId 対象カテゴリID
     * @returns ログ結果
     */
    async collectAndSaveCategoryLogs(categoryId: string): Promise<LogResult> {
        try {
            // カテゴリ情報取得
            const category = this.guild.channels.cache.get(categoryId) as CategoryChannel;
            if (!category || category.type !== ChannelType.GuildCategory) {
                throw new ChannelLogError(
                    '指定されたカテゴリが見つかりません',
                    'CATEGORY_NOT_FOUND',
                    { categoryId }
                );
            }

            const categoryName = category.name;
            console.log(`ログ収集開始: カテゴリ「${categoryName}」`);

            // 並列処理: ログ収集 & logカテゴリ確保
            const [categoryLogData, logCategory] = await Promise.all([
                this.collectCategoryLogs(categoryId),
                this.ensureLogCategory()
            ]);

            // ログチャンネル作成
            const logChannelName = `${categoryName}_${this.formatDate(new Date())}`;
            const logChannel = await this.createLogChannel(logCategory.id, logChannelName);

            // 各チャンネルのスレッド作成 & ログ送信（メッセージがあるもののみ）
            const threads: ThreadChannel[] = [];
            const errors: string[] = [];
            const skippedChannels: string[] = [];
            const threadCreationMessages: Message[] = [];

            for (const channelLog of categoryLogData.channelLogs) {
                // メッセージが0件の場合はスキップ
                if (channelLog.messageCount === 0) {
                    console.log(`スキップ: ${channelLog.channelName} (メッセージ0件)`);
                    skippedChannels.push(channelLog.channelName);
                    continue;
                }

                try {
                    console.log(`スレッド作成中: ${channelLog.channelName} (${channelLog.messageCount}件)`);
                    
                    const thread = await logChannel.threads.create({
                        name: `${channelLog.channelName}_ログ`,
                        reason: `${categoryName}カテゴリのログ保存`
                    });

                    // スレッド作成時のメッセージを取得して削除リストに追加
                    try {
                        const messages = await thread.messages.fetch({ limit: 1 });
                        const starterMessage = messages.first();
                        if (starterMessage) {
                            threadCreationMessages.push(starterMessage);
                        }
                    } catch (fetchError) {
                        console.warn(`スレッド開始メッセージ取得エラー:`, fetchError);
                    }

                    await this.sendChannelLogToThread(thread, channelLog);
                    threads.push(thread);

                } catch (error) {
                    const errorMsg = `${channelLog.channelName}: ${error instanceof Error ? error.message : String(error)}`;
                    errors.push(errorMsg);
                    console.error(`スレッド作成・送信エラー:`, errorMsg);
                }
            }

            // スレッドリンク集約embedを送信
            await this.sendThreadLinksEmbed(logChannel, threads, categoryName);

            // スレッド作成時の自動メッセージを削除
            await this.cleanupThreadCreationMessages(threadCreationMessages);

            return {
                logChannel,
                threads,
                totalMessages: categoryLogData.totalMessages,
                totalAttachments: categoryLogData.totalAttachments,
                processedChannels: threads.length,
                skippedChannels,
                errors
            };

        } catch (error) {
            if (error instanceof ChannelLogError) {
                throw error;
            }
            throw new ChannelLogError(
                `ログ収集処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
                'LOG_SEND_FAILED',
                { categoryId, originalError: error }
            );
        }
    }

    /**
     * カテゴリ内の全チャンネルログを収集
     */
    private async collectCategoryLogs(categoryId: string): Promise<CategoryLogData> {
        const category = this.guild.channels.cache.get(categoryId) as CategoryChannel;
        const categoryName = category.name;
        const collectionDate = new Date();

        // テキストチャンネルのみ対象
        const textChannels = category.children.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .values();

        const channelLogs: ChannelLog[] = [];
        let totalMessages = 0;
        let totalAttachments = 0;

        for (const channel of textChannels) {
            try {
                console.log(`メッセージ収集中: ${channel.name}`);
                const startTime = new Date();
                
                const messages = await this.fetchAllMessages(channel as TextChannel);
                const messageData = await this.processMessages(messages);
                
                const attachmentCount = messageData.reduce((sum, msg) => sum + msg.attachments.length, 0);
                const endTime = new Date();

                const channelType = this.determineChannelType(channel.name);
                
                channelLogs.push({
                    channelName: channel.name,
                    channelId: channel.id,
                    channelType,
                    messageCount: messageData.length,
                    messages: messageData,
                    attachmentCount,
                    collectionStartTime: startTime,
                    collectionEndTime: endTime
                });

                totalMessages += messageData.length;
                totalAttachments += attachmentCount;

            } catch (error) {
                console.error(`チャンネル ${channel.name} の収集エラー:`, error);
                // エラーでも他チャンネルは継続
            }
        }

        return {
            categoryName,
            categoryId,
            collectionDate,
            channelLogs,
            totalMessages,
            totalChannels: channelLogs.length,
            totalAttachments
        };
    }

    /**
     * チャンネルの全メッセージを取得
     */
    private async fetchAllMessages(channel: TextChannel): Promise<Message[]> {
        const messages: Message[] = [];
        let lastId: string | undefined;

        try {
            while (true) {
                const fetchOptions: any = { limit: 100 };
                if (lastId) {
                    fetchOptions.before = lastId;
                }

                const batch = await channel.messages.fetch(fetchOptions) as unknown as Collection<string, Message>;
                if (batch.size === 0) break;

                for (const [, message] of batch) {
                    messages.push(message);
                }
                
                lastId = batch.lastKey();

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            throw new ChannelLogError(
                `メッセージ取得に失敗: ${channel.name}`,
                'MESSAGE_FETCH_FAILED',
                { channelId: channel.id, originalError: error }
            );
        }

        return messages.reverse(); // 時系列順に並び替え
    }

    /**
     * メッセージを構造化データに変換
     */
    private async processMessages(messages: Message[]): Promise<MessageData[]> {
        const processedMessages: MessageData[] = [];

        for (const message of messages) {
            try {
                    const messageData: MessageData = {
                    id: message.id,
                    content: message.content,
                    author: {
                        username: message.author.username,
                        displayName: message.member?.displayName || message.author.username,
                        id: message.author.id
                    },
                    timestamp: message.createdAt,
                    editedTimestamp: message.editedAt || undefined,
                    attachments: await this.processAttachments(message.attachments.toJSON()),
                    embeds: message.embeds.map(embed => embed.toJSON()),
                    mentions: message.mentions.users.map(user => user.username),
                    reactions: await this.processReactions(message)
                };

                processedMessages.push(messageData);

            } catch (error) {
                console.warn(`メッセージ処理エラー ${message.id}:`, error);
                // 個別メッセージエラーは継続
            }
        }

        return processedMessages;
    }

    /**
     * 添付ファイルを処理（一時ダウンロード）
     */
    private async processAttachments(attachments: any[]): Promise<AttachmentData[]> {
        const processedAttachments: AttachmentData[] = [];

        for (const attachment of attachments) {
            try {
                const tempPath = await this.downloadAttachment(attachment);
                
                processedAttachments.push({
                    id: attachment.id,
                    filename: attachment.name,
                    url: attachment.url,
                    proxyUrl: attachment.proxyURL,
                    size: attachment.size,
                    contentType: attachment.contentType || 'application/octet-stream',
                    description: attachment.description,
                    tempPath
                });

            } catch (error) {
                console.warn(`添付ファイル処理エラー ${attachment.name}:`, error);
                // 添付ファイルエラーでもメッセージは保存
                processedAttachments.push({
                    id: attachment.id,
                    filename: attachment.name,
                    url: attachment.url,
                    proxyUrl: attachment.proxyURL,
                    size: attachment.size,
                    contentType: attachment.contentType || 'application/octet-stream',
                    description: attachment.description
                });
            }
        }

        return processedAttachments;
    }

    /**
     * 添付ファイルを一時ダウンロード
     */
    private async downloadAttachment(attachment: any): Promise<string> {
        const fileName = `${Date.now()}_${attachment.id}_${attachment.name}`;
        const tempPath = path.join(this.tempDir, fileName);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(tempPath);
            
            https.get(attachment.url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(tempPath);
                });
            }).on('error', (error) => {
                fs.unlink(tempPath, () => {}); // 失敗時クリーンアップ
                reject(new ChannelLogError(
                    `ファイルダウンロード失敗: ${attachment.name}`,
                    'ATTACHMENT_DOWNLOAD_FAILED',
                    { url: attachment.url, originalError: error }
                ));
            });
        });
    }

    /**
     * リアクション情報を処理
     */
    private async processReactions(message: Message): Promise<ReactionData[]> {
        const reactions: ReactionData[] = [];

        for (const [, reaction] of message.reactions.cache) {
            try {
                const users = await reaction.users.fetch();
                reactions.push({
                    emoji: reaction.emoji.name || reaction.emoji.toString(),
                    count: reaction.count,
                    users: users.map(user => user.username)
                });
            } catch (error) {
                console.warn(`リアクション取得エラー:`, error);
            }
        }

        return reactions;
    }

    /**
     * logカテゴリを確保（未存在時は作成）
     */
    private async ensureLogCategory(): Promise<CategoryChannel> {
        // 既存のlogカテゴリを検索
        const existingLogCategory = this.guild.channels.cache
            .find(ch => ch.type === ChannelType.GuildCategory && ch.name === 'log') as CategoryChannel;

        if (existingLogCategory) {
            return existingLogCategory;
        }

        // logカテゴリを新規作成
        try {
            const logCategory = await this.guild.channels.create({
                name: 'log',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        type: OverwriteType.Role,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                    // 管理者権限は自動継承
                ]
            });

            console.log('logカテゴリを作成しました');
            return logCategory;

        } catch (error) {
            throw new ChannelLogError(
                'logカテゴリの作成に失敗しました',
                'LOG_CATEGORY_CREATION_FAILED',
                { originalError: error }
            );
        }
    }

    /**
     * ログチャンネルを作成
     */
    private async createLogChannel(logCategoryId: string, channelName: string): Promise<TextChannel> {
        try {
            return await this.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: logCategoryId,
                topic: `CoCシナリオログ - ${channelName}`,
                permissionOverwrites: [
                    {
                        id: this.guild.roles.everyone.id,
                        type: OverwriteType.Role,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
        } catch (error) {
            throw new ChannelLogError(
                `ログチャンネル作成に失敗: ${channelName}`,
                'THREAD_CREATION_FAILED',
                { channelName, originalError: error }
            );
        }
    }

    /**
     * スレッドにチャンネルログを送信（1メッセージ1embed形式）
     */
    private async sendChannelLogToThread(thread: ThreadChannel, channelLog: ChannelLog): Promise<void> {
        try {
            const tempFiles: string[] = [];

            for (const message of channelLog.messages) {
                // 各メッセージを1つのembedとして作成
                const messageEmbed = this.createMessageEmbed(message);
                
                // 送信準備
                const sendOptions: any = { embeds: [messageEmbed] };

                // 添付ファイルがある場合は再アップロード
                if (message.attachments.length > 0) {
                    const attachmentBuilders = await this.prepareAttachmentBuilders(message.attachments);
                    if (attachmentBuilders.length > 0) {
                        sendOptions.files = attachmentBuilders;
                    }
                    tempFiles.push(...message.attachments.map(att => att.tempPath).filter(Boolean) as string[]);
                }

                // メッセージ送信
                await thread.send(sendOptions);

                // 元のembedがある場合も送信
                if (message.embeds.length > 0) {
                    try {
                        for (const embedData of message.embeds) {
                            const originalEmbed = new EmbedBuilder(embedData);
                            await thread.send({ embeds: [originalEmbed] });
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } catch (embedError) {
                        console.warn(`元embed送信エラー:`, embedError);
                    }
                }

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 一時ファイル削除
            await this.cleanupTempFiles(tempFiles);

        } catch (error) {
            throw new ChannelLogError(
                `ログ送信に失敗: ${channelLog.channelName}`,
                'LOG_SEND_FAILED',
                { channelName: channelLog.channelName, originalError: error }
            );
        }
    }


    /**
     * メッセージをembedとして作成
     */
    private createMessageEmbed(message: MessageData): EmbedBuilder {
        const author = message.author.displayName;
        
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: author,
                iconURL: this.getUserAvatarURL(message.author.id)
            })
            .setFooter({ text: this.formatDateTime(message.timestamp) });

        // メッセージ本文
        if (message.content) {
            embed.setDescription(message.content);
        }

        // 編集済み情報をフッターに追記
        if (message.editedTimestamp) {
            const originalFooter = embed.data.footer?.text || '';
            embed.setFooter({ text: `${originalFooter} (編集済み: ${this.formatDateTime(message.editedTimestamp)})` });
        }

        // 色設定（グレー統一）
        embed.setColor(0x99AAB5); // Discord グレー

        return embed;
    }

    /**
     * 添付ファイルBuilderを準備
     */
    private async prepareAttachmentBuilders(attachments: AttachmentData[]): Promise<AttachmentBuilder[]> {
        const builders: AttachmentBuilder[] = [];

        for (const attachment of attachments) {
            try {
                if (attachment.tempPath && fs.existsSync(attachment.tempPath)) {
                    const builder = new AttachmentBuilder(attachment.tempPath, { 
                        name: attachment.filename,
                        description: attachment.description 
                    });
                    builders.push(builder);
                }
            } catch (error) {
                console.warn(`添付ファイルBuilder作成エラー ${attachment.filename}:`, error);
            }
        }

        return builders;
    }

    /**
     * スレッドリンク集約embedを送信
     */
    private async sendThreadLinksEmbed(logChannel: TextChannel, threads: ThreadChannel[], categoryName: string): Promise<void> {
        if (threads.length === 0) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📂 ${categoryName} - LOG`)
            .setColor(0x99AAB5) // グレー
            .setTimestamp()
            .setFooter({ text: `総チャンネル数: ${threads.length}個` });

        // スレッドリンクを追加（最大25個まで）
        const threadLinks = threads.slice(0, 25).map(thread => {
            const originalChannelName = thread.name.replace('_ログ', '');
            return `🧵 <#${thread.id}> (${originalChannelName})`;
        });

        // 5個ずつのグループに分けてフィールド追加
        for (let i = 0; i < threadLinks.length; i += 5) {
            const group = threadLinks.slice(i, i + 5);
            const fieldName = i === 0 ? '📋 ログスレッド一覧' : `続き (${i + 1}-${Math.min(i + 5, threadLinks.length)}個目)`;
            
            embed.addFields({
                name: fieldName,
                value: group.join('\n'),
                inline: false
            });
        }

        if (threads.length > 25) {
            embed.addFields({
                name: '⚠️ 注意',
                value: `${threads.length - 25}個の追加スレッドがあります。チャンネル内で確認してください。`,
                inline: false
            });
        }

        await logChannel.send({ embeds: [embed] });
    }

    /**
     * スレッド作成時の自動メッセージを削除
     */
    private async cleanupThreadCreationMessages(messages: Message[]): Promise<void> {
        for (const message of messages) {
            try {
                await message.delete();
                await new Promise(resolve => setTimeout(resolve, 100)); // レート制限対策
            } catch (error) {
                console.warn(`スレッド作成メッセージ削除エラー:`, error);
                // エラーでも継続（重要度低い）
            }
        }
    }

    /**
     * チャンネル種別を判定
     */
    private determineChannelType(channelName: string): 'basic' | 'handout' | 'user_specific' {
        if (channelName.startsWith('ho') && channelName.includes('-')) {
            return 'user_specific';
        } else if (channelName.startsWith('ho-')) {
            return 'handout';
        } else {
            return 'basic';
        }
    }

    /**
     * 一時ディレクトリ確保
     */
    private ensureTempDir(): void {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * 一時ファイル削除
     */
    private async cleanupTempFiles(tempPaths: string[]): Promise<void> {
        for (const tempPath of tempPaths) {
            try {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            } catch (error) {
                console.warn(`一時ファイル削除エラー ${tempPath}:`, error);
            }
        }
    }

    /**
     * 日付フォーマット（YYYY-MM-DD）
     */
    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }


    /**
     * 日時フォーマット
     */
    private formatDateTime(date: Date): string {
        return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    }

    /**
     * ユーザーアバターURLを取得
     */
    private getUserAvatarURL(userId: string): string {
        const user = this.guild.client.users.cache.get(userId);
        if (user) {
            // Discord.jsのavatar取得メソッドを使用
            return user.displayAvatarURL({ size: 64, extension: 'png' });
        } else {
            // デフォルトDiscordアイコン
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    }

    /**
     * ファイルサイズフォーマット
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
        return Math.round(bytes / 1024 / 1024) + 'MB';
    }
}