import { Message } from 'discord.js';
import { createInfoMessage } from '../presentation/discord/builders/messages';
import { BOT_INVITE_URL } from '../config/discord_config';

export async function execute(message: Message, guildId: string) {
    const embed = createInfoMessage(message, `BOT INFO`, `[招待URL](${BOT_INVITE_URL})`);
    await message.reply(embed);
}