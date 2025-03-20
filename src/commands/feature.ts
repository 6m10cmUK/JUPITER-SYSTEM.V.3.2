import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
} from 'discord.js';
import { Command } from '../interfaces/Command';
import fs from 'fs';
import path from 'path';
import { rollDice } from '../commons/dice';
import { generateEmbed } from '../commons/embedGenerator';
export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('feature')
        .setDescription('ランダム特徴表')
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('取得する特徴の数')
                .setMinValue(1)
                .setMaxValue(3)
                .setRequired(false)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {

        const dataPath = path.join(process.cwd(), 'src', 'data', 'features.json');
        const featureData = await JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const embed = generateEmbed(interaction)
        .setTitle('ランダム特徴表')
        .setColor(0x888888);

        const count = interaction.options.getInteger('count') ?? 1;
        console.log(count);
        for (let i = 0; i < count; i++) {
            const randomIndex = rollDice(1, 6).reduce((a, b) => a + b, 0) - 1;
            const randomNumber = rollDice(1, 10).reduce((a, b) => a + b, 0) - 1;
            console.log(randomIndex, randomNumber);

            const randomFeature = featureData[randomIndex][randomNumber];
            console.dir(randomFeature);

            embed.addFields(
                { name: `${randomIndex + 1}-${randomNumber + 1} ${randomFeature.name}`, value: randomFeature.detail }
            )
        }

        await interaction.reply({ embeds: [embed] });
    }
};
