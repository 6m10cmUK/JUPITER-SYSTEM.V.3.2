import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption, 
    SlashCommandSubcommandBuilder, 
    SlashCommandIntegerOption 
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { NinpoEmbedFormatter } from '../../presentation/formatters/NinpoEmbedFormatter';
import { NinpoSearchCriteria } from '../../application/dto/NinpoDto';
import fs from 'fs';
import path from 'path';

// 忍法データディレクトリから動的にカテゴリーを取得
function getNinpoCategories(): { name: string; value: string }[] {
    const ninpoDir = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo');
    const categories: { name: string; value: string }[] = [];
    
    try {
        const files = fs.readdirSync(ninpoDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const value = file.replace('.json', '');
                const filePath = path.join(ninpoDir, file);
                try {
                    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const name = fileData.name || value; // JSONからnameを取得
                    categories.push({ name, value });
                } catch (parseError) {
                    console.error(`${file}の解析に失敗:`, parseError);
                    categories.push({ name: value, value }); // フォールバック
                }
            }
        });
    } catch (error) {
        console.error('忍法カテゴリーの読み込みに失敗:', error);
        // フォールバック
        return [
            { name: '汎用忍法', value: 'hanyo' },
            { name: '斜歯忍群', value: 'hasuba' },
            { name: '鞍馬神流', value: 'kurama' },
            { name: 'ハグレモノ', value: 'haguremono' },
            { name: '比良坂機関', value: 'hirasaka' },
            { name: '私立御斎学園', value: 'otogi' },
            { name: '隠忍の血統', value: 'oni' }
        ];
    }
    
    return categories;
}

const ninpoCategories = getNinpoCategories();

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ninpo')
        .setDescription('シノビガミ忍法検索')
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('name')
                .setDescription('忍法名で検索')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい忍法名（部分一致）')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('type')
                .setDescription('忍法種別で検索（攻撃、サポート等）')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('category')
                        .setDescription('流派カテゴリー')
                        .setRequired(true)
                        .addChoices(...ninpoCategories)
                )
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい種別')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('specialty')
                .setDescription('指定特技で検索')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('category')
                        .setDescription('流派カテゴリー')
                        .setRequired(true)
                        .addChoices(...ninpoCategories)
                )
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい特技名')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('all')
                .setDescription('忍法一覧')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('category')
                        .setDescription('流派カテゴリー')
                        .setRequired(true)
                        .addChoices(...ninpoCategories)
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand() as NinpoSearchCriteria['searchType'];
        await interaction.deferReply();

        const query = interaction.options.getString('query') ?? '';
        const formatter = new NinpoEmbedFormatter();

        // nameサブコマンドの場合はカテゴリを指定しない（全検索）
        let category: NinpoSearchCriteria['category'] | 'all';
        if (subcommand === 'name') {
            category = 'all' as any;
        } else {
            category = interaction.options.getString('category', true) as NinpoSearchCriteria['category'];
        }

        const criteria: NinpoSearchCriteria = {
            query,
            searchType: subcommand,
            category: category as NinpoSearchCriteria['category'],
            page: 1
        };
        const display = await formatter.format(interaction, criteria);
        await interaction.editReply(display);
    }
};