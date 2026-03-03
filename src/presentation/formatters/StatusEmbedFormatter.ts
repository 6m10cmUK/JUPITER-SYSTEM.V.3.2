import { EmbedBuilder, Interaction } from 'discord.js';
import { StatusViewModel } from '../viewmodels/StatusViewModel';
import { embedColor } from '../../config/discord_config';
import { generateEmbed } from '../discord/builders/embedGenerator';
import { getStatOrder } from '../../domain/constants/StatOrder';

export class StatusEmbedFormatter {
    async format(statusData: StatusViewModel, interaction: Interaction): Promise<EmbedBuilder> {
        const user = await interaction.client.users.fetch(interaction.user.id);
        
        const title = statusData.showCustomMenu 
            ? `CoC ${statusData.version} CUSTOM STATUS`
            : `CoC ${statusData.version} CHAR STATUS`;
            
        const embed = generateEmbed(interaction)
            .setColor(embedColor)
            .setTitle(title)
            .setDescription(`NAME: ${statusData.characterName}`)
            .setFooter({ text: statusData.version });
        
        // 各ステータスを番号付きフィールドとして追加
        const statOrder = getStatOrder(statusData.version);
        
        statOrder.forEach((stat, index) => {
            embed.addFields({
                name: `${index + 1}️⃣ ${stat}: ${statusData.primaryStats[stat] ?? 0}`,
                value: statusData.primaryStatsDetails[stat] ?? '(詳細なし)',
                inline: true
            });
        });
        
        // 合計値とDB（またはDB/BUILD）
        const total = Object.values(statusData.primaryStats).reduce((sum, val) => {
            return typeof val === 'number' ? sum + val : sum;
        }, 0);
        
        if (statusData.version === '6') {
            // Ver6の場合は空フィールドを追加してレイアウト調整
            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `Total: ${total}`, value: `**DB: ${statusData.secondaryStats.DB}**`, inline: false }
            );
        } else {
            // Ver7の場合
            embed.addFields(
                { name: `Total: ${total}`, value: `**DB: ${statusData.secondaryStats.DB} BUILD: ${statusData.secondaryStats.BUILD}**`, inline: false }
            );
        }
        
        // 二次ステータス
        if (statusData.version === '6') {
            embed.addFields(
                { 
                    name: `LUC: ${statusData.secondaryStats.LUC}\nKNW: ${statusData.secondaryStats.KNW}\nIDA: ${statusData.secondaryStats.IDA}`, 
                    value: '\u200B', 
                    inline: true 
                },
                { 
                    name: `HP: ${statusData.secondaryStats.HP}\nMP: ${statusData.secondaryStats.MP}\nSAN: ${statusData.secondaryStats.SAN}`, 
                    value: '\u200B', 
                    inline: true 
                }
            );
        } else {
            embed.addFields(
                { 
                    name: `KNW: ${statusData.secondaryStats.KNW}\nIDA: ${statusData.secondaryStats.IDA}\nMOV: ${statusData.secondaryStats.MOV}`, 
                    value: '\u200B', 
                    inline: true 
                },
                { 
                    name: `HP: ${statusData.secondaryStats.HP}\nMP: ${statusData.secondaryStats.MP}\nSAN: ${statusData.secondaryStats.SAN}`, 
                    value: '\u200B', 
                    inline: true 
                }
            );
        }
        
        // 職業/興味ポイント
        embed.addFields(
            { 
                name: `基礎職業P: ${statusData.secondaryStats.JobPoints} 興味P: ${statusData.secondaryStats.InterestPoints}`, 
                value: `**振り直し回数: ${statusData.rerollCount}**`, 
                inline: false 
            }
        );
        
        // 変更履歴
        embed.addFields(
            { name: `変更履歴`, value: statusData.history || '\u200B', inline: false }
        );
        
        return embed;
    }
}