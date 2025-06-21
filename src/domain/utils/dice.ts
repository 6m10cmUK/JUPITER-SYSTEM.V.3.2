/**
 * ダイスを振る関数
 * @param count ダイスを振る回数
 * @param faces ダイスの面数
 * @returns {number[]} 出目の配列
 */
export function rollDice(count: number, faces: number): number[] {
    return Array.from({ length: count }, () => 
        Math.floor(Math.random() * faces) + 1
    );
}

/**
 * ダイス結果を詳細な文字列にフォーマットする
 * @param results ダイスの結果配列
 * @param multiplier 結果に掛ける数（CoC6版のステータス計算用）
 * @param bonus 追加される固定値
 * @returns {string} フォーマットされた文字列
 */
export function formatDiceDetail(results: number[], multiplier: number = 1, bonus: number = 0): string {
    if (multiplier > 1) {
        return `( ${results.join(', ')} ) * ${multiplier}`;
    }
    if (bonus > 0) {
        return `( ${results.join(', ')} ) + ${bonus}`;
    }
    return `( ${results.join(', ')} )`;
}
