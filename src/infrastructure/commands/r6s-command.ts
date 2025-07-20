import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandIntegerOption,
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
        .setDescription('R6Sのオペレーターをランダムに選出します')
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('選出する組数')
                .setMinValue(1)
                .setMaxValue(5)
                .setRequired(false)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const count = interaction.options.getInteger('count') ?? 1;
        
        const embed = generateEmbed(interaction)
            .setColor(0x00FF00)
            .setTitle('R6S オペレーター選出');
            
        const fields = [];
        const usedAttackers: string[] = [];
        const usedDefenders: string[] = [];
        
        for (let i = 0; i < count; i++) {
            // 重複しない攻撃側オペレーターを選択
            const availableAttackers = attackers.filter(op => !usedAttackers.includes(op));
            if (availableAttackers.length === 0) {
                await interaction.reply({ content: '選択可能な攻撃側オペレーターが不足しています。', ephemeral: true });
                return;
            }
            const randomAttacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];
            usedAttackers.push(randomAttacker);
            
            // 重複しない防衛側オペレーターを選択
            const availableDefenders = defenders.filter(op => !usedDefenders.includes(op));
            if (availableDefenders.length === 0) {
                await interaction.reply({ content: '選択可能な防衛側オペレーターが不足しています。', ephemeral: true });
                return;
            }
            const randomDefender = availableDefenders[Math.floor(Math.random() * availableDefenders.length)];
            usedDefenders.push(randomDefender);
            
            fields.push(
                { name: `🔫 攻撃側 ${count > 1 ? `#${i + 1}` : ''}`, value: randomAttacker, inline: true },
                { name: `🛡️ 防衛側 ${count > 1 ? `#${i + 1}` : ''}`, value: randomDefender, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }
            );
        }
        
        embed.setFields(...fields);
            
        await interaction.reply({embeds: [embed]});
    }
};