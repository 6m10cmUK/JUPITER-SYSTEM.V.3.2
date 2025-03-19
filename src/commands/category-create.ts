import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
    SlashCommandIntegerOption,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { createSuccessMessage, createErrorMessage } from '../commons/messages';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('category-create')
        .setDescription('カテゴリ作成')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('name')
                .setDescription('カテゴリ名')
                .setRequired(true)
        )
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('hand-out')
                .setDescription('秘匿チャンネルの数')
                .setRequired(false)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const name = interaction.options.getString('name') ?? '';
        const guildId = interaction.guild?.id;

        if(!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)){
            await interaction.reply('管理者権限が必要です。');
            return;
        }

        if (!guildId) return;

        try{

            const role = await interaction.guild?.roles.create({
                name: name,
                color: 0x888888
            });

            const passerRole = await interaction.guild?.roles.create({
                name: `${name}_通過者`,
                color: 0x888888
            });

            const category = await interaction.guild?.channels.create({ 
                name: name,
                type: ChannelType.GuildCategory
            });

            for(let channelName of ["第一陣", "概要", "日程", "ccfolia", "キャラクターシート"]){
                await interaction.guild?.channels.create({ 
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guildId,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: role.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: passerRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ]
                });
            }

            let secretChannelNames = ["通過者"];

            const handOut = interaction.options.getInteger('hand-out') ?? 0;
            for(let i = 0; i < handOut; i++){
                secretChannelNames.push(`HO${i + 1}`);
            }
            for(let channelName of secretChannelNames){
                await interaction.guild?.channels.create({ 
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guildId,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: passerRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ]
                });
            }

            for(let voiceChannelName of ["セッション中", "秘匿"]){
                await interaction.guild?.channels.create({ 
                    name: voiceChannelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guildId,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: role.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: passerRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                        },
                    ]   
                });
            }

            await interaction.reply(createSuccessMessage(interaction, 'SUCCESS', `カテゴリ ${name} を作成しました。`));

        } catch (error) {
            console.error('エラー:', error);
            await interaction.reply(createErrorMessage(interaction, 'ERROR', error instanceof Error ? error.message : 'Unknown error'));
        }
    }
};