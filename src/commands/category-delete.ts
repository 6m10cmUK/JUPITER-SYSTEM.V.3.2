import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
    SlashCommandIntegerOption,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import { Command } from '../interfaces/Command';

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

        if(!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)){
            await interaction.reply('管理者権限が必要です。');
            return;
        }

        const id = interaction.options.getString('id') ?? '';
        const category = await interaction.guild?.channels.fetch(id);
        if(category && category.type === ChannelType.GuildCategory){

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
            await interaction.reply(`カテゴリ ${category.name} とその中のチャンネルを削除しました。`);
        }
    }
};