import { ModalSubmitInteraction } from 'discord.js';

export class ModalHandler {
    async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
        const modalCustomId = interaction.customId;

        try {
            if (modalCustomId.startsWith('customset:')) {
                await this.handleCustomSetModal(interaction);
            } else {
                console.warn(`Unknown modal customId: ${modalCustomId}`);
                await interaction.reply({ 
                    content: '未知のモーダルです。', 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Modal handling error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'モーダル処理中にエラーが発生しました。', 
                    ephemeral: true 
                });
            }
        }
    }

    private async handleCustomSetModal(interaction: ModalSubmitInteraction): Promise<void> {
        const { handleCustomSetModal } = await import('../../../interactions/customSetInteraction');
        await handleCustomSetModal(interaction);
    }
}