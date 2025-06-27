import { Message } from 'discord.js';
import { DiceRollHandler } from './DiceRollHandler';

/**
 * クラシックダイスロール機能のエントリーポイント
 * メッセージベースのダイスロールコマンドを処理する
 */
export const diceRoll = async (message: Message) => {
    const handler = new DiceRollHandler();
    await handler.handle(message);
};