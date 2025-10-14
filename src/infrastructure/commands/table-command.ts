import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandSubcommandBuilder,
    SlashCommandStringOption,
    SlashCommandIntegerOption,
    SlashCommandUserOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { TableCommandHandler } from './handlers/TableCommandHandler';

/**
 * テーブル管理統合コマンド
 * CoCシナリオのカテゴリ・ロール・チャンネル管理を統合
 * 
 * サブコマンド:
 * - setup: カテゴリ作成 (旧 category-create)
 * - handout: ハンドアウト割り当て (旧 handout-assign)  
 * - add: 第n陣作成 (旧 party-create)
 * - delete: カテゴリ完全削除 (旧 category-delete)
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('table')
        .setDescription('テーブル管理（CoCシナリオ用カテゴリ・ロール・チャンネル統合管理）')
        
        // setup サブコマンド（カテゴリ作成）
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand
                .setName('setup')
                .setDescription('カテゴリ・ロール・チャンネルをセットアップ')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('name')
                        .setDescription('カテゴリ名')
                        .setRequired(true)
                )
                .addIntegerOption((option: SlashCommandIntegerOption) =>
                    option.setName('handout')
                        .setDescription('ハンドアウトチャンネルの数 (0-10)')
                        .setMinValue(0)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        
        // handout サブコマンド（ハンドアウト割り当て）
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand
                .setName('handout')
                .setDescription('ユーザーにハンドアウトを割り当て')
                .addUserOption((option: SlashCommandUserOption) =>
                    option.setName('user')
                        .setDescription('割り当て対象のユーザー')
                        .setRequired(true)
                )
                .addIntegerOption((option: SlashCommandIntegerOption) =>
                    option.setName('number')
                        .setDescription('ハンドアウト番号 (1-10)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(true)
                )
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('display_name')
                        .setDescription('専用チャンネルの表示名（省略時はサーバープロフィール名）')
                        .setMaxLength(32)
                        .setRequired(false)
                )
        )
        
        // add サブコマンド（第n陣作成）
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand
                .setName('add')
                .setDescription('新しい陣営（第n陣）を作成')
                .addIntegerOption((option: SlashCommandIntegerOption) =>
                    option.setName('party_number')
                        .setDescription('陣営番号 (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)
                )
        )
        
        // delete サブコマンド（カテゴリ削除）
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand
                .setName('delete')
                .setDescription('現在のカテゴリを完全削除（チャンネル・ロール含む）')
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // TableCommandHandlerに処理を委譲（統一パターン）
        const handler = new TableCommandHandler();
        await handler.handle(interaction);
    }
};