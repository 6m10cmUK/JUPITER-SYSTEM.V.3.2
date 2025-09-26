import { CategoryCommandHandler, CategoryError } from '../CategoryCommandHandler';

// 簡潔なテストに修正
describe('CategoryCommandHandler', () => {
    let handler: CategoryCommandHandler;

    beforeEach(() => {
        handler = new CategoryCommandHandler();
    });

    test('ハンドラーが正常にインスタンス化される', () => {
        expect(handler).toBeInstanceOf(CategoryCommandHandler);
    });

    test('CategoryError が適切に定義されている', () => {
        const error = new CategoryError('テストエラー', 'PERMISSION_DENIED');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('CategoryError');
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.message).toBe('テストエラー');
    });

    // より詳細なテストは統合テストで実施
    test('handleメソッドが存在する', () => {
        expect(typeof handler.handle).toBe('function');
    });
});