import { Message } from 'discord.js';
import { createErrorMessage, createSuccessMessage } from '../../../presentation/discord/builders/messages';
import { banService } from '../../services/BanService';

const USAGE = '使い方: `/#ban user <ユーザーID> [理由]` または `/#ban server <サーバーID> [理由]`';
const SNOWFLAKE = /^\d{17,20}$/;

export async function execute(message: Message, _guildId: string) {
    const parts = message.content.trim().split(/\s+/);
    const type = parts[1]?.toLowerCase();
    const targetId = parts[2];
    const reason = parts.slice(3).join(' ') || undefined;

    if ((type !== 'user' && type !== 'server') || !targetId) {
        await message.reply(createErrorMessage(message, 'BAN FAILED', USAGE));
        return;
    }

    if (!SNOWFLAKE.test(targetId)) {
        await message.reply(createErrorMessage(message, 'BAN FAILED', 'IDの形式が不正です（17〜20桁の数値）'));
        return;
    }

    if (type === 'user') {
        const added = banService.banUser(targetId, message.author.id, reason);
        if (!added) {
            await message.reply(createErrorMessage(message, 'BAN FAILED', `ユーザー \`${targetId}\` は既にBANされています`));
            return;
        }
        await message.reply(
            createSuccessMessage(message, 'USER BANNED', `ユーザー \`${targetId}\` を全サーバーでブロックしました${reason ? `\n理由: ${reason}` : ''}`)
        );
        return;
    }

    const added = banService.banServer(targetId, message.author.id, reason);
    if (!added) {
        await message.reply(createErrorMessage(message, 'BAN FAILED', `サーバー \`${targetId}\` は既にBANされています`));
        return;
    }
    await message.reply(
        createSuccessMessage(message, 'SERVER BANNED', `サーバー \`${targetId}\` 内の全機能をブロックしました${reason ? `\n理由: ${reason}` : ''}`)
    );
}
