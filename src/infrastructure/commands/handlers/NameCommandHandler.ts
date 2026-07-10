import { ChatInputCommandInteraction } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';
import { rollDice } from '../../../domain/utils/dice';
import { getDataDir } from '../../../shared/utils/dataPath';
import { logResult } from '../../../shared/utils/UsageLogger';
import fs from 'fs';
import path from 'path';

const RESULT_DETAIL_LIMIT = 300;

type NameGender = 'male' | 'female';
type NameRegion = 'jp' | 'en';

interface NameData {
    mei?: Partial<Record<NameGender, string[]>>;
    sei?: string[];
    given_en?: Partial<Record<NameGender, string[]>>;
    surname_en?: string[];
}

interface GeneratedName {
    first: string;
    last: string;
    full: string;
}

/**
 * 名前生成コマンドハンドラー（統一アーキテクチャ）
 */
export class NameCommandHandler {
    /**
     * 名前生成処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const typeInput = interaction.options.getString('type') as NameGender | null;
        const type: NameGender = typeInput ?? 'male';
        const regionInput = interaction.options.getString('region') as NameRegion | null;
        const region: NameRegion = regionInput ?? 'jp';
        const rawCount = interaction.options.getInteger('count') ?? 1;
        const count = Math.min(Math.max(rawCount, 1), 10); // 1〜10に制限

        try {
            // 並列処理：データ読み込みと検証を同時実行
            const [nameData] = await Promise.all([
                this.loadNameData(),
                interaction.deferReply()
            ]);

            const names = this.generateNames(nameData, type, region, count);
            
            const embed = generateEmbed(interaction)
                .setTitle(`ランダム名前生成 (${type === 'male' ? '男性' : '女性'}・${region})`)
                .setColor(0x888888);

            // 生成された名前を表示
            names.forEach((name, index) => {
                embed.addFields({
                    name: `${index + 1}. ${name.full}`,
                    value: `\u200b`,
                    inline: false
                });
            });

            await interaction.editReply({ embeds: [embed] });
            logResult(interaction, truncateResultDetail(formatNameResultDetail(type, region, names)));

        } catch (error) {
            await interaction.editReply({
                content: '名前生成の処理中にエラーが発生しました。'
            });

            console.error('Name generation error:', {
                error: error instanceof Error ? error.message : String(error),
                type,
                region,
                count,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        }
    }

    /**
     * 名前データを型安全に読み込み
     */
    private async loadNameData(): Promise<NameData> {
        const dataPath = path.join(getDataDir(), 'names.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(rawData) as NameData;
    }

    /**
     * 名前を生成
     */
    private generateNames(nameData: NameData, type: NameGender, region: NameRegion, count: number): GeneratedName[] {
        const names: GeneratedName[] = [];
        
        for (let i = 0; i < count; i++) {
            let firstName: string;
            let lastName: string;
            
            if (region === 'en') {
                // 英語名の場合
                const firstNames = nameData.given_en?.[type] || ['John', 'Jane'];
                const lastNames = nameData.surname_en || ['Smith', 'Johnson'];
                
                firstName = firstNames[rollDice(1, firstNames.length)[0] - 1];
                lastName = lastNames[rollDice(1, lastNames.length)[0] - 1];
            } else {
                // 日本語名の場合（デフォルト）
                const firstNames = nameData.mei?.[type] || ['太郎', '花子'];
                const lastNames = nameData.sei || ['田中', '佐藤'];
                
                firstName = firstNames[rollDice(1, firstNames.length)[0] - 1];
                lastName = lastNames[rollDice(1, lastNames.length)[0] - 1];
            }
            
            names.push({
                first: firstName,
                last: lastName,
                full: region === 'en' ? `${firstName} ${lastName}` : `${lastName} ${firstName}`
            });
        }
        
        return names;
    }
}

function formatNameResultDetail(type: NameGender, region: NameRegion, names: GeneratedName[]): string {
    const representative = names[0]?.full ?? 'なし';
    return `status=success type=${type} region=${region} count=${names.length} representative=${representative}`;
}

function truncateResultDetail(detail: string): string {
    if (detail.length <= RESULT_DETAIL_LIMIT) {
        return detail;
    }

    return `${detail.slice(0, RESULT_DETAIL_LIMIT - 3)}...`;
}
