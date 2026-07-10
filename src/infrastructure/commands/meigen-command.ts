import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { createMeigenCommandHandler } from '../factories/CommandHandlerFactory';

/**
 * 名言管理コマンド
 * 名言の登録・表示・削除を統合管理
 *
 * サブコマンド:
 * - add: 名言登録
 * - random: ランダム表示
 * - list: 一覧表示
 * - delete: 削除
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('meigen')
        .setDescription('名言を管理・表示する')

        // add サブコマンド（名言登録）
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add')
                .setDescription('新しい名言を登録')
                .addStringOption((option) =>
                    option.setName('content')
                        .setDescription('名言の内容')
                        .setRequired(true)
                        .setMaxLength(500)
                )
                .addUserOption((option) =>
                    option.setName('author').setDescription('発言者（Discordユーザー）').setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('author_name')
                        .setDescription('発言者名（テキスト。Discord外の人用）')
                        .setRequired(false)
                )
        )

        // random サブコマンド（ランダム表示）
        .addSubcommand((subcommand) =>
            subcommand.setName('random').setDescription('登録された名言からランダムに表示')
        )

        // list サブコマンド（一覧表示）
        .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription('登録されている名言の一覧を表示')
        )

        // delete サブコマンド（削除）
        .addSubcommand((subcommand) =>
            subcommand
                .setName('delete')
                .setDescription('名言を削除')
                .addIntegerOption((option) =>
                    option.setName('id').setDescription('名言ID').setRequired(true)
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // MeigenCommandHandlerに処理を委譲（統一パターン）
        const handler = createMeigenCommandHandler();
        await handler.handle(interaction);
    },
};
