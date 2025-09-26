import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandIntegerOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { SimpleCommandHandler } from './handlers/SimpleCommandHandler';

const attackers = [
    'SLEDGE', 'THATCHER', 'ASH', 'THERMITE', 'TWITCH', 'MONTAGNE', 'GLAZ', 'FUZE', 'BLITZ', 'IQ',
    'BUCK', 'BLACKBEARD', 'CAPITÃO', 'HIBANA', 'JACKAL', 'YING', 'ZOFIA', 'DOKKAEBI', 'LION', 'FINKA',
    'MAVERICK', 'NOMAD', 'GRIDLOCK', 'NØKK', 'AMARU', 'KALI', 'IANA', 'ACE', 'ZERO', 'FLORES',
    'OSA', 'SENS', 'GRIM', 'BRAVA', 'RAM', 'DEIMOS', 'STRIKER', 'RAUORA'
];

const defenders = [
    'SMOKE', 'MUTE', 'CASTLE', 'PULSE', 'DOC', 'ROOK', 'KAPKAN', 'TACHANKA', 'JÄGER', 'BANDIT',
    'FROST', 'VALKYRIE', 'CAVEIRA', 'ECHO', 'MIRA', 'LESION', 'ELA', 'VIGIL', 'MAESTRO', 'ALIBI',
    'CLASH', 'KAID', 'MOZZIE', 'WARDEN', 'GOYO', 'WAMAI', 'ORYX', 'MELUSI', 'ARUNI', 'THUNDERBIRD',
    'THORN', 'AZAMI', 'SOLIS', 'FENRIR', 'TUBARÃO', 'SKOPOS', 'SENTRY'
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