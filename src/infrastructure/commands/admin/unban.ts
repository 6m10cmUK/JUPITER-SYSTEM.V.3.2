import { Message } from 'discord.js';
import { createErrorMessage, createSuccessMessage } from '../../../presentation/discord/builders/messages';
import { logMessageCommand } from '../../../shared/utils/UsageLogger';
import { banService } from '../../services/BanService';

const USAGE = '使い方: `/#unban user <ユーザーID>` または `/#unban server <サーバーID>`';
const SNOWFLAKE = /^\d{17,20}$/;

export async function execute(message: Message, _guildId: string) {
    const parts = message.content.trim().split(/\s+/);
    const type = parts[1]?.toLowerCase();
    const targetId = parts[2];

    if ((type !== 'user' && type !== 'server') || !targetId) {
        logMessageCommand(message, 'unban', `status=failed cause=invalid-arguments type=${type ?? '-'} target=${targetId ?? '-'}`);
        await message.reply(createErrorMessage(message, 'UNBAN FAILED', USAGE));
        return;
    }

    if (!SNOWFLAKE.test(targetId)) {
        logMessageCommand(message, 'unban', `status=failed cause=invalid-id target=${type}:${targetId}`);
        await message.reply(createErrorMessage(message, 'UNBAN FAILED', 'IDの形式が不正です（17〜20桁の数値）'));
        return;
    }

    if (type === 'user') {
        const removed = banService.unbanUser(targetId);
        if (!removed) {
            logMessageCommand(message, 'unban', `status=failed cause=not-banned target=user:${targetId}`);
            await message.reply(createErrorMessage(message, 'UNBAN FAILED', `ユーザー \`${targetId}\` はBANされていません`));
            return;
        }
        logMessageCommand(message, 'unban', `status=success target=user:${targetId}`);
        await message.reply(createSuccessMessage(message, 'USER UNBANNED', `ユーザー \`${targetId}\` のBANを解除しました`));
        return;
    }

    const removed = banService.unbanServer(targetId);
    if (!removed) {
        logMessageCommand(message, 'unban', `status=failed cause=not-banned target=server:${targetId}`);
        await message.reply(createErrorMessage(message, 'UNBAN FAILED', `サーバー \`${targetId}\` はBANされていません`));
        return;
    }
    logMessageCommand(message, 'unban', `status=success target=server:${targetId}`);
    await message.reply(createSuccessMessage(message, 'SERVER UNBANNED', `サーバー \`${targetId}\` のBANを解除しました`));
}
