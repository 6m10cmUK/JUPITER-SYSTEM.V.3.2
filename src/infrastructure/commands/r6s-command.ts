import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandIntegerOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { SimpleCommandHandler } from './handlers/SimpleCommandHandler';

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
        // R6SCommandHandlerに処理を委譲（統一パターン）
        const handler = new SimpleCommandHandler();
        await handler.handleR6S(interaction);
    }
};