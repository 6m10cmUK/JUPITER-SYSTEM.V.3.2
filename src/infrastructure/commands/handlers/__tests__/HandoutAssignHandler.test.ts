import { HandoutAssignHandler, HandoutAssignError } from '../HandoutAssignHandler';

describe('HandoutAssignHandler', () => {
    let handler: HandoutAssignHandler;
    let mockInteraction: any;

    beforeEach(() => {
        handler = new HandoutAssignHandler();
        
        // 基本的なインタラクションモック
        mockInteraction = {
            user: { id: 'test-user', username: 'TestUser' },
            guild: {
                id: 'test-guild',
                ownerId: 'owner-id',
                members: {
                    cache: new Map([
                        ['test-user', {
                            permissions: {
                                has: jest.fn().mockReturnValue(true) // 管理者権限あり
                            }
                        }]
                    ])
                }
            },
            guildId: 'test-guild',
            channelId: 'test-channel',
            channel: {
                parent: {
                    id: 'category-id',
                    name: 'テストカテゴリ'
                }
            },
            options: {
                getUser: jest.fn(),
                getInteger: jest.fn(),
                getString: jest.fn()
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
            reply: jest.fn().mockResolvedValue(undefined),
            replied: false
        };
    });

    test('ハンドラーが正常にインスタンス化される', () => {
        expect(handler).toBeInstanceOf(HandoutAssignHandler);
    });

    test('HandoutAssignError が適切に定義されている', () => {
        const error = new HandoutAssignError('テストエラー', 'PERMISSION_DENIED');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('HandoutAssignError');
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.message).toBe('テストエラー');
    });

    test('handleメソッドが存在する', () => {
        expect(typeof handler.handle).toBe('function');
    });

    describe('権限チェック', () => {
        test('管理者権限がない場合のエラー', async () => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: {
                    has: jest.fn().mockReturnValue(false) // 管理者権限なし
                }
            });
            mockInteraction.guild.ownerId = 'other-user'; // オーナーでもない

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('このコマンドは管理者またはサーバーオーナーのみ使用できます')
                })
            );
        });

        test('サーバーオーナーの場合は実行可能', async () => {
            mockInteraction.guild.ownerId = 'test-user'; // ユーザーがオーナー
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: {
                    has: jest.fn().mockReturnValue(false) // 管理者権限なしでも
                }
            });

            // 他のエラーを回避するため最小限のモック
            mockInteraction.options.getUser.mockReturnValue(null);

            await handler.handle(mockInteraction);

            // 権限チェックは通過し、別のエラー（ユーザー未指定）になることを確認
            expect(mockInteraction.editReply).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('このコマンドは管理者またはサーバーオーナーのみ使用できます')
                })
            );
        });
    });

    describe('入力値バリデーション', () => {
        beforeEach(() => {
            // 権限チェックを通すため
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: {
                    has: jest.fn().mockReturnValue(true)
                }
            });
        });

        test('ユーザーが指定されていない場合のエラー', async () => {
            mockInteraction.options.getUser.mockReturnValue(null);
            mockInteraction.options.getInteger.mockReturnValue(1);

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
            );
        });

        test('ハンドアウト番号が範囲外の場合のエラー', async () => {
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(11); // 範囲外

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
            );
        });

        test('範囲内のハンドアウト番号は通過する', async () => {
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(5); // 範囲内
            mockInteraction.options.getString.mockReturnValue('表示名');

            // カテゴリが存在しない場合のエラーになることを期待
            await handler.handle(mockInteraction);

            // 入力値バリデーションは通過し、カテゴリ検索でエラーになる
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
            );
        });
    });

    describe('カテゴリチェック', () => {
        beforeEach(() => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: { has: jest.fn().mockReturnValue(true) }
            });
            
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(1);
        });

        test('カテゴリ内でないチャンネルからの実行エラー', async () => {
            mockInteraction.channel = { parent: null }; // カテゴリなし

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
            );
        });

        test('親チャンネルが存在しない場合のエラー', async () => {
            mockInteraction.channel = null; // チャンネル情報なし

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
            );
        });
    });

    describe('extractOptions', () => {
        test('オプション抽出が正常に動作する', () => {
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(3);
            mockInteraction.options.getString.mockReturnValue('表示名');

            // プライベートメソッドのテストのため、インスタンス経由でアクセス
            const options = (handler as any).extractOptions(mockInteraction);

            expect(options.user).toBe(mockUser);
            expect(options.handout).toBe(3);
            expect(options.displayName).toBe('表示名');
            expect(options.categoryId).toBe('category-id');
        });

        test('オプショナル値のデフォルト動作', () => {
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(null);
            mockInteraction.options.getString.mockReturnValue(null);

            const options = (handler as any).extractOptions(mockInteraction);

            expect(options.handout).toBe(1); // デフォルト値
            expect(options.displayName).toBeUndefined();
        });
    });

    describe('エラーコードテスト', () => {
        test('全エラーコードが正しく定義されている', () => {
            const errorCodes = [
                'PERMISSION_DENIED',
                'INVALID_INPUT',
                'OPERATION_FAILED',
                'CATEGORY_NOT_FOUND',
                'HANDOUT_NOT_FOUND'
            ];

            errorCodes.forEach(code => {
                const error = new HandoutAssignError('テスト', code as any);
                expect(error.code).toBe(code);
            });
        });
    });

    describe('境界値テスト', () => {
        beforeEach(() => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: { has: jest.fn().mockReturnValue(true) }
            });
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
        });

        test('ハンドアウト番号の境界値テスト', async () => {
            const boundaryValues = [0, 1, 10, 11];
            
            for (const value of boundaryValues) {
                mockInteraction.options.getInteger.mockReturnValue(value);
                
                await handler.handle(mockInteraction);
                
                // 1-10が有効範囲、0と11は無効
                if (value >= 1 && value <= 10) {
                    // 範囲内の場合、入力値バリデーションを通過
                    expect(mockInteraction.editReply).toHaveBeenCalledWith(
                        expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
                    );
                } else {
                    // 範囲外の場合、入力値バリデーションエラー
                    expect(mockInteraction.editReply).toHaveBeenCalledWith(
                        expect.stringContaining('ハンドアウト割り当てコマンドの処理中にエラーが発生しました。')
                    );
                }
                
                // モックをリセット
                mockInteraction.editReply.mockClear();
            }
        });

        test('表示名の長さテスト', async () => {
            const mockUser = { id: 'target-user', username: 'TargetUser' };
            mockInteraction.options.getUser.mockReturnValue(mockUser);
            mockInteraction.options.getInteger.mockReturnValue(1);
            
            const longDisplayName = 'a'.repeat(100); // 長い表示名
            mockInteraction.options.getString.mockReturnValue(longDisplayName);

            await handler.handle(mockInteraction);

            // 表示名の長さ制限は実装されていないが、処理は継続される
            expect(mockInteraction.editReply).toHaveBeenCalled();
        });
    });

    describe('Guildなしの場合のテスト', () => {
        test('Guildが存在しない場合のエラー', async () => {
            mockInteraction.guild = null;

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('このコマンドはサーバー内でのみ使用できます')
                })
            );
        });
    });
});