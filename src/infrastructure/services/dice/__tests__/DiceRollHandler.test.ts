import { Message } from 'discord.js';
import { DiceRollHandler } from '../DiceRollHandler';

// Mockオブジェクトの作成
const createMockMessage = (content: string): Message => {
    const replies: any[] = [];
    const reactions: any[] = [];
    
    const mockMessage = {
        content,
        author: {
            id: 'test-user-123',
            username: 'TestUser',
            displayName: 'TestUser',
            displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png'),
            send: jest.fn()
        } as any,
        guildId: 'test-guild-123',
        reply: jest.fn((data) => {
            replies.push(data);
            return Promise.resolve({} as any);
        }),
        react: jest.fn((emoji: any) => {
            reactions.push(emoji);
            return Promise.resolve({} as any);
        }),
        _replies: replies,
        _reactions: reactions
    } as any;
    
    return mockMessage as Message;
};

describe('DiceRollHandler', () => {
    let handler: DiceRollHandler;

    beforeEach(() => {
        handler = new DiceRollHandler();
    });

    describe('コマンド認識', () => {
        test('1d100は認識される', async () => {
            const message = createMockMessage('1d100') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
            const reply = (message as any)._replies[0];
            expect(reply.embeds).toBeDefined();
            expect(reply.embeds[0].data.fields[0].name).toBe('1d100');
        });

        test('全角の１ｄ１００も認識される', async () => {
            const message = createMockMessage('１ｄ１００') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('CC<=80は認識される', async () => {
            const message = createMockMessage('CC<=80') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('CCB<=55は認識される', async () => {
            const message = createMockMessage('CCB<=55') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('CC(96)故障判定は認識される', async () => {
            const message = createMockMessage('CC(96)') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('CBR(70,60)は認識される', async () => {
            const message = createMockMessage('CBR(70,60)') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('RES(15-12)は認識される', async () => {
            const message = createMockMessage('RES(15-12)') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('3U6[5]は認識される', async () => {
            const message = createMockMessage('3U6[5]') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('3B6は認識される', async () => {
            const message = createMockMessage('3B6') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('10B6>=4は認識される', async () => {
            const message = createMockMessage('10B6>=4') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('C(10-4*3/2+2)は認識される', async () => {
            const message = createMockMessage('C(10-4*3/2+2)') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('choice[a,b,c]は認識される', async () => {
            const message = createMockMessage('choice[apple,banana,cherry]') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('D66は認識される', async () => {
            const message = createMockMessage('D66') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });

        test('D66Sは認識される', async () => {
            const message = createMockMessage('D66S') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
        });
    });

    describe('除外パターン', () => {
        test('1d10d10は認識されない', async () => {
            const message = createMockMessage('1d10d10') as Message;
            await handler.handle(message);
            
            expect(message.reply).not.toHaveBeenCalled();
        });

        test('改行を含むメッセージは認識されない', async () => {
            const message = createMockMessage('1d100\n追加テキスト') as Message;
            await handler.handle(message);
            
            expect(message.reply).not.toHaveBeenCalled();
        });

        test('ダイス表記を含まない文字列は認識されない', async () => {
            const message = createMockMessage('普通のテキスト') as Message;
            await handler.handle(message);
            
            expect(message.reply).not.toHaveBeenCalled();
        });
    });

    describe('後続テキストの処理', () => {
        test('1d100 追加のコメント は認識される', async () => {
            const message = createMockMessage('1d100 追加のコメント') as Message;
            await handler.handle(message);
            
            expect(message.reply).toHaveBeenCalled();
            const reply = (message as any)._replies[0];
            // フィールド名には元の全文が表示される
            expect(reply.embeds[0].data.fields[0].name).toBe('1d100 追加のコメント');
        });
    });
});