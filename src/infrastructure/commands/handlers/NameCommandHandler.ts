import { ChatInputCommandInteraction } from 'discord.js';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';
import { rollDice } from '../../../domain/utils/dice';
import fs from 'fs';
import path from 'path';

/**
 * 名前生成コマンドハンドラー（統一アーキテクチャ）
 */
export class NameCommandHandler {
    /**
     * 名前生成処理を実行
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const typeInput = interaction.options.getString('type') as 'male' | 'female' | null;
        const type: 'male' | 'female' = typeInput ?? 'male';
        const regionInput = interaction.options.getString('region') as 'jp' | null;
        const region: 'jp' = regionInput ?? 'jp';
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
    private async loadNameData(): Promise<any> {
        const dataPath = path.join(process.cwd(), 'src', 'data', 'names.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(rawData);
    }

    /**
     * 名前を生成
     */
    private generateNames(nameData: any, type: string, region: string, count: number): Array<{
        first: string;
        last: string;
        full: string;
    }> {
        const names = [];
        
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