import { ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';
import { createErrorMessage } from '../../presentation/discord/builders/messages';

/**
 * インタラクションの実行者が対象ユーザーと一致するか検証し、
 * 一致しない場合はエラーメッセージを返す。
 * @returns true: 権限あり（処理続行可）、false: 権限なし（エラー返信済み）
 */
export async function checkOwnerPermission(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    userId: string,
    errorTitle: string
): Promise<boolean> {
    if (interaction.user.id !== userId) {
        await interaction.reply(
            createErrorMessage(interaction, errorTitle, 'このコマンドは自分のキャラクターでのみ使用できます。')
        );
        return false;
    }
    return true;
}
