import { 
    ButtonInteraction, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction
} from 'discord.js';
import { checkOwnerPermission } from '../shared/utils/interactionGuards';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { processNameInput } from '../shared/utils/nameProcessor';

export const prefix = 'changeName';

export async function execute(interaction: ButtonInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    if (!await checkOwnerPermission(interaction, userId, 'CHANGE NAME FAILED')) return;

    const modal = new ModalBuilder()
        .setCustomId(`nameChangeModal:${messageId}:${userId}`)
        .setTitle('キャラクター名変更');

    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('新しい名前を入力してください')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

// モーダル送信のハンドラーを別途エクスポート
export async function handleNameChangeModal(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith('nameChangeModal:')) return;

    const [_, messageId, userId] = interaction.customId.split(':');
    const newName = interaction.fields.getTextInputValue('name');

    // 権限チェック
    if (!await checkOwnerPermission(interaction, userId, 'CHANGE NAME FAILED')) return;

    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    // 元のメッセージを取得
    const originalMessage = await interaction.channel.messages.fetch(messageId);
    if (!originalMessage) {
        await errorMessage('メッセージが見つからないよ...');
        return;
    }

    const embed = originalMessage.embeds[0];
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

    // 名前入力の処理
    const nameResult = processNameInput(newName, messageId);
    
    // 更新が不要な場合は終了
    if (!nameResult.shouldUpdate) {
        await interaction.deferUpdate();
        return;
    }
    
    const actualName = nameResult.actualName;
    
    // 新しい名前を設定
    statusData.characterName = actualName;
    statusData.messageId = messageId;
    statusData.userId = userId;

    // ステータス表示を更新
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);

    await originalMessage.edit({ embeds: [updatedEmbed], components });
    await interaction.deferUpdate();
}