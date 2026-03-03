import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { StatusViewModel } from '../../viewmodels/StatusViewModel';
import { unescapeDiscordMarkdown } from '../../../shared/utils/discordUtils';
import { getStatOrder } from '../../../domain/constants/StatOrder';

export class StatusComponentBuilder {
    static createComponents(
        statusData: StatusViewModel,
        messageId: string,
        userId: string
    ): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
        const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
        
        // 振り直しセレクトメニュー
        const statKeys = Object.keys(statusData.primaryStats);
        const rerollMenu = new StringSelectMenuBuilder()
            .setCustomId(`reroll:${messageId}:${userId}`)
            .setPlaceholder('振り直すステータス')
            .addOptions(
                statKeys.map((stat, index) => ({
                    label: `${index + 1}️⃣ ${stat}`,
                    value: stat.toLowerCase(), // Discord.jsのvalueは小文字にする
                    description: `${statusData.primaryStats[stat]} ${unescapeDiscordMarkdown(statusData.primaryStatsDetails[stat])}`
                }))
            );
        
        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rerollMenu));
        
        // 変更セレクトメニュー
        const changeMenu = new StringSelectMenuBuilder()
            .setCustomId(`change:${messageId}:${userId}`)
            .setPlaceholder('入れ替えるステータス')
            .addOptions(
                Object.keys(statusData.primaryStats).map((stat, index) => ({
                    label: `${index + 1}️⃣ ${stat}`,
                    value: stat.toLowerCase(), // Discord.jsのvalueは小文字にする
                    description: `${statusData.primaryStats[stat]} ${unescapeDiscordMarkdown(statusData.primaryStatsDetails[stat])}`
                }))
            );
        
        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(changeMenu));
        
        // ボタン行
        const buttonRow = new ActionRowBuilder<ButtonBuilder>();
        
        // 名前変更ボタンを追加（Ver6とVer7両方）
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`changeName:${messageId}:${userId}`)
                .setLabel('名前変更')
                .setStyle(ButtonStyle.Primary)
        );
        
        // iachara出力ボタン
        const statOrder = getStatOrder(statusData.version);
        
        const urlParams = statOrder.map(stat => `${stat}=${statusData.primaryStats[stat]}`).join('&');
        const iacharaUrl = `https://iachara.com/new/costom/webdice?var=${statusData.version}&${urlParams}`;
        
        buttonRow.addComponents(
            new ButtonBuilder()
                .setURL(iacharaUrl)
                .setLabel('iacharaに出力')
                .setStyle(ButtonStyle.Link)
        );
        
        rows.push(buttonRow);
        
        // カスタムセットメニュー（showCustomMenuがtrueの場合のみ表示）
        if (statusData.showCustomMenu) {
            const customSetMenu = new StringSelectMenuBuilder()
                .setCustomId(`customSet:${messageId}:${userId}`)
                .setPlaceholder('カスタムセット')
                .addOptions(
                    Object.keys(statusData.primaryStats).map((stat, index) => ({
                        label: `${index + 1}️⃣ ${stat}`,
                        value: stat.toLowerCase(), // Discord.jsのvalueは小文字にする
                        description: `${statusData.primaryStats[stat]} ${unescapeDiscordMarkdown(statusData.primaryStatsDetails[stat])}`
                    }))
                );
            
            rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(customSetMenu));
        }
        
        return rows;
    }
}