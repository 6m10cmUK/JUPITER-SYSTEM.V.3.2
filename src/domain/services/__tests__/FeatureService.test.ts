import { FeatureService } from '../FeatureService';
import { 
    FeatureGenerationRequest, 
    FeatureGenerationError,
    FeatureValidationError 
} from '../../../application/dto/FeatureDto';
import { configurationStore } from '../../../infrastructure/services/ConfigurationStore';
import { rollDice } from '../../utils/dice';
import fs from 'fs';

// モックの設定
jest.mock('fs');
jest.mock('../../../infrastructure/services/ConfigurationStore', () => ({
    configurationStore: {
        getUserConfiguration: jest.fn(),
        clearUserConfiguration: jest.fn(),
    },
}));
jest.mock('../../utils/dice');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockConfigurationStore = configurationStore as jest.Mocked<typeof configurationStore>;
const mockRollDice = rollDice as jest.MockedFunction<typeof rollDice>;

describe('FeatureService', () => {
    beforeEach(() => {
        // 各テスト前にキャッシュをクリア
        FeatureService.clearCache();
        jest.clearAllMocks();
    });

    // 正常なテストデータ
    const validFeatureData = [
        [
            { name: '特徴1-1', detail: '詳細1-1' },
            { name: '特徴1-2', detail: '詳細1-2' },
            // ... 10個
            ...Array(8).fill({ name: 'ダミー', detail: 'ダミー詳細' })
        ],
        // ... 6行
        ...Array(5).fill(Array(10).fill({ name: 'ダミー', detail: 'ダミー詳細' }))
    ];

    describe('generateFeatures', () => {
        beforeEach(() => {
            // 正常なデータファイルをモック
            mockFs.readFileSync.mockReturnValue(JSON.stringify(validFeatureData));
            mockConfigurationStore.getUserConfiguration.mockReturnValue(undefined);
            mockConfigurationStore.clearUserConfiguration.mockReturnValue(undefined);
            // ダイス結果を固定（1-6, 1-10の範囲内）
            mockRollDice.mockReturnValue([3]); // 3が返される → diceIndex=2, detailNumber=2
        });

        test('正常ケース: count=1で特徴が1つ生成される', () => {
            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            const result = FeatureService.generateFeatures(request);

            expect(result.features).toHaveLength(1);
            expect(result.features[0].diceIndex).toBeGreaterThanOrEqual(1);
            expect(result.features[0].diceIndex).toBeLessThanOrEqual(6);
            expect(result.features[0].detailNumber).toBeGreaterThanOrEqual(1);
            expect(result.features[0].detailNumber).toBeLessThanOrEqual(10);
            expect(result.features[0].feature.name).toBeDefined();
            expect(result.features[0].feature.detail).toBeDefined();
            expect(result.features[0].isPredefined).toBe(false);
            expect(result.usedPredefinedValues).toBe(false);
        });

        test('正常ケース: count=3で特徴が3つ生成される', () => {
            const request: FeatureGenerationRequest = {
                count: 3,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            const result = FeatureService.generateFeatures(request);

            expect(result.features).toHaveLength(3);
            result.features.forEach(feature => {
                expect(feature.diceIndex).toBeGreaterThanOrEqual(1);
                expect(feature.diceIndex).toBeLessThanOrEqual(6);
                expect(feature.detailNumber).toBeGreaterThanOrEqual(1);
                expect(feature.detailNumber).toBeLessThanOrEqual(10);
                expect(feature.isPredefined).toBe(false);
            });
        });

        test('事前設定値使用ケース', () => {
            // 事前設定値をモック（11 = 1-1, 65 = 6-5）
            mockConfigurationStore.getUserConfiguration.mockReturnValue([11, 65]);

            const request: FeatureGenerationRequest = {
                count: 2,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            const result = FeatureService.generateFeatures(request);

            expect(result.features).toHaveLength(2);
            expect(result.features[0].diceIndex).toBe(1);
            expect(result.features[0].detailNumber).toBe(1);
            expect(result.features[0].isPredefined).toBe(true);
            expect(result.features[1].diceIndex).toBe(6);
            expect(result.features[1].detailNumber).toBe(5);
            expect(result.features[1].isPredefined).toBe(true);
            expect(result.usedPredefinedValues).toBe(true);

            // 使用後のクリアが呼ばれることを確認
            expect(mockConfigurationStore.clearUserConfiguration).toHaveBeenCalledWith('test-user-123', 'feature');
        });

        test('事前設定値の混在ケース（不足分をランダム補完）', () => {
            // 1個の事前設定値で3個要求（混在ケース）
            mockConfigurationStore.getUserConfiguration.mockReturnValue([33]); // 3-3のみ

            const request: FeatureGenerationRequest = {
                count: 3,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            const result = FeatureService.generateFeatures(request);

            expect(result.features).toHaveLength(3);
            
            // 1つ目は事前設定値
            expect(result.features[0].diceIndex).toBe(3);
            expect(result.features[0].detailNumber).toBe(3);
            expect(result.features[0].isPredefined).toBe(true);
            
            // 2つ目以降はランダム（事前設定値なし）
            expect(result.features[1].isPredefined).toBe(false);
            expect(result.features[2].isPredefined).toBe(false);
            
            // 事前設定値が一部でも使用されたフラグが立つ
            expect(result.usedPredefinedValues).toBe(true);
            
            // 使用後のクリアが呼ばれる
            expect(mockConfigurationStore.clearUserConfiguration).toHaveBeenCalledWith('test-user-123', 'feature');
        });

        test('異常ケース: count=0でエラー', () => {
            const request: FeatureGenerationRequest = {
                count: 0,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: count=4でエラー', () => {
            const request: FeatureGenerationRequest = {
                count: 4,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: 不正な事前設定値でエラー', () => {
            // 範囲外の事前設定値（70 = 7-0, 範囲外）
            mockConfigurationStore.getUserConfiguration.mockReturnValue([70]);

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });
    });

    describe('データ読み込み', () => {
        test('異常ケース: ファイル読み込み失敗', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: 不正なJSON形式', () => {
            mockFs.readFileSync.mockReturnValue('invalid json');

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: 配列でないデータ', () => {
            mockFs.readFileSync.mockReturnValue('{"invalid": "data"}');

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: 不正な行形式', () => {
            const invalidData = [
                // 10個ない行
                [{ name: '特徴1', detail: '詳細1' }],
                ...Array(5).fill(Array(10).fill({ name: 'ダミー', detail: 'ダミー詳細' }))
            ];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidData));

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });

        test('異常ケース: 不正な特徴オブジェクト', () => {
            const invalidData = [
                [
                    { name: '特徴1', detail: '詳細1' },
                    { invalidProperty: 'invalid' }, // name, detailがない
                    ...Array(8).fill({ name: 'ダミー', detail: 'ダミー詳細' })
                ],
                ...Array(5).fill(Array(10).fill({ name: 'ダミー', detail: 'ダミー詳細' }))
            ];
            mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidData));

            const request: FeatureGenerationRequest = {
                count: 1,
                userId: 'test-user-123',
                guildId: 'test-guild-456'
            };

            expect(() => {
                FeatureService.generateFeatures(request);
            }).toThrow(FeatureGenerationError);
        });
    });

    describe('キャッシュ機能', () => {
        test('clearCacheメソッドが存在する', () => {
            expect(typeof FeatureService.clearCache).toBe('function');
            // 実行してもエラーにならない
            expect(() => FeatureService.clearCache()).not.toThrow();
        });
    });
});