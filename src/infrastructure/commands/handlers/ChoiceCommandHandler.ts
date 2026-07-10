import { ChatInputCommandInteraction } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';
import { ChoiceValidator, ChoiceValidationError } from '../../../domain/validators/ChoiceValidator';
import { rollDice } from '../../../domain/utils/dice';
import { logResult } from '../../../shared/utils/UsageLogger';

/**
 * Choice選択結果の型定義
 */
export interface ChoiceResult {
    /** 選択された項目 */
    selectedOption: string;
    /** 選択肢の総数 */
    totalOptions: number;
    /** 選択されたインデックス */
    selectedIndex: number;
    /** 元の入力文字列 */
    originalInput: string;
}

/**
 * Choiceコマンドハンドラー（型安全性強化版）
 * legacy関数を排除し、適切な型定義とバリデーションを実装
 */
export class ChoiceCommandHandler {
    private readonly validator: ChoiceValidator;

    constructor() {
        this.validator = new ChoiceValidator();
    }

    /**
     * Choice選択処理を実行（統一ハンドラーパターン）
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const args = interaction.options.getString('args') ?? '';

        try {
            // 入力検証
            const validationResult = this.validator.validate(args);
            if (!validationResult.isValid) {
                throw validationResult.error || new ChoiceValidationError('Validation failed', 'INVALID_FORMAT');
            }

            // Choice選択を実行
            const choiceResult = this.executeChoice(validationResult.options, args);

            // 結果をEmbedで表示
            const embed = generateEmbed(interaction)
                .setColor(0x888888)
                .addFields({
                    name: `choice(${args})`,
                    value: `**${choiceResult.selectedOption}**`
                });

            await interaction.reply({ embeds: [embed] });

            logResult(
                interaction,
                `status=success input=${choiceResult.originalInput} selected=${choiceResult.selectedOption} index=${choiceResult.selectedIndex + 1}/${choiceResult.totalOptions}`
            );

        } catch (error) {
            // ユーザーフレンドリーなエラーメッセージ
            let userMessage = '選択肢の処理中にエラーが発生しました。';

            if (error instanceof ChoiceValidationError) {
                switch (error.code) {
                    case 'EMPTY_INPUT':
                        userMessage = '選択肢を入力してください。例: `りんご,みかん,バナナ`';
                        break;
                    case 'INVALID_FORMAT':
                        userMessage = '選択肢の形式が正しくありません。カンマで区切って入力してください。';
                        break;
                    case 'TOO_MANY_OPTIONS':
                        userMessage = '選択肢が多すぎます。20個以下で入力してください。';
                        break;
                    case 'INVALID_CHARACTERS':
                        userMessage = '選択肢に無効な文字が含まれています。';
                        break;
                }
            }

            await interaction.reply({
                content: userMessage,
                ephemeral: true
            });

            // 詳細ログ
            console.error('Choice command error:', {
                error: error instanceof Error ? error.message : String(error),
                args,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }

    /**
     * 選択肢からランダムに1つを選択
     * @param options 選択肢配列
     * @param originalInput 元の入力文字列
     * @returns 選択結果
     */
    private executeChoice(options: string[], originalInput: string): ChoiceResult {
        if (options.length === 0) {
            throw new ChoiceValidationError('No options provided', 'EMPTY_INPUT');
        }

        // ランダム選択（型安全）
        const randomIndex = rollDice(1, options.length)[0] - 1; // 0-based index
        const selectedOption = options[randomIndex];

        return {
            selectedOption,
            totalOptions: options.length,
            selectedIndex: randomIndex,
            originalInput
        };
    }
}
