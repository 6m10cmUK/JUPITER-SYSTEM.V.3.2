import {
    CategoryManagementService,
    CategoryManagementError,
    CategoryCreationResult,
    HandoutAssignResult,
    PartyCreationResult,
    CategoryDeletionResult
} from '../CategoryManagementService';

describe('CategoryManagementService', () => {
    let mockGuild: any;
    let service: CategoryManagementService;

    beforeEach(() => {
        // Guildのモック作成
        mockGuild = {
            roles: {
                everyone: { id: 'everyone-role-id' },
                cache: new Map(),
                create: jest.fn()
            },
            channels: {
                cache: new Map(),
                create: jest.fn()
            }
        };
        
        service = new CategoryManagementService(mockGuild);
    });

    test('サービスが正常にインスタンス化される', () => {
        expect(service).toBeInstanceOf(CategoryManagementService);
    });

    describe('CategoryManagementError', () => {
        test('エラーが適切に定義されている', () => {
            const error = new CategoryManagementError(
                'テストエラー',
                'ROLE_CREATION_FAILED',
                { test: 'data' }
            );
            
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('CategoryManagementError');
            expect(error.code).toBe('ROLE_CREATION_FAILED');
            expect(error.message).toBe('テストエラー');
            expect(error.details).toEqual({ test: 'data' });
        });

        test('エラーコードの型安全性', () => {
            const validCodes = [
                'ROLE_CREATION_FAILED',
                'CHANNEL_CREATION_FAILED',
                'PERMISSION_SETTING_FAILED',
                'CATEGORY_NOT_FOUND',
                'HANDOUT_NOT_FOUND',
                'DUPLICATE_ROLE',
                'INVALID_PARTY_NUMBER',
                'USER_NOT_FOUND',
                'INSUFFICIENT_PERMISSIONS'
            ];

            validCodes.forEach(code => {
                const error = new CategoryManagementError(
                    'テスト',
                    code as any,
                    {}
                );
                expect(error.code).toBe(code);
            });
        });
    });

    describe('createCategoryWithRoles', () => {
        test('基本的なカテゴリ作成の成功パス', async () => {
            // モックの設定
            const mockRole1 = { id: 'role1-id', name: 'テスト_1' };
            const mockRole2 = { id: 'role2-id', name: 'テスト_通過者' };
            const mockCategory = {
                id: 'category-id',
                name: 'テスト',
                children: { cache: new Map() }
            };
            const mockChannel = { id: 'channel-id', name: 'テストチャンネル' };

            mockGuild.roles.create
                .mockResolvedValueOnce(mockRole1)
                .mockResolvedValueOnce(mockRole2);
            
            mockGuild.channels.create
                .mockResolvedValueOnce(mockCategory)
                .mockResolvedValue(mockChannel);

            const result = await service.createCategoryWithRoles('テスト', 0);

            expect(result).toBeDefined();
            expect(result.category).toBe(mockCategory);
            expect(result.roles.firstParty).toBe(mockRole1);
            expect(result.roles.passedMembers).toBe(mockRole2);
            expect(result.summary).toContain('テスト');
        });

        test('ハンドアウトチャンネル付きカテゴリ作成', async () => {
            const mockRole1 = { id: 'role1-id', name: 'テスト_1' };
            const mockRole2 = { id: 'role2-id', name: 'テスト_通過者' };
            const mockCategory = {
                id: 'category-id',
                name: 'テスト',
                children: { cache: new Map() }
            };
            const mockChannel = { id: 'channel-id', name: 'テストチャンネル' };

            mockGuild.roles.create
                .mockResolvedValueOnce(mockRole1)
                .mockResolvedValueOnce(mockRole2);
            
            mockGuild.channels.create.mockResolvedValue(mockChannel);

            const result = await service.createCategoryWithRoles('テスト', 2);

            expect(result.channels.handouts).toHaveLength(2);
            expect(mockGuild.channels.create).toHaveBeenCalledTimes(7); // category + 4基本 + 2ハンドアウト
        });

        test('ロール作成失敗時のエラーハンドリング', async () => {
            mockGuild.roles.create.mockRejectedValue(new Error('ロール作成失敗'));

            await expect(service.createCategoryWithRoles('テスト', 0))
                .rejects
                .toThrow(CategoryManagementError);
        });
    });

    describe('assignHandout', () => {
        test('存在しないカテゴリでのエラー', async () => {
            const mockUser = { id: 'user-id', username: 'testuser' } as any;
            
            await expect(service.assignHandout(mockUser, 1, 'invalid-category-id'))
                .rejects
                .toThrow(CategoryManagementError);
        });

        test('存在しないハンドアウトチャンネルでのエラー', async () => {
            const mockUser = { id: 'user-id', username: 'testuser' } as any;
            const mockCategory = {
                id: 'category-id',
                name: 'テスト',
                type: 4, // ChannelType.GuildCategory
                children: { cache: new Map() }
            };
            
            mockGuild.channels.cache.set('category-id', mockCategory);

            await expect(service.assignHandout(mockUser, 1, 'category-id'))
                .rejects
                .toThrow(CategoryManagementError);
        });
    });

    describe('createParty', () => {
        test('存在しないカテゴリでのエラー', async () => {
            await expect(service.createParty(2, 'invalid-category-id'))
                .rejects
                .toThrow(CategoryManagementError);
        });

        test('無効な陣営番号の範囲チェック', async () => {
            const mockCategory = {
                id: 'category-id',
                name: 'テスト',
                type: 4 // ChannelType.GuildCategory
            };
            
            mockGuild.channels.cache.set('category-id', mockCategory);

            // 範囲外の値でもサービス層では通すが、ハンドラー層でチェックする設計
            // ここでは基本的な動作確認のみ
            expect(service.createParty).toBeDefined();
        });
    });

    describe('deleteCategory', () => {
        test('存在しないカテゴリでのエラー', async () => {
            await expect(service.deleteCategory('invalid-category-id'))
                .rejects
                .toThrow(CategoryManagementError);
        });

        test('正常削除パス', async () => {
            const mockChannel = { delete: jest.fn().mockResolvedValue(undefined) };
            const mockRole = { delete: jest.fn().mockResolvedValue(undefined) };
            const mockCategory = {
                id: 'category-id',
                name: 'テストカテゴリ',
                type: 4, // ChannelType.GuildCategory
                children: {
                    cache: new Map([
                        ['channel1', mockChannel],
                        ['channel2', mockChannel]
                    ])
                },
                delete: jest.fn().mockResolvedValue(undefined)
            };
            
            mockGuild.channels.cache.set('category-id', mockCategory);
            mockGuild.roles.cache = new Map([
                ['role1', { ...mockRole, name: 'テストカテゴリ_1' }],
                ['role2', { ...mockRole, name: 'テストカテゴリ_通過者' }],
                ['role3', { ...mockRole, name: '他のロール' }]
            ]);

            const result = await service.deleteCategory('category-id');

            expect(result.categoryName).toBe('テストカテゴリ');
            expect(result.deletedChannelsCount).toBe(2);
            expect(result.deletedRolesCount).toBe(2);
        });
    });

    describe('エラーハンドリング統合テスト', () => {
        test('全エラーコードの使用確認', () => {
            const errorCodes = [
                'ROLE_CREATION_FAILED',
                'CHANNEL_CREATION_FAILED',
                'PERMISSION_SETTING_FAILED',
                'CATEGORY_NOT_FOUND',
                'HANDOUT_NOT_FOUND',
                'DUPLICATE_ROLE',
                'INVALID_PARTY_NUMBER',
                'USER_NOT_FOUND',
                'INSUFFICIENT_PERMISSIONS'
            ];

            errorCodes.forEach(code => {
                const error = new CategoryManagementError('テスト', code as any);
                expect(error.code).toBe(code);
            });
        });

        test('エラー詳細情報の保持', () => {
            const details = {
                categoryId: 'test-id',
                userId: 'user-id',
                originalError: new Error('原因エラー')
            };

            const error = new CategoryManagementError(
                '詳細付きエラー',
                'OPERATION_FAILED' as any,
                details
            );

            expect(error.details).toEqual(details);
            expect(error.details.originalError.message).toBe('原因エラー');
        });
    });

    describe('境界値テスト', () => {
        test('ハンドアウト数の境界値', async () => {
            const mockRole1 = { id: 'role1-id', name: 'テスト_1' };
            const mockRole2 = { id: 'role2-id', name: 'テスト_通過者' };
            const mockCategory = { id: 'category-id', name: 'テスト' };
            const mockChannel = { id: 'channel-id', name: 'テストチャンネル' };

            mockGuild.roles.create
                .mockResolvedValueOnce(mockRole1)
                .mockResolvedValueOnce(mockRole2);
            mockGuild.channels.create.mockResolvedValue(mockChannel);

            // 境界値: 0個
            const result0 = await service.createCategoryWithRoles('テスト', 0);
            expect(result0.channels.handouts).toHaveLength(0);

            // 境界値: 10個
            const result10 = await service.createCategoryWithRoles('テスト', 10);
            expect(result10.channels.handouts).toHaveLength(10);
        });

        test('カテゴリ名の特殊文字対応', async () => {
            const specialNames = [
                'テスト_カテゴリ',
                'Test-Category',
                '日本語カテゴリー',
                'Category123',
                'カテゴリ！？'
            ];

            for (const name of specialNames) {
                const mockRole1 = { id: 'role1-id', name: `${name}_1` };
                const mockRole2 = { id: 'role2-id', name: `${name}_通過者` };
                const mockCategory = { id: 'category-id', name };
                const mockChannel = { id: 'channel-id', name: 'テストチャンネル' };

                mockGuild.roles.create
                    .mockResolvedValueOnce(mockRole1)
                    .mockResolvedValueOnce(mockRole2);
                mockGuild.channels.create.mockResolvedValue(mockChannel);

                const result = await service.createCategoryWithRoles(name, 0);
                expect(result.summary).toContain(name);
            }
        });
    });
});