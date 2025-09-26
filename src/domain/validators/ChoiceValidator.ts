/**
 * Choice機能の入力検証を行うバリデーター
 */

/**
 * Choice検証エラー
 */
export class ChoiceValidationError extends Error {
    constructor(
        message: string,
        public readonly code: 'EMPTY_INPUT' | 'INVALID_FORMAT' | 'TOO_MANY_OPTIONS' | 'INVALID_CHARACTERS'
    ) {
        super(message);
        this.name = 'ChoiceValidationError';
    }
}

/**
 * Choice入力の検証結果
 */
export interface ChoiceValidationResult {
    /** 検証結果 */
    isValid: boolean;
    /** パースされた選択肢 */
    options: string[];
    /** エラーメッセージ（検証失敗時） */
    error?: ChoiceValidationError;
}

/**
 * Choice引数のバリデーター
 */
export class ChoiceValidator {
    private static readonly MAX_OPTIONS = 20;
    private static readonly MAX_OPTION_LENGTH = 100;

    /**
     * Choice引数を検証
     * @param args 入力された引数文字列
     * @returns 検証結果
     */
    validate(args: string): ChoiceValidationResult {
        try {
            // 空文字列チェック
            if (!args || args.trim().length === 0) {
                throw new ChoiceValidationError('Choice arguments cannot be empty', 'EMPTY_INPUT');
            }

            // 選択肢を解析
            const options = this.parseChoiceOptions(args);

            // 選択肢数チェック
            if (options.length === 0) {
                throw new ChoiceValidationError('No valid options found', 'INVALID_FORMAT');
            }

            if (options.length > ChoiceValidator.MAX_OPTIONS) {
                throw new ChoiceValidationError(
                    `Too many options (max: ${ChoiceValidator.MAX_OPTIONS})`, 
                    'TOO_MANY_OPTIONS'
                );
            }

            // 各選択肢の長さチェックとサニタイズ
            const sanitizedOptions: string[] = [];
            for (const option of options) {
                if (option.length > ChoiceValidator.MAX_OPTION_LENGTH) {
                    throw new ChoiceValidationError(
                        `Option too long (max: ${ChoiceValidator.MAX_OPTION_LENGTH} characters)`, 
                        'INVALID_CHARACTERS'
                    );
                }
                
                // サニタイズを実行
                const sanitized = this.sanitizeOption(option);
                
                // サニタイズ後に空文字になった場合はエラー
                if (sanitized.length === 0) {
                    throw new ChoiceValidationError(
                        'Option contained only invalid characters', 
                        'INVALID_CHARACTERS'
                    );
                }
                
                sanitizedOptions.push(sanitized);
            }

            return {
                isValid: true,
                options: sanitizedOptions
            };

        } catch (error) {
            return {
                isValid: false,
                options: [],
                error: error instanceof ChoiceValidationError ? error : 
                       new ChoiceValidationError('Unknown validation error', 'INVALID_FORMAT')
            };
        }
    }

    /**
     * Choice引数から選択肢を解析
     * @param args 引数文字列
     * @returns 選択肢配列
     */
    private parseChoiceOptions(args: string): string[] {
        // 複数の区切り文字をサポート
        const separators = [',', '、', ' ', '　', '|'];
        let options: string[] = [args]; // 初期状態

        // 各区切り文字で分割を試行
        for (const separator of separators) {
            if (args.includes(separator)) {
                options = args.split(separator);
                break;
            }
        }

        // []記法のサポート: choice[a,b,c]
        const bracketMatch = args.match(/(?:choice)?\[([^\]]+)\]/i);
        if (bracketMatch) {
            options = bracketMatch[1].split(',');
        }

        // ()記法のサポート: choice(a,b,c)
        const parenMatch = args.match(/(?:choice)?\(([^)]+)\)/i);
        if (parenMatch) {
            options = parenMatch[1].split(',');
        }

        // 各選択肢をトリムして空文字を除去
        return options
            .map(option => option.trim())
            .filter(option => option.length > 0);
    }

    /**
     * 選択肢から危険な文字を除去（正規表現非依存でLintエラー回避）
     * @param option 選択肢文字列
     * @returns サニタイズされた選択肢
     */
    private sanitizeOption(option: string): string {
        // 制御文字（< 0x20 または 0x7F）を除去（正規表現非依存）
        let sanitized = '';
        for (const ch of option) {
            const codePoint = ch.codePointAt(0)!;
            // 印字可能文字のみを許可（0x20-0x7E, および一般的なUnicode文字）
            if (codePoint >= 0x20 && codePoint !== 0x7F) {
                sanitized += ch;
            }
        }
        
        // XSS対策（最低限）
        sanitized = sanitized.replace(/[<>]/g, '');
        
        return sanitized.trim();
    }
}