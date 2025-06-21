import { ChatInputCommandInteraction } from 'discord.js';
import { GenerateStatusUseCase } from '../../../application/use-cases/status/GenerateStatusUseCase';
import { StatusEmbedFormatter } from '../../../presentation/formatters/StatusEmbedFormatter';
import { StatusResultDto } from '../../../application/dto/StatusDto';
import { StatusComponentBuilder } from '../../../presentation/discord/builders/StatusComponentBuilder';

export class StatusCommandHandler {
    private readonly generateStatusUseCase: GenerateStatusUseCase;
    private readonly formatter: StatusEmbedFormatter;
    
    constructor() {
        this.generateStatusUseCase = new GenerateStatusUseCase();
        this.formatter = new StatusEmbedFormatter();
    }
    
    async handle(
        interaction: ChatInputCommandInteraction,
        version: '6' | '7',
        characterName: string,
        showCustomMenu: boolean = false
    ): Promise<void> {
        await interaction.deferReply();
        const replyMessage = await interaction.fetchReply();
        const messageId = replyMessage?.id || '';
        
        const statusResult = this.generateStatusUseCase.execute({
            version,
            characterName,
            userId: interaction.user.id,
            messageId
        });
        
        // messageIdとuserIdとshowCustomMenuをstatusResultに設定
        statusResult.messageId = messageId;
        statusResult.userId = interaction.user.id;
        statusResult.showCustomMenu = showCustomMenu;
        
        const embed = await this.formatter.format(statusResult, interaction);
        const components = StatusComponentBuilder.createComponents(statusResult, messageId, interaction.user.id);
        
        await interaction.editReply({ embeds: [embed], components });
    }
}