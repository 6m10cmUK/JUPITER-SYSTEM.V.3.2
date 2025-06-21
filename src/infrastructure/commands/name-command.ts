import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import fs from 'fs';
import path from 'path';
import { rollDice } from '../../domain/utils/dice';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';

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
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('region')
                .setDescription('名前の地域')
                .setRequired(false)
                .addChoices(
                    { name: 'JPN', value: 'jp' },
                    { name: 'ENG', value: 'en' }
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
        const region = interaction.options.getString('region') ?? 'jp';
        const count = interaction.options.getInteger('count') ?? 1;

        const names: string[] = [];
        
        if (region === 'jp') {
            // 日本名の生成
            for (let i = 0; i < count; i++) {
                const seiIndex = rollDice(1, nameData.sei.length)[0] - 1;
                const randomSei = nameData.sei[seiIndex];
                let randomMei = '';
                
                if (type === 'male') {
                    const meiIndex = rollDice(1, nameData.mei.male.length)[0] - 1;
                    randomMei = nameData.mei.male[meiIndex];
                    embed.setFooter({ text: "日本人男性名" });
                } else {
                    const meiIndex = rollDice(1, nameData.mei.female.length)[0] - 1;
                    randomMei = nameData.mei.female[meiIndex];
                    embed.setFooter({ text: "日本人女性名" });
                }
                names.push(`${randomSei} ${randomMei}`);
            }
        } else {
            // 海外名の生成
            for (let i = 0; i < count; i++) {
                const surnameIndex = rollDice(1, nameData.surname_en.length)[0] - 1;
                const randomSurname = nameData.surname_en[surnameIndex];
                let randomGiven = '';
                
                if (type === 'male') {
                    const givenIndex = rollDice(1, nameData.given_en.male.length)[0] - 1;
                    randomGiven = nameData.given_en.male[givenIndex];
                    embed.setFooter({ text: "海外男性名" });
                } else {
                    const givenIndex = rollDice(1, nameData.given_en.female.length)[0] - 1;
                    randomGiven = nameData.given_en.female[givenIndex];
                    embed.setFooter({ text: "海外女性名" });
                }
                names.push(`${randomGiven} ${randomSurname}`);
            }
        }
        
        embed.setDescription(names.join('\n\n'));
        await interaction.reply({ embeds: [embed] });
    }
};
