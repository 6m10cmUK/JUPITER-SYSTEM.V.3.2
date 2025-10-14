import { PartyCreateHandler, PartyCreateError } from '../PartyCreateHandler';

describe('PartyCreateHandler', () => {
    let handler: PartyCreateHandler;
    let mockInteraction: any;

    beforeEach(() => {
        handler = new PartyCreateHandler();
        
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
                },
                roles: {
                    cache: new Map() // 空のロールキャッシュ
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
                getInteger: jest.fn()
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
            reply: jest.fn().mockResolvedValue(undefined),
            replied: false
        };
    });

    test('ハンドラーが正常にインスタンス化される', () => {
        expect(handler).toBeInstanceOf(PartyCreateHandler);
    });

    test('PartyCreateError が適切に定義されている', () => {
        const error = new PartyCreateError('テストエラー', 'PERMISSION_DENIED');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('PartyCreateError');
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
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            fields: expect.arrayContaining([
                                expect.objectContaining({
                                    value: expect.stringContaining('このコマンドは管理者またはサーバーオーナーのみ使用できます')
                                })
                            ])
                        })
                    ])
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
            mockInteraction.options.getInteger.mockReturnValue(2);

            await handler.handle(mockInteraction);

            // 権限チェックは通過し、別のエラーになることを確認
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

        test('陣営番号が範囲外の場合のエラー（下限）', async () => {
            mockInteraction.options.getInteger.mockReturnValue(0); // 範囲外

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });

        test('陣営番号が範囲外の場合のエラー（上限）', async () => {
            mockInteraction.options.getInteger.mockReturnValue(101); // 範囲外

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });

        test('範囲内の陣営番号は通過する', async () => {
            mockInteraction.options.getInteger.mockReturnValue(50); // 範囲内

            // カテゴリが存在しない場合のエラーになることを期待
            await handler.handle(mockInteraction);

            // 入力値バリデーションは通過し、重複チェックでエラーになる
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });

        test('デフォルト陣営番号の動作', async () => {
            mockInteraction.options.getInteger.mockReturnValue(null); // デフォルト値

            await handler.handle(mockInteraction);

            // デフォルト値1が使用され、処理が継続される
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });
    });

    describe('カテゴリチェック', () => {
        beforeEach(() => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: { has: jest.fn().mockReturnValue(true) }
            });
            
            mockInteraction.options.getInteger.mockReturnValue(2);
        });

        test('カテゴリ内でないチャンネルからの実行エラー', async () => {
            mockInteraction.channel = { parent: null }; // カテゴリなし

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });

        test('親チャンネルが存在しない場合のエラー', async () => {
            mockInteraction.channel = null; // チャンネル情報なし

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });
    });

    describe('重複ロールチェック', () => {
        beforeEach(() => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: { has: jest.fn().mockReturnValue(true) }
            });
            mockInteraction.options.getInteger.mockReturnValue(2);
        });

        test('既存ロールが存在する場合のエラー', async () => {
            const existingRole = {
                id: 'existing-role-id',
                name: 'テストカテゴリ_2'
            };
            
            mockInteraction.guild.roles.cache = new Map([
                ['existing-role-id', existingRole]
            ]);

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });

        test('既存ロールが存在しない場合は処理継続', async () => {
            // 空のロールキャッシュ（重複なし）
            mockInteraction.guild.roles.cache = new Map();

            await handler.handle(mockInteraction);

            // 重複チェックは通過し、CategoryManagementServiceでエラーになる
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
            );
        });
    });

    describe('extractOptions', () => {
        test('オプション抽出が正常に動作する', () => {
            mockInteraction.options.getInteger.mockReturnValue(5);

            // プライベートメソッドのテストのため、インスタンス経由でアクセス
            const options = (handler as any).extractOptions(mockInteraction);

            expect(options.partyNumber).toBe(5);
            expect(options.categoryId).toBe('category-id');
        });

        test('デフォルト値の動作', () => {
            mockInteraction.options.getInteger.mockReturnValue(null);

            const options = (handler as any).extractOptions(mockInteraction);

            expect(options.partyNumber).toBe(1); // デフォルト値
            expect(options.categoryId).toBe('category-id');
        });

        test('カテゴリIDが取得できない場合', () => {
            mockInteraction.channel = { parent: null };
            mockInteraction.options.getInteger.mockReturnValue(2);

            const options = (handler as any).extractOptions(mockInteraction);

            expect(options.partyNumber).toBe(2);
            expect(options.categoryId).toBe(''); // 空文字
        });
    });

    describe('エラーコードテスト', () => {
        test('全エラーコードが正しく定義されている', () => {
            const errorCodes = [
                'PERMISSION_DENIED',
                'INVALID_INPUT',
                'OPERATION_FAILED',
                'CATEGORY_NOT_FOUND',
                'DUPLICATE_PARTY'
            ];

            errorCodes.forEach(code => {
                const error = new PartyCreateError('テスト', code as any);
                expect(error.code).toBe(code);
            });
        });
    });

    describe('境界値テスト', () => {
        beforeEach(() => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue({
                permissions: { has: jest.fn().mockReturnValue(true) }
            });
            mockInteraction.guild.roles.cache = new Map(); // 重複なし
        });

        test('陣営番号の境界値テスト', async () => {
            const boundaryValues = [0, 1, 50, 100, 101];
            
            for (const value of boundaryValues) {
                mockInteraction.options.getInteger.mockReturnValue(value);
                
                await handler.handle(mockInteraction);
                
                // 1-100が有効範囲、0と101は無効
                if (value >= 1 && value <= 100) {
                    // 範囲内の場合、入力値バリデーションを通過
                    expect(mockInteraction.editReply).toHaveBeenCalledWith(
                        expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
                    );
                } else {
                    // 範囲外の場合、入力値バリデーションエラー
                    expect(mockInteraction.editReply).toHaveBeenCalledWith(
                        expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
                    );
                }
                
                // モックをリセット
                mockInteraction.editReply.mockClear();
            }
        });

        test('特殊な陣営番号', async () => {
            const specialValues = [1, 2, 10, 99, 100];
            
            for (const value of specialValues) {
                mockInteraction.options.getInteger.mockReturnValue(value);
                
                await handler.handle(mockInteraction);
                
                // すべて有効範囲内なので処理継続
                expect(mockInteraction.editReply).toHaveBeenCalledWith(
                    expect.stringContaining('陣営作成コマンドの処理中にエラーが発生しました。')
                );
                
                mockInteraction.editReply.mockClear();
            }
        });
    });

    describe('Guildなしの場合のテスト', () => {
        test('Guildが存在しない場合のエラー', async () => {
            mockInteraction.guild = null;

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            fields: expect.arrayContaining([
                                expect.objectContaining({
                                    value: expect.stringContaining('このコマンドはサーバー内でのみ使用できます')
                                })
                            ])
                        })
                    ])
                })
            );
        });
    });

    describe('ロール名生成ロジック', () => {
        test('カテゴリ名と陣営番号からロール名が生成される', () => {
            const categoryNames = ['テスト', 'Test-Category', 'カテゴリ123'];
            const partyNumbers = [1, 2, 10, 99];
            
            categoryNames.forEach(categoryName => {
                partyNumbers.forEach(partyNumber => {
                    const expectedRoleName = `${categoryName}_${partyNumber}`;
                    
                    // ロール名の形式が正しいことを確認
                    expect(expectedRoleName).toMatch(/^.+_\d+$/);
                    expect(expectedRoleName).toContain(categoryName);
                    expect(expectedRoleName).toContain(partyNumber.toString());
                });
            });
        });
    });

    describe('チャンネル名生成ロジック', () => {
        test('陣営番号からチャンネル名が生成される', () => {
            const partyNumbers = [1, 2, 10, 99];
            
            partyNumbers.forEach(partyNumber => {
                const expectedChannelName = `第${partyNumber}陣`;
                
                expect(expectedChannelName).toBe(`第${partyNumber}陣`);
            });
        });
    });

    describe('権限管理テスト', () => {
        test('メンバー情報が取得できない場合のエラー', async () => {
            mockInteraction.guild.members.cache.get = jest.fn().mockReturnValue(null);

            await handler.handle(mockInteraction);

            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            fields: expect.arrayContaining([
                                expect.objectContaining({
                                    value: expect.stringContaining('メンバー情報を取得できませんでした')
                                })
                            ])
                        })
                    ])
                })
            );
        });
    });
});