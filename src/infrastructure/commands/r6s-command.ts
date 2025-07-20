import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';

const attackers = [
    'Sledge', 'Thatcher', 'Ash', 'Thermite', 'Twitch', 'Montagne', 'Glaz', 'Fuze', 'Blitz', 'IQ',
    'Buck', 'Blackbeard', 'Capitão', 'Hibana', 'Jackal', 'Ying', 'Zofia', 'Dokkaebi', 'Lion', 'Finka',
    'Maverick', 'Nomad', 'Gridlock', 'Nøkk', 'Amaru', 'Kali', 'Iana', 'Ace', 'Zero', 'Flores',
    'Osa', 'Sens', 'Grim', 'Brava', 'Ram', 'Deimos', 'Striker', 'Rauora'
];

const defenders = [
    'Smoke', 'Mute', 'Castle', 'Pulse', 'Doc', 'Rook', 'Kapkan', 'Tachanka', 'Jäger', 'Bandit',
    'Frost', 'Valkyrie', 'Caveira', 'Echo', 'Mira', 'Lesion', 'Ela', 'Vigil', 'Maestro', 'Alibi',
    'Clash', 'Kaid', 'Mozzie', 'Warden', 'Goyo', 'Wamai', 'Oryx', 'Melusi', 'Aruni', 'Thunderbird',
    'Thorn', 'Azami', 'Solis', 'Fenrir', 'Tubarão', 'Skopos', 'Sentry'
];

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('r6s')
        .setDescription('R6Sのオペレーターをランダムに選出します') as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const randomAttacker = attackers[Math.floor(Math.random() * attackers.length)];
        const randomDefender = defenders[Math.floor(Math.random() * defenders.length)];
        
        const embed = generateEmbed(interaction)
            .setColor(0x00FF00)
            .setTitle('R6S オペレーター選出')
            .setFields(
                { name: '🔫 攻撃側', value: randomAttacker, inline: true },
                { name: '🛡️ 防衛側', value: randomDefender, inline: true }
            );
            
        await interaction.reply({embeds: [embed]});
    }
};