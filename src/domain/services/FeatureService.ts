import fs from 'fs';
import path from 'path';
import { rollDice } from '../utils/dice';
import { 
    FeatureTable, 
    FeatureGenerationRequest, 
    FeatureGenerationResult, 
    GeneratedFeature,
    FeatureGenerationError 
} from '../../application/dto/FeatureDto';
import { configurationStore } from '../../infrastructure/services/ConfigurationStore';

/**
 * 特徴生成のドメインサービス
 * 型安全な特徴表データ管理とランダム生成機能を提供
 */
export class FeatureService {
    private static featureTable: FeatureTable | null = null;

    /**
     * 特徴表データを型安全に読み込み
     * @returns 特徴表データ
     */
    private static loadFeatureTable(): FeatureTable {
        if (this.featureTable) {
            return this.featureTable;
        }

        try {
            const dataPath = path.join(process.cwd(), 'src', 'data', 'features.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            const parsedData = JSON.parse(rawData);

            // 型安全性の検証
            if (!Array.isArray(parsedData)) {
                throw new FeatureGenerationError('Invalid feature data format', 'DATA_LOAD_ERROR');
            }

            // 各行が配列で、各要素がname, detailプロパティを持つことを確認
            for (let i = 0; i < parsedData.length; i++) {
                const row = parsedData[i];
                if (!Array.isArray(row) || row.length !== 10) {
                    throw new FeatureGenerationError(`Invalid row ${i} format`, 'DATA_LOAD_ERROR');
                }

                for (let j = 0; j < row.length; j++) {
                    const feature = row[j];
                    if (!feature || typeof feature.name !== 'string' || typeof feature.detail !== 'string') {
                        throw new FeatureGenerationError(`Invalid feature at [${i}][${j}]`, 'DATA_LOAD_ERROR');
                    }
                }
            }

            this.featureTable = parsedData as FeatureTable;
            return this.featureTable;

        } catch (error) {
            throw new FeatureGenerationError(
                `Failed to load feature data: ${error instanceof Error ? error.message : String(error)}`, 
                'DATA_LOAD_ERROR'
            );
        }
    }

    /**
     * 特徴をランダム生成
     * @param request 生成リクエスト
     * @returns 生成結果
     */
    static generateFeatures(request: FeatureGenerationRequest): FeatureGenerationResult {
        if (request.count < 1 || request.count > 3) {
            throw new FeatureGenerationError('Feature count must be between 1 and 3', 'INVALID_COUNT');
        }

        const featureTable = this.loadFeatureTable();
        const features: GeneratedFeature[] = [];
        
        // ユーザー設定を確認
        const predefinedValues = configurationStore.getUserConfiguration(request.userId, 'feature');
        let usedPredefinedValues = false;

        for (let i = 0; i < request.count; i++) {
            let diceIndex: number;
            let detailNumber: number;
            let isPredefined = false;

            if (predefinedValues && i < predefinedValues.length) {
                // 事前設定された値を使用
                const value = predefinedValues[i];
                // 期待値: 11〜66（1基準） -> 0基準へ変換
                diceIndex = Math.floor(value / 10) - 1;
                detailNumber = (value % 10) - 1;
                isPredefined = true;
                usedPredefinedValues = true;
            } else {
                // 通常のランダム処理（型安全）
                diceIndex = rollDice(1, 6)[0] - 1; // 0-5
                detailNumber = rollDice(1, 10)[0] - 1; // 0-9
            }

            // 範囲チェック
            if (diceIndex < 0 || diceIndex >= 6 || detailNumber < 0 || detailNumber >= 10) {
                throw new FeatureGenerationError(
                    `Invalid dice result: [${diceIndex}][${detailNumber}]`, 
                    'GENERATION_ERROR'
                );
            }

            const feature = featureTable[diceIndex][detailNumber];
            
            features.push({
                diceIndex: diceIndex + 1, // 1-6 に変換
                detailNumber: detailNumber + 1, // 1-10 に変換
                feature,
                isPredefined
            });
        }

        // 使用後は設定をクリア
        if (usedPredefinedValues) {
            configurationStore.clearUserConfiguration(request.userId, 'feature');
        }

        return {
            features,
            usedPredefinedValues
        };
    }

    /**
     * テスト用のキャッシュクリア
     */
    static clearCache(): void {
        this.featureTable = null;
    }
}