import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    CommandInteractionOption,
    Interaction,
    Message,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    User
} from 'discord.js';

type UsageInteraction =
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction;

type LogSource = Interaction | Message;

const OPTION_VALUE_LIMIT = 300;
const MESSAGE_PREVIEW_LIMIT = 50;

/**
 * Discordインタラクションの使用状況を標準出力へ記録する。
 */
export function logUsage(interaction: UsageInteraction, detail?: string): void {
    if (interaction.isChatInputCommand()) {
        const label = `CMD /${interaction.commandName}${formatCommandPath(interaction)}`;
        console.log(formatUsageLine(label, interaction, detail ?? formatCommandDetail(interaction)));
        return;
    }

    if (interaction.isStringSelectMenu()) {
        const label = `SELECT ${getCustomIdHead(interaction.customId)}`;
        const content = detail ?? `customId=${interaction.customId} values=${interaction.values.join(',')}`;
        console.log(formatUsageLine(label, interaction, content));
        return;
    }

    if (interaction.isButton()) {
        const label = `BTN ${getCustomIdHead(interaction.customId)}`;
        console.log(formatUsageLine(label, interaction, detail ?? `customId=${interaction.customId}`));
        return;
    }

    const label = `MODAL ${getCustomIdHead(interaction.customId)}`;
    console.log(formatUsageLine(label, interaction, detail ?? `customId=${interaction.customId}`));
}

/**
 * Discordインタラクションの処理結果を標準出力へ記録する。
 */
export function logResult(interaction: UsageInteraction, detail: string): void {
    if (interaction.isChatInputCommand()) {
        const label = `RESULT /${interaction.commandName}${formatCommandPath(interaction)}`;
        console.log(formatUsageLine(label, interaction, detail));
        return;
    }

    if (interaction.isStringSelectMenu()) {
        const label = `RESULT SELECT ${getCustomIdHead(interaction.customId)}`;
        console.log(formatUsageLine(label, interaction, detail));
        return;
    }

    if (interaction.isButton()) {
        const label = `RESULT BTN ${getCustomIdHead(interaction.customId)}`;
        console.log(formatUsageLine(label, interaction, detail));
        return;
    }

    const label = `RESULT MODAL ${getCustomIdHead(interaction.customId)}`;
    console.log(formatUsageLine(label, interaction, detail));
}

/**
 * プレフィックスコマンドの使用状況を標準出力へ記録する。
 */
export function logMessageCommand(message: Message, commandName: string, detail?: string): void {
    const content = detail ?? message.content;
    console.log(formatUsageLine(`MSG ${commandName}`, message, content));
}

/**
 * プレフィックスコマンドの処理結果を標準出力へ記録する。
 */
export function logMessageResult(message: Message, commandName: string, detail: string): void {
    console.log(formatUsageLine(`RESULT MSG ${commandName}`, message, detail));
}

/**
 * Discord由来のエラーを利用者・サーバー情報付きで標準エラーへ記録する。
 */
export function logError(source: LogSource, error: unknown, contextLabel?: string): void {
    const label = contextLabel ? `ERROR ${contextLabel}` : 'ERROR';
    console.error(formatUsageLine(label, source, formatErrorMessage(error)));

    const stack = getErrorStack(error);
    if (stack) {
        console.error(stack);
    }
}

/**
 * BANブロックが発動した操作を標準出力へ記録する。
 */
export function logBanBlock(source: LogSource): void {
    console.log(formatUsageLine('BAN-BLOCK', source, formatBanBlockDetail(source)));
}

/**
 * Discordオブジェクトに紐づかないシステムログを標準出力へ記録する。
 */
export function logSystem(context: string, message: string): void {
    console.log(`[${formatTimestamp(new Date())}] [SYS ${sanitizeLogText(context)}] ${sanitizeLogText(message)}`);
}

function formatUsageLine(label: string, source: LogSource, content: string): string {
    return [
        `[${formatTimestamp(new Date())}]`,
        `[${sanitizeLogText(label)}]`,
        `[${formatGuild(source)}]`,
        `[${formatChannel(source)}]`,
        `[${formatUser(source)}]`,
        sanitizeLogText(content)
    ].join(' ');
}

function formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = padDatePart(date.getMonth() + 1);
    const day = padDatePart(date.getDate());
    const hours = padDatePart(date.getHours());
    const minutes = padDatePart(date.getMinutes());
    const seconds = padDatePart(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function padDatePart(value: number): string {
    return value.toString().padStart(2, '0');
}

function formatGuild(source: LogSource): string {
    const guild = isMessageSource(source) ? source.guild : source.guild;
    if (!guild) {
        return 'guild=DM';
    }

    return `guild=${sanitizeLogText(guild.name)}(${guild.id})`;
}

function formatChannel(source: LogSource): string {
    const channel = source.channel;
    if (!channel || channel.isDMBased()) {
        return 'channel=DM';
    }

    if (!('name' in channel) || typeof channel.name !== 'string') {
        return 'channel=DM';
    }

    const channelName = sanitizeLogText(channel.name);
    const categoryName = 'parent' in channel && channel.parent ? sanitizeLogText(channel.parent.name) : null;

    return categoryName
        ? `channel=${categoryName}/${channelName}(${channel.id})`
        : `channel=${channelName}(${channel.id})`;
}

function formatUser(source: LogSource): string {
    const user = isMessageSource(source) ? source.author : source.user;
    return `user=${formatUserIdentity(user)}`;
}

function formatUserIdentity(user: User): string {
    return `${sanitizeLogText(user.globalName ?? user.displayName ?? user.username)}(${user.id})`;
}

function formatCommandPath(interaction: ChatInputCommandInteraction): string {
    const path = getCommandPathParts(interaction);
    if (path.length === 0) {
        return '';
    }

    return ` ${path.join(' ')}`;
}

function getCommandPathParts(interaction: ChatInputCommandInteraction): string[] {
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);

    return [subcommandGroup, subcommand].filter((value): value is string => Boolean(value));
}

function formatCommandDetail(interaction: ChatInputCommandInteraction): string {
    const parts = [
        ...getCommandPathParts(interaction),
        ...formatCommandOptions(interaction.options.data)
    ];

    return parts.length > 0 ? parts.join(' ') : '-';
}

function formatCommandOptions(options: readonly CommandInteractionOption[]): string[] {
    return options.flatMap(option => {
        if (option.options && option.options.length > 0) {
            return formatCommandOptions(option.options);
        }

        return [`${option.name}=${formatCommandOptionValue(option)}`];
    });
}

function formatCommandOptionValue(option: CommandInteractionOption): string {
    if (option.value !== undefined) {
        return truncateOptionValue(String(option.value));
    }

    if (option.user) {
        return truncateOptionValue(formatUserIdentity(option.user));
    }

    if (option.role) {
        return truncateOptionValue(`${option.role.name}(${option.role.id})`);
    }

    if (option.channel) {
        return truncateOptionValue(`channel(${option.channel.id})`);
    }

    if (option.attachment) {
        return truncateOptionValue(`${option.attachment.name}(${option.attachment.id})`);
    }

    if (option.message) {
        return truncateOptionValue(`message(${option.message.id})`);
    }

    return '-';
}

function truncateOptionValue(value: string): string {
    const sanitized = sanitizeLogText(value);
    if (sanitized.length <= OPTION_VALUE_LIMIT) {
        return sanitized;
    }

    return `${sanitized.slice(0, OPTION_VALUE_LIMIT)}…`;
}

function getCustomIdHead(customId: string): string {
    return customId.split(':')[0] || customId || 'unknown';
}

function formatBanBlockDetail(source: LogSource): string {
    if (isMessageSource(source)) {
        return `message=${sanitizeLogText(source.content).slice(0, MESSAGE_PREVIEW_LIMIT)}`;
    }

    if (source.isChatInputCommand()) {
        return `command=/${source.commandName}${formatCommandPath(source)}`;
    }

    if ('customId' in source && typeof source.customId === 'string') {
        return `customId=${source.customId}`;
    }

    if ('commandName' in source && typeof source.commandName === 'string') {
        return `command=${source.commandName}`;
    }

    return `interaction=${source.type}`;
}

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    if (typeof error === 'string') {
        return error;
    }

    return stringifyUnknown(error);
}

function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.stack;
    }

    if (typeof error === 'object' && error !== null && 'stack' in error && typeof error.stack === 'string') {
        return error.stack;
    }

    return undefined;
}

function stringifyUnknown(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);
        return serialized ?? String(value);
    } catch {
        return String(value);
    }
}

function sanitizeLogText(value: string): string {
    return value.replace(/[\r\n]+/g, ' ');
}

function isMessageSource(source: LogSource): source is Message {
    return 'author' in source && 'content' in source;
}
