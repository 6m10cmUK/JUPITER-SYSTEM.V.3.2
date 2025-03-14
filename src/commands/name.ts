import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../interfaces/Command';
import fs from 'fs';
import path from 'path';
import { rollDice } from '../commons/dice';
import { generateEmbed } from '../commons/embedGenerator';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription('ランダム名前')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('type')
                .setDescription('表示する名前の種類')
                .setRequired(true)
                .addChoices(
                    { name: '男性名', value: 'male' },
                    { name: '女性名', value: 'female' }
                )
        )
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('取得する名前の数')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {

        
        const dataPath = path.join(process.cwd(), 'src', 'data', 'names.json');
        const nameData = await JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const embed = generateEmbed(interaction)
            .setTitle('ランダム名前')
            .setColor(0x888888);

        const type = interaction.options.getString('type');
        const count = interaction.options.getInteger('count') ?? 1;

        console.log(count);
        const names: string[] = [];
        for (let i = 0; i < count; i++) {
            const randomSei = nameData.sei[rollDice(1, 100).reduce((a, b) => a + b, 0) - 1];
            let randomMei = '';
            if (type === 'male') {
                randomMei = nameData.mei.male[rollDice(1, 100).reduce((a, b) => a + b, 0) - 1];
                embed.setFooter({ text: "男性名" });
            } else {
                randomMei = nameData.mei.female[rollDice(1, 100).reduce((a, b) => a + b, 0) - 1];
                embed.setFooter({ text: "女性名" });
            }

            names.push(`${randomSei} ${randomMei}`);
        }
        embed.setDescription(names.join('\n\n'));

        await interaction.reply({ embeds: [embed] });
    }
};
