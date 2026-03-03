import { convertFullWidthToHalfWidth } from '../../../../shared/utils/stringUtils';

/**
 * クラシックダイスコマンドのバリデーター
 */
export class DiceCommandValidator {
    /**
     * 有効なダイスコマンドかどうかをチェック
     */
    static isValidCommand(content: string): boolean {
        // スペースで分割して最初の部分を取得
        const parts = content.split(' ');
        const diceExpression = convertFullWidthToHalfWidth(parts[0]);

        // 特殊ケースのチェック
        if (this.isSpecialCommand(diceExpression)) {
            return true;
        }

        // 通常のダイス表記のチェック
        return this.isStandardDiceCommand(diceExpression);
    }

    /**
     * 特殊なコマンドかどうかをチェック
     */
    private static isSpecialCommand(expression: string): boolean {
        const lowerExpression = expression.toLowerCase();

        // CoC関連コマンド
        if (lowerExpression.startsWith('cc')) {
            return this.isCoCCommand(expression);
        }

        // choice関数
        if (lowerExpression.startsWith('choice(') || lowerExpression.startsWith('choice[')) {
            return true;
        }

        // res/resb関数
        if (lowerExpression.match(/^resb?\(/)) {
            return true;
        }

        // cbr/cbrb関数
        if (lowerExpression.match(/^cbrb?\(/)) {
            return true;
        }

        // 1d100<=n形式（CFSオフ）
        if (expression.match(/^1d100(?:<|>|<=|>=|=)\d+$/i)) {
            return true;
        }

        // 上方無限ロール
        if (expression.match(/^\d+u\d+\[\d+\]$/i)) {
            return true;
        }

        // バラバラ出力またはカウント
        if (expression.match(/^\d+b\d+(?:(?:>=|<=|>|<|=)\d+)?$/i)) {
            return true;
        }

        // 計算式
        if (lowerExpression.match(/^c\(/)) {
            return true;
        }

        // D66
        if (expression.match(/^d66[ns]?$/i)) {
            return true;
        }

        // FAR自動火器
        if (lowerExpression.match(/^far\(/)) {
            return true;
        }

        return false;
    }

    /**
     * CoC関連のコマンドかどうかをチェック
     */
    private static isCoCCommand(expression: string): boolean {
        // CoC 7版の新しいCC形式
        const coc7Pattern = /^cc(?:[+-]?\d+)?(?:<=\d+)?(?:[rhec])?$/i;
        if (coc7Pattern.test(expression)) {
            return true;
        }
        
        // cc/ccbのみ、cc<=数字、CC(x)故障判定 の形式
        const ccPattern = /^ccb?(?:(?:<|>|<=|>=|=)\d+|\(\d+\))?$/i;
        return ccPattern.test(expression);
    }

    /**
     * 標準的なダイスコマンドかどうかをチェック
     */
    private static isStandardDiceCommand(expression: string): boolean {
        // ダイス表記のパターン
        const dicePattern = /\d+d\d+/i;
        
        // 最初の部分がダイス表記を含むかチェック
        if (!dicePattern.test(expression)) {
            return false;
        }

        // 1d10d10のような不正な表記をチェック
        const invalidDicePattern = /\d+d\d+d\d+/i;
        if (invalidDicePattern.test(expression)) {
            return false;
        }

        // 文字列が混入していないかチェック
        // 許可する文字: 数字、d/D、+、-、*、/、(、)、<、>、=、空白
        const validPattern = /^[\d\s+\-*/()dD<>=]+$/;
        
        return validPattern.test(expression);
    }
}