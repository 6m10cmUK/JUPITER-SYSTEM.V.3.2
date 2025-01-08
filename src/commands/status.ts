import { Message, TextChannel } from 'discord.js';

export const execute = (message: Message) => {
    if (message.channel instanceof TextChannel) {
        message.channel.send('status');
    }
};
