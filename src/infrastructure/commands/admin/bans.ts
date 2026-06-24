import { Message } from 'discord.js';
import { createInfoMessage } from '../../../presentation/discord/builders/messages';
import { banService } from '../../services/BanService';

export async function execute(message: Message, _guildId: string) {
    const users = banService.listUsers();
    const servers = banService.listServers();

    const fmt = (entry: { id: string; reason?: string }) =>
        `\`${entry.id}\`${entry.reason ? ` — ${entry.reason}` : ''}`;

    const userList = users.length ? users.map(fmt).join('\n') : 'なし';
    const serverList = servers.length ? servers.map(fmt).join('\n') : 'なし';

    await message.reply(
        createInfoMessage(message, 'BAN LIST', `**ユーザー (${users.length})**\n${userList}\n\n**サーバー (${servers.length})**\n${serverList}`)
    );
}
