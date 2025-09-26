import { CommandHandler } from '../../interfaces/patterns/CommandPatterns';
import { StatusCommandHandler } from '../commands/handlers/StatusCommandHandler';
import { RollCommandHandler } from '../commands/handlers/RollCommandHandler';
import { FeatureCommandHandler } from '../commands/handlers/FeatureCommandHandler';
import { JobCommandHandler } from '../commands/handlers/JobCommandHandler';
import { NinpoCommandHandler } from '../commands/handlers/NinpoCommandHandler';
import { ChoiceCommandHandler } from '../commands/handlers/ChoiceCommandHandler';
import { NameCommandHandler } from '../commands/handlers/NameCommandHandler';
import { ScheduleCommandHandler } from '../commands/handlers/ScheduleCommandHandler';

/**
 * コマンドハンドラーファクトリー（Dependency Injection）
 * 統一されたハンドラー生成とシングルトン管理
 */
export class CommandHandlerFactory {
    private static instances = new Map<string, CommandHandler>();

    /**
     * 指定されたハンドラー型のインスタンスを取得
     * @param handlerType ハンドラークラス
     * @param dependencies 依存関係（オプション）
     * @returns ハンドラーインスタンス
     */
    static create<T extends CommandHandler>(
        handlerType: new (...args: any[]) => T,
        dependencies?: any[]
    ): T {
        const handlerName = handlerType.name;
        
        // シングルトンパターンでインスタンス管理
        if (!this.instances.has(handlerName)) {
            const instance = new handlerType(...(dependencies || []));
            this.instances.set(handlerName, instance);
        }
        
        return this.instances.get(handlerName) as T;
    }

    /**
     * 事前定義されたハンドラーを取得（型安全）
     * @param handlerName ハンドラー名
     * @returns ハンドラーインスタンス
     */
    static getHandler(handlerName: string): CommandHandler | undefined {
        return this.instances.get(handlerName);
    }

    /**
     * コマンド名からハンドラーを取得
     * @param commandName コマンド名
     * @returns ハンドラーインスタンス
     */
    static getHandlerByCommandName(commandName: string): CommandHandler {
        switch (commandName) {
            case 'status':
                return this.create(StatusCommandHandler);
            case 'roll':
                return this.create(RollCommandHandler);
            case 'feature':
                return this.create(FeatureCommandHandler);
            case 'job':
                return this.create(JobCommandHandler);
            case 'ninpo':
                return this.create(NinpoCommandHandler);
            case 'choice':
                return this.create(ChoiceCommandHandler);
            case 'name':
                return this.create(NameCommandHandler);
            case 'schedule':
                return this.create(ScheduleCommandHandler);
            default:
                throw new Error(`No handler found for command: ${commandName}`);
        }
    }

    /**
     * 全ハンドラーのプリロード（起動時最適化）
     */
    static preloadHandlers(): void {
        const handlerClasses = [
            StatusCommandHandler,
            RollCommandHandler,
            FeatureCommandHandler,
            JobCommandHandler,
            NinpoCommandHandler,
            ChoiceCommandHandler,
            NameCommandHandler,
            ScheduleCommandHandler
        ];

        handlerClasses.forEach(handlerClass => {
            this.create(handlerClass);
        });

        console.log(`Preloaded ${handlerClasses.length} command handlers`);
    }

    /**
     * キャッシュクリア（テスト用）
     */
    static clearCache(): void {
        this.instances.clear();
    }

    /**
     * インスタンス統計情報を取得
     */
    static getStats(): {
        totalHandlers: number;
        handlerNames: string[];
    } {
        return {
            totalHandlers: this.instances.size,
            handlerNames: Array.from(this.instances.keys())
        };
    }
}