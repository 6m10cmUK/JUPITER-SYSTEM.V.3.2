import { ChatInputCommandInteraction } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';
import { FeatureService } from '../../../domain/services/FeatureService';
import { 
    FeatureGenerationRequest, 
    FeatureGenerationError 
} from '../../../application/dto/FeatureDto';
import { logResult } from '../../../shared/utils/UsageLogger';

const RESULT_DETAIL_LIMIT = 300;

/**
 * 特徴生成コマンドハンドラー（型安全性強化版）
 * any型を排除し、適切なエラーハンドリングを実装
 */
export class FeatureCommandHandler {
    /**
     * 特徴生成処理を実行（統一ハンドラーパターン）
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const rawCount = interaction.options.getInteger('count') ?? 1;
        const count = Math.min(Math.max(rawCount, 1), 3); // 1〜3に制限（ドメイン制約に一致）

        try {
            // 型安全な特徴生成リクエスト
            const request: FeatureGenerationRequest = {
                count,
                userId: interaction.user.id,
                guildId: interaction.guildId ?? undefined
            };

            // ドメインサービスに処理を委譲
            const result = FeatureService.generateFeatures(request);

            // 結果をEmbedに変換
            const embed = generateEmbed(interaction)
                .setTitle('ランダム特徴表')
                .setColor(0x888888);

            // 生成された特徴を追加
            for (const generatedFeature of result.features) {
                const { diceIndex, detailNumber, feature, isPredefined } = generatedFeature;
                const prefix = isPredefined ? '🎯 ' : '';
                
                embed.addFields({
                    name: `${prefix}${diceIndex}-${detailNumber} ${feature.name}`,
                    value: feature.detail
                });
            }

            // 事前設定値使用の場合は注記
            if (result.usedPredefinedValues) {
                embed.setFooter({ text: '🎯 事前設定値が使用されました' });
            }

            await interaction.reply({ embeds: [embed] });
            logResult(
                interaction,
                truncateResultDetail(
                    `status=success count=${result.features.length} predefined=${result.usedPredefinedValues} features=${result.features
                        .map(generatedFeature => `${generatedFeature.diceIndex}-${generatedFeature.detailNumber}:${generatedFeature.feature.name}`)
                        .join(',')}`
                )
            );

        } catch (error) {
            // ユーザーフレンドリーなエラーメッセージ
            let userMessage = '特徴生成の処理中にエラーが発生しました。';
            
            if (error instanceof FeatureGenerationError) {
                switch (error.code) {
                    case 'DATA_LOAD_ERROR':
                        userMessage = '特徴データの読み込みに失敗しました。';
                        break;
                    case 'INVALID_COUNT':
                        userMessage = '特徴の数は1〜3個で指定してください。';
                        break;
                    case 'GENERATION_ERROR':
                        userMessage = '特徴の生成中にエラーが発生しました。';
                        break;
                }
            }

            await interaction.reply({
                content: userMessage,
                ephemeral: true
            });

            // 詳細ログ
            console.error('Feature generation error:', {
                error: error instanceof Error ? error.message : String(error),
                count,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }
}

function truncateResultDetail(detail: string): string {
    if (detail.length <= RESULT_DETAIL_LIMIT) {
        return detail;
    }

    return `${detail.slice(0, RESULT_DETAIL_LIMIT - 3)}...`;
}
