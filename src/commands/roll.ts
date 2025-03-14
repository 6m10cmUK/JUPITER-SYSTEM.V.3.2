import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { roll } from './classicCommands/diceRoll';
import { generateEmbed } from '../commons/embedGenerator';

const fullWidthChars = /[Ａ-Ｚａ-ｚ０-９＋－＊／＜＝（）]/g;

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('set')
                .setDescription('(n)d(n)')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const content = interaction.options.getString('set') ?? '';


        let contents = content.split(/[\s\u3000]/);

        let target = contents[0].replace(fullWidthChars, (s) =>
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
        ).toLowerCase();
        let repeat = 1;
        const match = target.toLowerCase().match(/x(\d+)/i);
        if(match){
            target = contents[1].replace(fullWidthChars, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            ).toLowerCase();
            repeat = parseInt(match[1]);
        }
    
        let resultTexts: string[] = [];
        let color = 0x888888;
    
        for(let i = 0; i < repeat; i++){
            const result = await roll(target, content);
    
            if(result == null){
                return;
            }
            color = result[1] as number;
            let text = `${result[0]}`;
            if(repeat > 1){
                text = `#${i + 1} ${text}`;
            }
            resultTexts.push(text);
        }
    
        const embed = generateEmbed(interaction)
        .addFields(
            { name: content, value: resultTexts.join('\n') }
        )
        .setColor(color);
    
        await interaction.reply({ embeds: [embed] });
    }
}; 