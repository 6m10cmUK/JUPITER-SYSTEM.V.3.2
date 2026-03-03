/**
 * ダイス式の解析を行うドメインサービス
 */

export class DiceExpressionParser {
    /**
     * ダイス式を含む詳細文字列からダイス式を抽出する
     * 例: "2d6+6: (4,5)+6" -> "2d6+6"
     * 例: "(4,5)+6" -> null (ダイス式なし)
     */
    static extractDiceExpression(details: string): string | null {
        const match = details.match(/^([^:]+):\s*/);
        if (match) {
            return match[1].trim();
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
        return details.trim();
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
