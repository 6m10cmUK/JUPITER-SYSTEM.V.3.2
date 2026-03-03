/**
 * ダイス式の解析を行うドメインサービス
 */

import { unescapeDiscordMarkdown } from '../../shared/utils/discordUtils';

export class DiceExpressionParser {
    /**
     * ダイス式を含む詳細文字列からダイス式を抽出する
     * 例: "2d6+6: (4,5)+6" -> "2d6+6"
     * 例: "(4,5)+6" -> null (ダイス式なし)
     * エスケープされた文字も考慮（例: "2d6\\*3: (4,5)\\*3"）
     */
    static extractDiceExpression(details: string): string | null {
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
    static extractDiceResult(details: string): string {
        const colonIndex = details.indexOf(':');
        if (colonIndex !== -1) {
            return details.substring(colonIndex + 1).trim();
        }
        return details;
    }

    /**
     * ダイス式文字列から詳細部分を抽出する
     * 例: "2d6+6 ＞ (4,5)+6 ＞ 15" から "(4,5)+6 ＞ 15" 部分を抽出
     * customSetInteraction の正規表現ロジックを移動
     */
    static extractDetailPart(expression: string): string | null {
        const match = expression.match(/＞\s*(\([^)]+\)[^＞]*)(?:\s*＞|$)/);
        if (match) {
            return match[1].trim();
        }
        return null;
    }
}
