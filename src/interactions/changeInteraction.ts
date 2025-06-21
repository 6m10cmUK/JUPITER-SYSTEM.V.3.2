import { 
    StringSelectMenuInteraction, 
    ActionRowBuilder, 
    StringSelectMenuBuilder
} from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { createErrorMessage } from '../presentation/discord/builders/messages';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';

export const prefix = 'change';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    const user = await interaction.client.users.fetch(userId);
    if (user.id !== interaction.user.id) {
        await interaction.reply(createErrorMessage(interaction, `CHANGE FAILED`, 'This command can only be used on your own character.'));
        return;
    }

    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    // メッセージとEmbedの取得
    const message = await interaction.channel.messages.fetch(messageId);
    if (!message) {
        await errorMessage('メッセージが見つかりませんでした');
        return;
    }

    const embed = message.embeds[0];
    if (!embed) {
        await errorMessage('embedデータが見つかりませんでした');
        return;
    }

    // EmbedからStatusResultDtoを復元
    const parser = new StatusEmbedParser();
    const statusData = parser.parse(embed);
    
    if (!statusData) {
        await errorMessage('ステータスデータの解析に失敗しました');
        return;
    }

    // messageIdとuserIdを設定
    statusData.messageId = messageId;
    statusData.userId = userId;

    // 選択されたステータスの情報を取得
    const selectedStat = interaction.values[0].toUpperCase(); // 大文字に変換
    const selectedValue = statusData.primaryStats[selectedStat];
    const selectedDetails = statusData.primaryStatsDetails[selectedStat];

    // ステータス表示を更新（振り直し回数は増やさない）
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);
    
    await message.edit({ embeds: [updatedEmbed], components });

    // 入れ替え先選択メニューを表示
    const statOrder = statusData.version === '6' 
        ? ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU']
        : ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'LUC'];

    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`${selectedStat}: ${selectedValue} ⇄`);
        
    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`changeSelector:${selectedStat}:${messageId}:${userId}`)
                .setPlaceholder(`${selectedStat}:${selectedValue}と入れ替えるステータス`)
                .addOptions(
                    statOrder
                        .filter(stat => stat !== selectedStat)
                        .map((stat, index) => {
                            const statIndex = statOrder.indexOf(stat);
                            return {
                                label: `${statIndex + 1}️⃣ ${stat}`,
                                value: stat,
                                description: `${statusData.primaryStats[stat]} ${statusData.primaryStatsDetails[stat]}`
                            };
                        })
                )
        );

    await interaction.reply({ embeds: [rerollEmbed], components: [selectMenu] });
}