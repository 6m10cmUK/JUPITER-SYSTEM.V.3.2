import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, CommandInteraction } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | any;
  execute: (interaction: CommandInteraction) => Promise<void>;
}