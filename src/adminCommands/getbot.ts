import { Message } from 'discord.js';
import { createInfoMessage } from '../commons/messages';
import { JUPITER_SYSTEM_VERSION, BOT_INVITE_URL } from '../config/discord_config';

export async function execute(message: Message, guildId: string) {
    const embed = createInfoMessage(`[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] BOT INFO`, `[招待URL](${BOT_INVITE_URL})`);
    await message.reply(embed);
}