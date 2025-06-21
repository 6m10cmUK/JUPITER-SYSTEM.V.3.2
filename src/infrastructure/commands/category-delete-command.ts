import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { createSuccessMessage, createErrorMessage } from '../../presentation/discord/builders/messages';
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('category-delete')
        .setDescription('カテゴリ削除')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('id')
                .setDescription('カテゴリID')
                .setRequired(true)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        if(!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)){
            await interaction.editReply(createErrorMessage(interaction,`PERMISSION DENIED`,'This command can only be used by administrators' ));
            return;
        }

        const id = interaction.options.getString('id') ?? '';
        const category = await interaction.guild?.channels.fetch(id);
        if(category && category.type === ChannelType.GuildCategory){

            try{

                const categoryName = category.name;
                const role = interaction.guild?.roles.cache.find(role => role.name === categoryName);
                const passerRole = interaction.guild?.roles.cache.find(role => role.name === `${categoryName}_通過者`);

                if(role){
                    await role.delete();
                }
                if(passerRole){
                    await passerRole.delete();
                }

                const channels = await interaction.guild?.channels.fetch();
                const childChannels = channels?.filter(channel => channel?.parentId === id);
                
                await Promise.all(childChannels?.map(async channel => {
                    if (channel) {
                        await channel.delete();
                    }
                }) ?? []);
                
                // Then delete the category itself
                await category.delete();
                await interaction.editReply(createSuccessMessage(interaction, 'CATEGORY DELETED COMPLETE', `category-name: ${categoryName}`));
            } catch (error) {
                console.error('エラー:', error);
                await interaction.editReply(createErrorMessage(interaction, 'CATEGORY DELETED FAILED', error instanceof Error ? error.message : 'Unknown error'));
            }
        } else {
            await interaction.editReply(createErrorMessage(interaction, 'CATEGORY DELETED FAILED', 'category not found'));
        }
    }
};