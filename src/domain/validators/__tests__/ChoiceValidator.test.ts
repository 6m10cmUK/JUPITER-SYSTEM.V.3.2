import { ChoiceValidator, ChoiceValidationError } from '../ChoiceValidator';

describe('ChoiceValidator', () => {
    let validator: ChoiceValidator;

    beforeEach(() => {
        validator = new ChoiceValidator();
    });

    describe('正常ケース', () => {
        test('カンマ区切りの選択肢が正しく解析される', () => {
            const result = validator.validate('りんご,みかん,バナナ');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['りんご', 'みかん', 'バナナ']);
            expect(result.error).toBeUndefined();
        });

        test('日本語区切り文字（、）が正しく解析される', () => {
            const result = validator.validate('選択肢A、選択肢B、選択肢C');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['選択肢A', '選択肢B', '選択肢C']);
        });

        test('スペース区切りが正しく解析される', () => {
            const result = validator.validate('option1 option2 option3');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['option1', 'option2', 'option3']);
        });

        test('[]記法が正しく解析される', () => {
            const result = validator.validate('choice[a,b,c]');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['a', 'b', 'c']);
        });

        test('()記法が正しく解析される', () => {
            const result = validator.validate('choice(x,y,z)');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['x', 'y', 'z']);
        });

        test('前後の空白が正しく除去される', () => {
            const result = validator.validate('  選択肢1  ,  選択肢2  ,  選択肢3  ');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['選択肢1', '選択肢2', '選択肢3']);
        });

        test('全角スペース区切りが正しく解析される', () => {
            const result = validator.validate('選択肢A　選択肢B　選択肢C');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['選択肢A', '選択肢B', '選択肢C']);
        });

        test('パイプ区切りが正しく解析される', () => {
            const result = validator.validate('オプション1|オプション2|オプション3');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['オプション1', 'オプション2', 'オプション3']);
        });

        test('choice接頭辞なしの[]記法が解析される', () => {
            const result = validator.validate('[red,green,blue]');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['red', 'green', 'blue']);
        });

        test('choice接頭辞なしの()記法が解析される', () => {
            const result = validator.validate('(alpha,beta,gamma)');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['alpha', 'beta', 'gamma']);
        });
    });

    describe('サニタイゼーション', () => {
        test('XSS対策: <>文字が除去される', () => {
            const result = validator.validate('安全,良い選択肢,<script>test</script>');

            expect(result.isValid).toBe(true);
            expect(result.options).toHaveLength(3);
            // サニタイズされたことを確認
            const sanitizedScript = result.options.find(opt => opt.includes('script'));
            if (sanitizedScript) {
                expect(sanitizedScript).not.toContain('<');
                expect(sanitizedScript).not.toContain('>');
            }
        });

        test('制御文字が除去される', () => {
            const result = validator.validate('選択肢1\x00\x1F,選択肢2\x7F,選択肢3');

            expect(result.isValid).toBe(true);
            expect(result.options).toEqual(['選択肢1', '選択肢2', '選択肢3']);
        });

        test('サニタイズ後に空文字になる選択肢はエラー', () => {
            const result = validator.validate('正常な選択肢,<>,有効な選択肢');

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('INVALID_CHARACTERS');
        });

        test('サニタイズ後に空文字になる選択肢（制御文字のみ）はエラー', () => {
            const result = validator.validate('正常,\x00\x1F\x7F,有効');

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('INVALID_CHARACTERS');
        });
    });

    describe('異常ケース', () => {
        test('空文字列入力でエラー', () => {
            const result = validator.validate('');

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('EMPTY_INPUT');
        });

        test('空白のみの入力でエラー', () => {
            const result = validator.validate('   ');

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('EMPTY_INPUT');
        });

        test('選択肢が多すぎる場合エラー', () => {
            const tooManyOptions = Array(25).fill('選択肢').join(',');
            const result = validator.validate(tooManyOptions);

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('TOO_MANY_OPTIONS');
        });

        test('選択肢が長すぎる場合エラー', () => {
            const tooLongOption = 'a'.repeat(101);
            const result = validator.validate(`正常な選択肢,${tooLongOption},別の選択肢`);

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('INVALID_CHARACTERS');
        });

        test('全ての選択肢が空になる場合エラー', () => {
            const result = validator.validate(',,,,');

            expect(result.isValid).toBe(false);
            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.code).toBe('INVALID_FORMAT');
        });
    });

    describe('境界値テスト', () => {
        test('選択肢数が上限ギリギリ（20個）で成功', () => {
            const exactlyTwentyOptions = Array(20).fill('選択肢').map((_, i) => `選択肢${i + 1}`).join(',');
            const result = validator.validate(exactlyTwentyOptions);

            expect(result.isValid).toBe(true);
            expect(result.options).toHaveLength(20);
        });

        test('選択肢長が上限ギリギリ（100文字）で成功', () => {
            const exactlyHundredChars = 'a'.repeat(100);
            const result = validator.validate(`正常,${exactlyHundredChars},正常`);

            expect(result.isValid).toBe(true);
            expect(result.options).toHaveLength(3);
            expect(result.options[1]).toHaveLength(100);
        });
    });

    describe('エラーオブジェクトの検証', () => {
        test('ChoiceValidationError が適切なプロパティを持つ', () => {
            const result = validator.validate('');

            expect(result.error).toBeInstanceOf(ChoiceValidationError);
            expect(result.error?.name).toBe('ChoiceValidationError');
            expect(result.error?.code).toBe('EMPTY_INPUT');
            expect(result.error?.message).toContain('cannot be empty');
        });

        test('不明なエラーでも適切に処理される', () => {
            const originalParseOptions = (validator as any).parseChoiceOptions;
            try {
                // parseChoiceOptionsをモックして例外を発生させる
                (validator as any).parseChoiceOptions = jest.fn(() => {
                    throw new Error('Unknown error');
                });

                const result = validator.validate('test');

                expect(result.isValid).toBe(false);
                expect(result.error).toBeInstanceOf(ChoiceValidationError);
                expect(result.error?.code).toBe('INVALID_FORMAT');
            } finally {
                // 確実にモックを復元
                (validator as any).parseChoiceOptions = originalParseOptions;
            }
        });
    });
});