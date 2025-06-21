import { ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import { DomainError, ValidationError, DiceExpressionError } from './DomainError';

export class ErrorHandler {
    private static readonly ERROR_MESSAGES = {
        GENERIC: 'エラーが発生しました。もう一度お試しください。',
        VALIDATION: '入力された値が正しくありません。',
        DICE_EXPRESSION: 'ダイス式が正しくありません。',
        PERMISSION: '権限がありません。',
        NOT_FOUND: '見つかりませんでした。'
    };

    static async handleInteractionError(
        interaction: ChatInputCommandInteraction,
        error: Error
    ): Promise<void> {
        const message = this.getErrorMessage(error);
        const isEphemeral = this.shouldBeEphemeral(error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: message,
                    ephemeral: isEphemeral
                });
            } else {
                await interaction.reply({
                    content: message,
                    ephemeral: isEphemeral
                });
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }

        this.logError(error, {
            type: 'interaction',
            guildId: interaction.guildId,
            userId: interaction.user.id,
            command: interaction.commandName
        });
    }

    static async handleMessageError(
        message: Message,
        error: Error
    ): Promise<void> {
        // For classic commands, we might want to be more selective about showing errors
        if (this.shouldShowMessageError(error)) {
            const errorMessage = this.getErrorMessage(error);
            
            try {
                await message.reply({
                    embeds: [this.createErrorEmbed(errorMessage)]
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }

        this.logError(error, {
            type: 'message',
            guildId: message.guildId,
            userId: message.author.id,
            content: message.content
        });
    }

    private static getErrorMessage(error: Error): string {
        if (error instanceof ValidationError) {
            return `${this.ERROR_MESSAGES.VALIDATION} ${error.message}`;
        }
        
        if (error instanceof DiceExpressionError) {
            return `${this.ERROR_MESSAGES.DICE_EXPRESSION} ${error.message}`;
        }
        
        if (error instanceof DomainError) {
            return error.message;
        }
        
        return this.ERROR_MESSAGES.GENERIC;
    }

    private static shouldBeEphemeral(error: Error): boolean {
        // Validation errors should be ephemeral to avoid cluttering the channel
        return error instanceof ValidationError ||
               error instanceof DiceExpressionError;
    }

    private static shouldShowMessageError(error: Error): boolean {
        // Only show certain errors for message commands
        return error instanceof ValidationError ||
               error instanceof DiceExpressionError;
    }

    private static createErrorEmbed(message: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('エラー')
            .setDescription(message)
            .setTimestamp();
    }

    private static logError(error: Error, context: any): void {
        console.error('Error occurred:', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context
        });
    }
}