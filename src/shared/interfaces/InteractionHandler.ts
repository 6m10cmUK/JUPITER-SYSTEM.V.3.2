import { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';

export interface InteractionHandler {
    prefix: string;
    execute: (interaction: ButtonInteraction | StringSelectMenuInteraction) => Promise<void>;
} 