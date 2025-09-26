/**
 * ダイスシステム専用のエラークラス群
 * より詳細でユーザーフレンドリーなエラーハンドリングを提供
 */

/**
 * ダイスシステムの基底エラークラス
 */
export class DiceSystemError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly expression?: string
    ) {
        super(message);
        this.name = 'DiceSystemError';
    }
}

/**
 * 無効なダイス式エラー
 */
export class InvalidExpressionError extends DiceSystemError {
    constructor(expression: string, details: string) {
        super(`Invalid dice expression: ${details}`, 'INVALID_EXPRESSION', expression);
    }
}

/**
 * 数式評価エラー
 */
export class MathEvaluationError extends DiceSystemError {
    constructor(expression: string, details: string) {
        super(`Math evaluation failed: ${details}`, 'MATH_EVALUATION_ERROR', expression);
    }
}

/**
 * ダイス値範囲エラー
 */
export class DiceRangeError extends DiceSystemError {
    constructor(expression: string, details: string) {
        super(`Dice range error: ${details}`, 'DICE_RANGE_ERROR', expression);
    }
}

/**
 * セキュリティエラー（不正な文字など）
 */
export class DiceSecurityError extends DiceSystemError {
    constructor(expression: string, details: string) {
        super(`Security violation: ${details}`, 'DICE_SECURITY_ERROR', expression);
    }
}