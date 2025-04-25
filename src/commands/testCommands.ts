import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandRoleOption,
    SlashCommandUserOption,
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { createSuccessMessage, createErrorMessage } from '../commons/messages';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('hoge')
        .setDescription('選択肢からランダムに選ぶ')
        .addUserOption((option: SlashCommandUserOption) =>
            option.setName('user')
                .setDescription('ユーザー')
                .setRequired(true)
        )
        .addRoleOption((option: SlashCommandRoleOption) =>
            option.setName('role')
                .setDescription('ロール')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        if (!user || !role) {
            await interaction.reply({
                content: 'ユーザーかロールの指定が正しくないよ',
                ephemeral: true
            });
            return;
        }

        const member = await interaction.guild?.members.fetch(user.id);
        const guildRole = interaction.guild?.roles.cache.get(role.id);

        if (!member) {
            const message = await createErrorMessage(interaction, 'ERROR', 'user not found.');
            await interaction.reply(message);
            return;
        }
        if (!guildRole) {
            const message = await createErrorMessage(interaction, 'ERROR', 'role not found.');
            await interaction.reply(message);
            return;
        }

        try {
            await member.roles.add(guildRole);
            const message = await createSuccessMessage(interaction, 'SUCCESS', `add role ${guildRole.name} to ${user.username}`);
            await interaction.reply(message);
        } catch (error) {
            const message = await createErrorMessage(interaction, 'ERROR', (error as Error).message);
            await interaction.reply(message);
        }

    }
}; 