import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { ryuhaMap, createNinpoDisplay, ninpoTypeMap } from '../commons/createNinpoDisplay';
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ninpo')
        .setDescription('忍法コマンド')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('ryuha')
                .setDescription('表示する流派')
                .setRequired(true)
                .addChoices(ryuhaMap.map((ryuha) => ({ name: ryuha.label, value: ryuha.value })))
        )
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('type')
                .setDescription('表示する忍法種別')
                .setRequired(false)
                .addChoices(ninpoTypeMap.map((ninpoType) => ({ name: ninpoType.label, value: ninpoType.value })))
        ) as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
        const ryuha = interaction.options.getString('ryuha') ?? 'hanyo';
        const type = interaction.options.getString('type') ?? null;

        const display = await createNinpoDisplay(interaction, ryuha, type, 1)
        
        await interaction.reply(display);
    }
};