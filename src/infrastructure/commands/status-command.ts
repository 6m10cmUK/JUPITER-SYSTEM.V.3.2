import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { createStatusCommandHandler } from '../factories/CommandHandlerFactory';
import { StatusType, CoCVersion } from '../../application/dto/StatusDto';

/**
 * StatusTypeをCoCVersionに変換する型安全なヘルパー
 * @param type StatusType
 * @returns CoCVersion
 */
function convertStatusTypeToCoCVersion(type: StatusType): CoCVersion {
    switch (type) {
        case 'ver6':
            return '6';
        case 'ver7':
            return '7';
        default:
            // TypeScriptの exhaustiveness check
            const _exhaustiveCheck: never = type;
            throw new Error(`Unknown status type: ${_exhaustiveCheck}`);
    }
}

/**
 * CoC（Call of Cthulhu）TRPG用のキャラクターステータス生成コマンド
 * 6版と7版の両方に対応し、ランダムステータス生成やカスタムセット機能を提供
 */
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('CoCステータス作成コマンド')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('type')
                .setDescription('表示するステータスの種類')
                .setRequired(true)
                .addChoices(
                    { name: '6版', value: 'ver6' },
                    { name: '7版', value: 'ver7' }
                )
        )
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('name')
                .setDescription('キャラクターの名前')
                .setRequired(false)
        )
        .addBooleanOption((option) =>
            option.setName('custom')
                .setDescription('カスタムセットメニューを表示する')
                .setRequired(false)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        // StatusCommandHandlerに処理を委譲（統一パターン）
        const handler = createStatusCommandHandler();
        await handler.handle(interaction);
    }
}; 