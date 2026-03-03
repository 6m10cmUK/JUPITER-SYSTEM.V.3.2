import { ChatInputCommandInteraction } from 'discord.js';
import { DiceSystemError } from './DiceSystemError';
import { FeatureSystemError } from '../../application/dto/FeatureDto';
import { StatusGenerationError } from '../../application/dto/StatusDto';
import { ValidationError } from '../../shared/interfaces/patterns/CommandPatterns';

/**
 * 統一エラーハンドラー
 * 全コマンドで一貫したエラー処理を提供
 */
export class UnifiedErrorHandler {
    /**
     * 統一されたエラーハンドリング
     * @param interaction Discord インタラクション
     * @param error 発生したエラー
     * @param context エラーコンテキスト
     */
    static async handleCommandError(
        interaction: ChatInputCommandInteraction,
        error: unknown,
        context: {
            commandName: string;
            subcommand?: string;
            input?: Record<string, any>;
        }
    ): Promise<void> {
        // ユーザーフレンドリーなメッセージを生成
        const userMessage = this.generateUserMessage(error, context.commandName);
        
        try {
            // エラーメッセージをユーザーに送信
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: userMessage
                });
            } else {
                await interaction.reply({
                    content: userMessage,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            // Discord API エラー時のフォールバック
            console.error('Failed to send error message:', replyError);
        }

        // 構造化ログを出力（開発・デバッグ用）
        this.logError(error, context, interaction);
    }

    /**
     * エラー種別に応じたユーザーメッセージを生成
     * @param error エラーオブジェクト
     * @param commandName コマンド名
     * @returns ユーザー向けメッセージ
     */
    private static generateUserMessage(error: unknown, commandName: string): string {
        // カスタムエラーの分類
        if (error instanceof ValidationError) {
            return `入力検証エラー: ${error.message}`;
        }

        if (error instanceof DiceSystemError) {
            switch (error.code) {
                case 'INVALID_EXPRESSION':
                    return `無効なダイス式です: ${error.expression}`;
                case 'MATH_EVALUATION_ERROR':
                    return '数式の計算でエラーが発生しました。';
                case 'DICE_SECURITY_ERROR':
                    return '不正な文字が含まれています。';
                default:
                    return `ダイスシステムエラー: ${error.message}`;
            }
        }

        if (error instanceof FeatureSystemError) {
            switch (error.code) {
                case 'DATA_LOAD_ERROR':
                    return '特徴データの読み込みに失敗しました。';
                case 'INVALID_COUNT':
                    return '特徴の数は1〜3個で指定してください。';
                default:
                    return `特徴生成エラー: ${error.message}`;
            }
        }

        if (error instanceof StatusGenerationError) {
            switch (error.code) {
                case 'INVALID_VERSION':
                    return '無効なCoCバージョンです。';
                case 'VALIDATION_FAILED':
                    return 'ステータス検証に失敗しました。';
                default:
                    return `ステータス生成エラー: ${error.message}`;
            }
        }

        // 不明なエラーの場合
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `${commandName}コマンドの処理中にエラーが発生しました。`;
    }

    /**
     * 構造化ログを出力
     * @param error エラーオブジェクト
     * @param context エラーコンテキスト
     * @param interaction Discord インタラクション
     */
    private static logError(
        error: unknown,
        context: {
            commandName: string;
            subcommand?: string;
            input?: Record<string, any>;
        },
        interaction: ChatInputCommandInteraction
    ): void {
        const logData = {
            // エラー情報
            error: {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                code: (error as any)?.code || 'UNKNOWN'
            },
            // コンテキスト情報
            context: {
                command: context.commandName,
                subcommand: context.subcommand,
                input: context.input
            },
            // Discord情報
            discord: {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId,
                channelId: interaction.channelId
            },
            // タイムスタンプ
            timestamp: new Date().toISOString()
        };

        console.error(`Command error [${context.commandName}]:`, logData);
    }

    /**
     * 成功時のログ出力
     * @param interaction Discord インタラクション
     * @param context 成功コンテキスト
     */
    static logSuccess(
        interaction: ChatInputCommandInteraction,
        context: {
            commandName: string;
            subcommand?: string;
            result?: string;
            executionTime?: number;
        }
    ): void {
        const logData = {
            command: context.commandName,
            subcommand: context.subcommand,
            result: context.result,
            executionTime: context.executionTime,
            user: interaction.user.username,
            guild: interaction.guildId
        };

        console.log(`Command success [${context.commandName}]:`, logData);
    }
}