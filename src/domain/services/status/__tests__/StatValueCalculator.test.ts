import { StatValueCalculator } from '../StatValueCalculator';
import { IValidationStateService } from '../IValidationStateService';

const extractDiceValues = (details: string): number[] => {
    const match = details.match(/^\((\d(?:,\d)*)\)(?:\+\d+)?$/);
    if (!match) {
        throw new Error(`Invalid details format: ${details}`);
    }

    return match[1].split(',').map(Number);
};

const createValidationService = (value: number | undefined): jest.Mocked<IValidationStateService> => ({
    getTemporaryValue: jest.fn((_: string) => value),
    clearValidation: jest.fn((_: string) => undefined),
});

describe('StatValueCalculator', () => {
    describe('isValueInValidRange', () => {
        test('6版: STRの範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('STR', '6', 15)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('STR', '6', 20)).toBe(false);
            expect(StatValueCalculator.isValueInValidRange('STR', '6', 2)).toBe(false);
        });

        test('6版: EDUの範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('EDU', '6', 6)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('EDU', '6', 21)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('EDU', '6', 22)).toBe(false);
        });

        test('6版: statsに無いLUCはfalseを返す', () => {
            expect(StatValueCalculator.isValueInValidRange('LUC', '6', 75)).toBe(false);
        });

        test('7版: STRの5倍値と範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('STR', '7', 75)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('STR', '7', 15)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('STR', '7', 90)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('STR', '7', 73)).toBe(false);
            expect(StatValueCalculator.isValueInValidRange('STR', '7', 100)).toBe(false);
        });

        test('7版: LUCの範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('LUC', '7', 75)).toBe(true);
        });

        test('7版: EDUの5倍値と範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('EDU', '7', 40)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('EDU', '7', 90)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('EDU', '7', 35)).toBe(false);
            expect(StatValueCalculator.isValueInValidRange('EDU', '7', 105)).toBe(false);
        });

        test('7版: SIZの5倍値と範囲を検証する', () => {
            expect(StatValueCalculator.isValueInValidRange('SIZ', '7', 40)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('SIZ', '7', 90)).toBe(true);
            expect(StatValueCalculator.isValueInValidRange('SIZ', '7', 35)).toBe(false);
        });
    });

    describe('generateOptimalDetails', () => {
        test('7版 STR 75の詳細を生成する', () => {
            const details = StatValueCalculator.generateOptimalDetails('STR', 75, '7');
            const diceValues = extractDiceValues(details);

            expect(details).toMatch(/^\(\d,\d,\d\)$/);
            expect(diceValues.reduce((sum, value) => sum + value, 0)).toBe(15);
        });

        test('7版 EDU 90の詳細を生成する', () => {
            const details = StatValueCalculator.generateOptimalDetails('EDU', 90, '7');
            const diceValues = extractDiceValues(details);

            expect(details).toMatch(/^\(\d,\d\)\+6$/);
            expect(diceValues.reduce((sum, value) => sum + value, 0)).toBe(12);
        });

        test('6版 SIZ 18の詳細を生成する', () => {
            const details = StatValueCalculator.generateOptimalDetails('SIZ', 18, '6');
            const diceValues = extractDiceValues(details);

            expect(details).toMatch(/^\(\d,\d\)\+6$/);
            expect(diceValues.reduce((sum, value) => sum + value, 0)).toBe(12);
        });
    });

    describe('calculateOptimalValue', () => {
        test('7版STRで有効な一時値をそのまま返す', () => {
            const validationService = createValidationService(75);

            const result = StatValueCalculator.calculateOptimalValue(
                'STR',
                '7',
                'test-message-id',
                validationService
            );

            expect(result).toBe(75);
            expect(validationService.clearValidation).not.toHaveBeenCalled();
        });

        test('7版STRで範囲外の一時値なら-1を返して検証状態をクリアする', () => {
            const validationService = createValidationService(73);

            const result = StatValueCalculator.calculateOptimalValue(
                'STR',
                '7',
                'test-message-id',
                validationService
            );

            expect(result).toBe(-1);
            expect(validationService.clearValidation).toHaveBeenCalledWith('test-message-id');
        });
    });
});
