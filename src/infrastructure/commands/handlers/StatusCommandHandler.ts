import { ChatInputCommandInteraction } from 'discord.js';
import { GenerateStatusUseCase } from '../../../application/use-cases/status/GenerateStatusUseCase';
import { StatusEmbedFormatter } from '../../../presentation/formatters/StatusEmbedFormatter';
import { StatusResultDto, CoCVersion } from '../../../application/dto/StatusDto';
import { StatusComponentBuilder } from '../../../presentation/discord/builders/StatusComponentBuilder';
import { CommandHandler } from '../../../interfaces/patterns/CommandPatterns';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';

export class StatusCommandHandler implements CommandHandler {
    private readonly generateStatusUseCase: GenerateStatusUseCase;
    private readonly formatter: StatusEmbedFormatter;
    
    constructor() {
        this.generateStatusUseCase = new GenerateStatusUseCase();
        this.formatter = new StatusEmbedFormatter();
    }
    
    /**
     * ステータス生成処理（統一インターフェース準拠）
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        // インタラクションから引数を抽出（統一パターン）
        const type: string = interaction.options.getString('type', true);
        const characterName = interaction.options.getString('name') ?? 'キャラクター名';
        const showCustomMenu = interaction.options.getBoolean('custom') ?? false;
        
        // StatusTypeからCoCVersionへの型安全な変換
        const version: CoCVersion = type === 'ver7' ? '7' : '6';

        try {
            await this.executeStatusGeneration(interaction, version, characterName, showCustomMenu);
        } catch (error) {
            await UnifiedErrorHandler.handleCommandError(interaction, error, {
                commandName: 'status',
                input: { type, characterName, showCustomMenu }
            });
        }
    }

    /**
     * ステータス生成の実際の処理（並列処理最適化）
     * @param interaction Discord インタラクション
     * @param version CoCのバージョン
     * @param characterName キャラクター名
     * @param showCustomMenu カスタムメニュー表示フラグ
     */
    private async executeStatusGeneration(
        interaction: ChatInputCommandInteraction,
        version: CoCVersion,
        characterName: string,
        showCustomMenu: boolean
    ): Promise<void> {
        // 並列処理による最適化: Discord API呼び出しとステータス生成を同時実行
        const [replyMessage, statusResult] = await Promise.all([
            interaction.deferReply().then(() => interaction.fetchReply()),
            this.generateStatusAsync(version, characterName, interaction.user.id)
        ]);
        
        const messageId = replyMessage?.id || '';
        
        // messageIdを後から設定（メッセージ生成後に決まるため）
        statusResult.messageId = messageId;
        statusResult.userId = interaction.user.id;
        statusResult.showCustomMenu = showCustomMenu;
        
        // UI生成も並列化（Embed生成とComponent生成を同時実行）
        const [embed, components] = await Promise.all([
            this.formatter.format(statusResult, interaction),
            Promise.resolve(StatusComponentBuilder.createComponents(statusResult, messageId, interaction.user.id))
        ]);
        
        await interaction.editReply({ embeds: [embed], components });
    }
    
    /**
     * ステータス生成の非同期ラッパー
     * @param version CoCのバージョン
     * @param characterName キャラクター名
     * @param userId ユーザーID
     * @returns ステータス生成結果
     */
    private async generateStatusAsync(
        version: CoCVersion,
        characterName: string,
        userId: string
    ): Promise<StatusResultDto> {
        return this.generateStatusUseCase.execute({
            version,
            characterName,
            userId,
            messageId: '' // 後で設定
        });
    }
}