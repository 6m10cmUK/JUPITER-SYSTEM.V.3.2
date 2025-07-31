/**
 * 名前の処理と検証を行うユーティリティ
 */

import { validateInput, recordValidation } from './statusValidator';

/**
 * 名前入力を処理する
 * @param input 入力された名前
 * @param messageId メッセージID
 * @returns 処理結果
 */
export function processNameInput(input: string, messageId: string): {
    shouldUpdate: boolean;
    actualName: string;
    hasSpecialFormat: boolean;
} {
    // デフォルトの結果
    const result = {
        shouldUpdate: true,
        actualName: input,
        hasSpecialFormat: false
    };
    
    // 入力フォーマットの検証
    if (validateInput(input)) {
        // 特定フォーマットの後に続く文字列を取得
        const afterPattern = input.substring(3).trim();
        
        // 数値パターンのチェック（例: パターン+数値）
        const numberMatch = afterPattern.match(/^(\d+)(.*)$/);
        if (numberMatch) {
            const numericValue = parseInt(numberMatch[1]);
            const remainingText = numberMatch[2].trim();
            
            // 数値を記録
            recordValidation(messageId, numericValue);
            result.hasSpecialFormat = true;
            
            // 数値の後に文字列があればそれを名前に、なければ更新しない
            if (remainingText) {
                result.actualName = remainingText;
            } else {
                result.shouldUpdate = false;
            }
        }
    }
    
    return result;
}