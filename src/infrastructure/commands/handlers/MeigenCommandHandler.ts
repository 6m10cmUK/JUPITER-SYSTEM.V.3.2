import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import {
    createSuccessMessage,
    createErrorMessage,
    createInfoMessage,
    createInfoDescriptionMessage,
} from '../../../presentation/discord/builders/messages';
import { MeigenService, MeigenEntry } from '../../../domain/services/MeigenService';
import { MeigenError } from '../../../shared/errors/MeigenError';
import { logResult } from '../../../shared/utils/UsageLogger';

const MAX_LIST_DISPLAY_COUNT = 20;
const MAX_LIST_DESCRIPTION_LENGTH = 4096;

/**
 * 名言コマンドハンドラー（統一ハンドラーパターン）
 */
export class MeigenCommandHandler {
    private readonly meigenService: MeigenService;

    constructor() {
        this.meigenService = new MeigenService();
    }

    /**
     * 名言管理処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand(false);

        try {
            // サブコマンドに応じた処理
            switch (subcommand) {
                case 'add':
                    await this.handleAdd(interaction);
                    break;
                case 'random':
                    await this.handleRandom(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'delete':
                    await this.handleDelete(interaction);
                    break;
                default:
                    throw new MeigenError('不明なサブコマンドです', 'INVALID_INPUT');
            }
        } catch (error) {
            // ユーザーフレンドリーなエラーメッセージ
            let userMessage = '予期しないエラーが発生しました';

            if (error instanceof MeigenError) {
                switch (error.code) {
                    case 'NO_GUILD':
                        userMessage = 'このコマンドはサーバー内でのみ使用できます';
                        break;
                    case 'NOT_FOUND':
                        userMessage = error.message;
                        break;
                    case 'INVALID_INPUT':
                        userMessage = error.message;
                        break;
                    case 'OPERATION_FAILED':
                        userMessage = error.message;
                        break;
                }
            }

            // 二重応答対策
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    ...createErrorMessage(interaction, 'MEIGEN ERROR', userMessage),
                    ephemeral: true,
                });
            } else if (interaction.deferred) {
                await interaction.editReply(createErrorMessage(interaction, 'MEIGEN ERROR', userMessage));
            }

            // 詳細ログ
            console.error('Meigen command error:', {
                error: error instanceof Error ? error.message : String(error),
                subcommand,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                stack: error instanceof Error ? error.stack : undefined,
            });
        }
    }

    /**
     * サーバーIDを取得
     * @param interaction Discord インタラクション
     * @returns サーバーID
     */
    private requireGuildId(interaction: ChatInputCommandInteraction): string {
        const guildId = interaction.guildId;
        if (!guildId) {
            throw new MeigenError('このコマンドはサーバー内でのみ使用できます', 'NO_GUILD');
        }

        return guildId;
    }

    /**
     * add: 名言登録処理
     * @param interaction Discord インタラクション
     */
    private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = this.requireGuildId(interaction);

        const content = interaction.options.getString('content');
        if (!content) {
            throw new MeigenError('名言の内容を入力してください', 'INVALID_INPUT');
        }

        const author = interaction.options.getUser('author');
        const authorName = interaction.options.getString('author_name');
        const finalAuthorId = author?.id ?? null;
        const resolvedAuthorName = authorName ??
            await this.resolveAuthorDisplay(interaction, finalAuthorId, author?.username ?? null);
        const finalAuthorName = authorName ?? (author ? resolvedAuthorName : null);

        const entry = this.meigenService.add(
            guildId,
            content,
            interaction.user.id,
            finalAuthorId ?? undefined,
            finalAuthorName ?? undefined
        );

        const authorDisplay = finalAuthorName ?? '不明';

        await interaction.reply(
            createSuccessMessage(interaction, 'MEIGEN REGISTERED', `#${entry.id} [${content}] - ${authorDisplay}`)
        );

        logResult(interaction, `status=success subcommand=add id=${entry.id} author=${authorDisplay}`);
    }

    /**
     * 発言者の表示名を解決
     * @param interaction Discord インタラクション
     * @param authorId 発言者のDiscordユーザーID
     * @param authorName 解決できない場合の表示名
     * @returns 発言者の表示名
     */
    private async resolveAuthorDisplay(
        interaction: ChatInputCommandInteraction,
        authorId: string | null,
        authorName: string | null
    ): Promise<string> {
        if (authorId) {
            try {
                const member: GuildMember | undefined = await interaction.guild?.members.fetch(authorId);
                if (member) {
                    return member.displayName;
                }
            } catch {
                // メンバー情報を解決できない場合は保存済み表示名へフォールバックする。
            }
        }

        return authorName ?? '不明';
    }

    /**
     * random: ランダム表示処理
     * @param interaction Discord インタラクション
     */
    private async handleRandom(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = this.requireGuildId(interaction);

        const entry = this.meigenService.getRandom(guildId);

        if (!entry) {
            await interaction.reply({
                ...createInfoMessage(interaction, 'MEIGEN', 'NO MEIGEN REGISTERED'),
                ephemeral: true,
            });
            return;
        }

        const authorDisplay = await this.resolveAuthorDisplay(
            interaction,
            entry.authorId ?? null,
            entry.authorName ?? null
        );

        await interaction.reply(
            createInfoMessage(interaction, 'MEIGEN', `#${entry.id} [${entry.content}] - ${authorDisplay}`)
        );

        logResult(interaction, `status=success subcommand=random id=${entry.id}`);
    }

    /**
     * list: 一覧表示処理
     * @param interaction Discord インタラクション
     */
    private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = this.requireGuildId(interaction);

        const entries = this.meigenService.getAll(guildId);

        if (entries.length === 0) {
            await interaction.reply({
                ...createInfoMessage(interaction, 'MEIGEN', 'NO MEIGEN REGISTERED'),
                ephemeral: true,
            });
            return;
        }

        // 最初の20件を表示
        const displayEntries = entries.slice(0, MAX_LIST_DISPLAY_COUNT);
        const authorDisplayNames = await this.fetchAuthorDisplayNames(interaction, displayEntries);

        // 名言一覧を構築
        const listItems = displayEntries.map((entry: MeigenEntry) => {
            const authorDisplay = this.resolveCachedAuthorDisplay(entry.authorId, entry.authorName, authorDisplayNames);
            return `#${entry.id} [${entry.content}] - ${authorDisplay}`;
        });
        const remainingCount = entries.length - displayEntries.length;
        const description = this.buildLimitedListDescription(listItems, remainingCount);
        const message = createInfoDescriptionMessage(
            interaction,
            `MEIGEN LIST (${entries.length}件)`,
            description
        );

        await interaction.reply(message);

        logResult(interaction, `status=success subcommand=list total=${entries.length} displayed=${displayEntries.length}`);
    }

    /**
     * 一覧表示用の発言者表示名を一括取得
     * @param interaction Discord インタラクション
     * @param entries 表示対象の名言
     * @returns ユーザーIDと表示名の対応表
     */
    private async fetchAuthorDisplayNames(
        interaction: ChatInputCommandInteraction,
        entries: MeigenEntry[]
    ): Promise<Map<string, string>> {
        const authorIds = Array.from(new Set(
            entries
                .map((entry: MeigenEntry) => entry.authorId)
                .filter((authorId): authorId is string => typeof authorId === 'string' && authorId.length > 0)
        ));

        if (!interaction.guild || authorIds.length === 0) {
            return new Map<string, string>();
        }

        try {
            const members = await interaction.guild.members.fetch({ user: authorIds });
            const displayNames = new Map<string, string>();

            members.forEach((member: GuildMember, authorId: string) => {
                displayNames.set(authorId, member.displayName);
            });

            return displayNames;
        } catch {
            return new Map<string, string>();
        }
    }

    /**
     * 一括取得済みメンバー情報から表示名を解決
     * @param authorId 発言者のDiscordユーザーID
     * @param authorName 解決できない場合の表示名
     * @param authorDisplayNames ユーザーIDと表示名の対応表
     * @returns 発言者の表示名
     */
    private resolveCachedAuthorDisplay(
        authorId: string | null,
        authorName: string | null,
        authorDisplayNames: Map<string, string>
    ): string {
        if (authorId) {
            const displayName = authorDisplayNames.get(authorId);
            if (displayName) {
                return displayName;
            }
        }

        return authorName ?? '不明';
    }

    /**
     * Discordの説明文上限に収まる一覧本文を構築
     * @param listItems 一覧項目
     * @param initialRemainingCount 表示対象外の件数
     * @returns 一覧本文
     */
    private buildLimitedListDescription(listItems: string[], initialRemainingCount: number): string {
        const selectedItems: string[] = [];

        for (const item of listItems) {
            selectedItems.push(item);

            const omittedCount = initialRemainingCount + listItems.length - selectedItems.length;
            const description = this.composeListDescription(selectedItems, omittedCount);
            if (description.length > MAX_LIST_DESCRIPTION_LENGTH) {
                selectedItems.pop();
                break;
            }
        }

        const omittedCount = initialRemainingCount + listItems.length - selectedItems.length;
        return this.composeListDescription(selectedItems, omittedCount);
    }

    /**
     * 一覧本文を組み立て
     * @param listItems 表示する一覧項目
     * @param remainingCount 省略した件数
     * @returns 一覧本文
     */
    private composeListDescription(listItems: string[], remainingCount: number): string {
        let description = listItems.join('\n');

        if (remainingCount > 0) {
            const remainingText = `他 ${remainingCount} 件`;
            description = description.length > 0
                ? `${description}\n\n${remainingText}`
                : remainingText;
        }

        return description;
    }

    /**
     * delete: 削除処理
     * @param interaction Discord インタラクション
     */
    private async handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = this.requireGuildId(interaction);
        if (!interaction.guild) {
            throw new MeigenError('このコマンドはサーバー内でのみ使用できます', 'NO_GUILD');
        }

        const hasPermission = interaction.guild.ownerId === interaction.user.id ||
            (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false);

        if (!hasPermission) {
            await interaction.reply({
                ...createErrorMessage(
                    interaction,
                    'PERMISSION DENIED',
                    'このコマンドは管理者またはサーバーオーナーのみ使用できます'
                ),
                ephemeral: true,
            });
            return;
        }

        const id = interaction.options.getInteger('id');
        if (id === null || id < 1) {
            throw new MeigenError('有効な名言IDを指定してください', 'INVALID_INPUT');
        }

        const success = this.meigenService.delete(guildId, id);

        if (!success) {
            await interaction.reply({
                ...createErrorMessage(interaction, 'MEIGEN DELETE FAILED', 'NOT FOUND'),
                ephemeral: true,
            });
            return;
        }

        await interaction.reply(createSuccessMessage(interaction, 'MEIGEN DELETED', `#${id}`));

        logResult(interaction, `status=success subcommand=delete id=${id}`);
    }
}
