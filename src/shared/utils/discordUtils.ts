/**
 * Discord用のマークダウンエスケープ
 * @param text エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeDiscordMarkdown(text: string): string {
    // Discordのマークダウン記号をエスケープ
    return text
        .replace(/\*/g, '\\*')     // Bold/Italic
        .replace(/_/g, '\\_')      // Italic/Underline
        .replace(/~/g, '\\~')      // Strikethrough
        .replace(/`/g, '\\`')      // Code
        .replace(/\|/g, '\\|')     // Spoiler
        .replace(/>/g, '\\>');     // Quote (行頭のみだが安全のため)
}

/**
 * Discord用のマークダウンアンエスケープ
 * @param text アンエスケープするテキスト
 * @returns アンエスケープされたテキスト
 */
export function unescapeDiscordMarkdown(text: string): string {
    // エスケープされたマークダウン記号を元に戻す
    return text
        .replace(/\\\*/g, '*')
        .replace(/\\_/g, '_')
        .replace(/\\~/g, '~')
        .replace(/\\`/g, '`')
        .replace(/\\\|/g, '|')
        .replace(/\\>/g, '>');
}