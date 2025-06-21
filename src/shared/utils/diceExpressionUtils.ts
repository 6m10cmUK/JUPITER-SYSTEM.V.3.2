import { unescapeDiscordMarkdown } from './discordUtils';

/**
 * ダイス式を含む詳細文字列からダイス式を抽出する
 * 例: "2d6+6: (4,5)+6" -> "2d6+6"
 * 例: "(4,5)+6" -> null (ダイス式なし)
 * エスケープされた文字も考慮（例: "2d6\\*3: (4,5)\\*3"）
 */
export function extractDiceExpression(details: string): string | null {
    // "ダイス式: " のパターンを探す
    const match = details.match(/^([^:]+):\s*/);
    if (match) {
        // エスケープを解除して返す
        return unescapeDiscordMarkdown(match[1].trim());
    }
    return null;
}

/**
 * 詳細文字列からダイス結果部分を抽出する
 * 例: "2d6+6: (4,5)+6" -> "(4,5)+6"
 * 例: "(4,5)+6" -> "(4,5)+6"
 */
export function extractDiceResult(details: string): string {
    const colonIndex = details.indexOf(':');
    if (colonIndex !== -1) {
        return details.substring(colonIndex + 1).trim();
    }
    return details;
}