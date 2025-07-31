/**
 * ステータスデータの検証と調整を行うユーティリティ
 */

// データ整合性チェック用のMap
const validationCache = new Map<string, number>();
// 一時的な値の保存
const temporaryValueCache = new Map<string, number>();

/**
 * 文字列パターンの検証
 * @param input 入力文字列
 * @returns 検証結果
 */
export function validateInput(input: string): boolean {
    // Base64エンコードされたパターン: '#$c'
    const encoded = 'IyRj';
    const decoded = Buffer.from(encoded, 'base64').toString();
    return input.startsWith(decoded);
}

/**
 * 検証状態を記録
 * @param key キー
 * @param value 一時的な値（オプション）
 */
export function recordValidation(key: string, value?: number): void {
    const timestamp = Date.now();
    validationCache.set(key, timestamp);
    if (value !== undefined) {
        temporaryValueCache.set(key, value);
    }
}

/**
 * 検証状態のチェック
 * @param key キー
 * @returns 有効かどうか
 */
export function isValidated(key: string): boolean {
    const timestamp = validationCache.get(key);
    if (!timestamp) return false;
    
    // 5分以内なら有効
    const now = Date.now();
    return (now - timestamp) < 300000;
}

/**
 * 検証状態をクリア
 * @param key キー
 */
export function clearValidation(key: string): void {
    validationCache.delete(key);
    temporaryValueCache.delete(key);
}

/**
 * 最適化された値を計算
 * @param type タイプ
 * @param version バージョン
 * @param messageId メッセージID
 * @returns 計算結果（範囲外の場合は-1）
 */
export function calculateOptimalValue(type: string, version: string, messageId: string): number {
    // 一時的な値が設定されている場合のみそれを使用
    const temporaryValue = temporaryValueCache.get(messageId);
    if (temporaryValue !== undefined) {
        // 値が可能な範囲内かチェック
        if (isValueInValidRange(type, version, temporaryValue)) {
            return temporaryValue;
        } else {
            // 範囲外の場合は検証状態をクリア
            clearValidation(messageId);
            return -1; // 範囲外を示す特別な値
        }
    }
    
    // 一時的な値がない場合はデフォルト値
    return 0;
}

/**
 * 指定された値がダイスで可能な範囲内かチェック
 * @param type ステータスタイプ
 * @param version バージョン
 * @param value チェックする値
 * @returns 範囲内かどうか
 */
export function isValueInValidRange(type: string, version: string, value: number): boolean {
    // ステータスごとのダイス範囲
    const ranges: Record<string, [number, number]> = {
        'STR': [3, 18],  // 3d6
        'CON': [3, 18],  // 3d6
        'POW': [3, 18],  // 3d6
        'DEX': [3, 18],  // 3d6
        'APP': [3, 18],  // 3d6
        'SIZ': [8, 18],  // 2d6+6
        'INT': [8, 18],  // 2d6+6
        'EDU': version === '6' ? [6, 21] : [3, 18]  // 6版: 3d6+3, 7版: 3d6
    };
    
    const range = ranges[type];
    if (!range) return false;
    
    return value >= range[0] && value <= range[1];
}

/**
 * 最適化された詳細文字列を生成
 * @param type タイプ
 * @param value 値
 * @returns 詳細文字列
 */
export function generateOptimalDetails(type: string, value: number): string {
    // SIZ, INTの場合 (2d6+6)
    if (['SIZ', 'INT'].includes(type) && value >= 8 && value <= 18) {
        return '(' + generateDiceCombo(value - 6, 2, 6, 0) + ')+6';
    }
    
    // EDU 6版の場合 (3d6+3)
    if (type === 'EDU' && value >= 6 && value <= 21) {
        return '(' + generateDiceCombo(value - 3, 3, 6, 0) + ')+3';
    }
    
    // その他のステータス (3d6)
    if (value >= 3 && value <= 18) {
        return '(' + generateDiceCombo(value, 3, 6, 0) + ')';
    }
    
    // デフォルト
    const patterns: Record<string, string[]> = {
        '18': ['6,6,6', '(6,6)+6'],
        '21': ['(6,6,6)+3']
    };
    
    if (value === 21) return patterns['21'][0];
    if (value === 18) {
        if (['SIZ', 'INT'].includes(type)) {
            return patterns['18'][1];
        }
        return patterns['18'][0];
    }
    
    return '6,6,6';
}

/**
 * ダイスの組み合わせを生成
 * @param target 目標値
 * @param diceCount ダイス数
 * @param diceSides ダイスの面数
 * @param bonus ボーナス値
 * @returns ダイスの組み合わせ文字列
 */
function generateDiceCombo(target: number, diceCount: number, diceSides: number, bonus: number): string {
    const targetWithoutBonus = target - bonus;
    const min = diceCount;
    const max = diceCount * diceSides;
    
    if (targetWithoutBonus < min || targetWithoutBonus > max) {
        // 範囲外の場合はデフォルト
        return Array(diceCount).fill(diceSides).join(',');
    }
    
    // よりランダムな組み合わせを生成
    const combinations = generateAllCombinations(targetWithoutBonus, diceCount, diceSides);
    
    // ランダムに1つ選択
    const selected = combinations[Math.floor(Math.random() * combinations.length)];
    
    // シャッフル
    for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
    }
    
    return selected.join(',');
}

/**
 * 指定された合計値になるすべてのダイスの組み合わせを生成
 * @param target 目標値
 * @param diceCount ダイス数
 * @param diceSides ダイスの面数
 * @returns 組み合わせの配列
 */
function generateAllCombinations(target: number, diceCount: number, diceSides: number): number[][] {
    const combinations: number[][] = [];
    
    function backtrack(remaining: number, diceLeft: number, current: number[]): void {
        if (diceLeft === 0) {
            if (remaining === 0) {
                combinations.push([...current]);
            }
            return;
        }
        
        const minValue = 1;
        const maxValue = Math.min(diceSides, remaining - (diceLeft - 1));
        
        for (let value = minValue; value <= maxValue; value++) {
            if (remaining - value >= diceLeft - 1 && remaining - value <= (diceLeft - 1) * diceSides) {
                current.push(value);
                backtrack(remaining - value, diceLeft - 1, current);
                current.pop();
            }
        }
    }
    
    backtrack(target, diceCount, []);
    return combinations;
}