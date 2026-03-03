import { ChatInputCommandInteraction } from 'discord.js';
import { GenerateStatusUseCase } from '../../../application/use-cases/status/GenerateStatusUseCase';
import { StatusEmbedFormatter } from '../../../presentation/formatters/StatusEmbedFormatter';
import { StatusResultDto, CoCVersion } from '../../../application/dto/StatusDto';
import { StatusViewModel } from '../../../presentation/viewmodels/StatusViewModel';
import { StatusComponentBuilder } from '../../../presentation/discord/builders/StatusComponentBuilder';
import { CommandHandler, ValidationError } from '../../../shared/interfaces/patterns/CommandPatterns';
import { UnifiedErrorHandler } from '../../../shared/errors/UnifiedErrorHandler';

export class StatusCommandHandler implements CommandHandler {
    constructor(
        private readonly generateStatusUseCase: GenerateStatusUseCase,
        private readonly formatter: StatusEmbedFormatter
    ) {}
    
    /**
     * ステータス生成処理（統一インターフェース準拠）
     * @param interaction Discord インタラクション
     */
    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        // インタラクションから引数を抽出（統一パターン）
        const type: string = interaction.options.getString('type', true);
        const characterName = interaction.options.getString('name') ?? 'キャラクター名';
        const showCustomMenu = interaction.options.getBoolean('custom') ?? false;
        
        // StatusTypeからCoCVersionへの厳格な変換（不正値はエラー）
        let version: CoCVersion;
        switch (type) {
            case 'ver6':
                version = '6';
                break;
            case 'ver7':
                version = '7';
                break;
            default:
                throw new ValidationError(`サポートされていないステータスタイプです: ${type}`, 'INVALID_TYPE');
        }

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
     * ステータス生成の実際の処理（層別順次実行）
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
        // 1. Presentation層: Discord API呼び出し
        await interaction.deferReply();
        const replyMessage = await interaction.fetchReply();
        const messageId = replyMessage?.id || '';

        // 2. Application層: ステータス生成
        const statusResult = await this.generateStatusAsync(version, characterName, interaction.user.id);

        // 3. StatusResultDto → StatusViewModel にUI状態を付与
        const statusViewModel: StatusViewModel = {
            ...statusResult,
            messageId,
            userId: interaction.user.id,
            showCustomMenu,
        };

        // 4. Presentation層: UI生成・返却
        const embed = await this.formatter.format(statusViewModel, interaction);
        const components = StatusComponentBuilder.createComponents(statusViewModel, messageId, interaction.user.id);

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