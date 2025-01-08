import { TextChannel } from 'discord.js';
export const execute = (message) => {
    if (message.channel instanceof TextChannel) {
        message.channel.send('status');
    }
};
