import { Guild } from 'discord.js';

// Handlers
import { StatusCommandHandler } from '../commands/handlers/StatusCommandHandler';
import { RollCommandHandler } from '../commands/handlers/RollCommandHandler';
import { JobCommandHandler } from '../commands/handlers/JobCommandHandler';
import { NinpoCommandHandler } from '../commands/handlers/NinpoCommandHandler';
import { DensukeCommandHandler } from '../commands/handlers/densukeCommandHandler';
import { CategoryCommandHandler } from '../commands/handlers/CategoryCommandHandler';
import { TableCommandHandler } from '../commands/handlers/TableCommandHandler';
import { MeigenCommandHandler } from '../commands/handlers/MeigenCommandHandler';

// Dependencies - Application layer
import { GenerateStatusUseCase } from '../../application/use-cases/status/GenerateStatusUseCase';
import { RollDiceUseCase } from '../../application/use-cases/dice/RollDiceUseCase';

// Dependencies - Domain layer
import { DiceService } from '../../domain/services/DiceService';
import { HolidayService } from '../../domain/services/holidayService';
import { CategoryManagementService } from '../../domain/services/CategoryManagementService';
import { ChannelLogService } from '../../domain/services/ChannelLogService';

// Dependencies - Presentation layer
import { StatusEmbedFormatter } from '../../presentation/formatters/StatusEmbedFormatter';
import { DiceEmbedFormatter } from '../../presentation/formatters/DiceEmbedFormatter';
import { JobEmbedFormatter } from '../../presentation/formatters/JobEmbedFormatter';
import { NinpoEmbedFormatter } from '../../presentation/formatters/NinpoEmbedFormatter';
import { DensukeEmbedFormatter } from '../../presentation/formatters/densukeEmbedFormatter';

/** Guild依存サービスの遅延生成ファクトリ型 */
export type GuildServiceFactory<T> = (guild: Guild) => T;

/**
 * 型安全なコマンドハンドラーファクトリ関数群
 * 各ハンドラーの依存関係を明示的に組み立てる
 */

export function createStatusCommandHandler(): StatusCommandHandler {
    const useCase = new GenerateStatusUseCase();
    const formatter = new StatusEmbedFormatter();
    return new StatusCommandHandler(useCase, formatter);
}

export function createRollCommandHandler(): RollCommandHandler {
    const diceService = new DiceService();
    const useCase = new RollDiceUseCase(diceService);
    const formatter = new DiceEmbedFormatter();
    return new RollCommandHandler(useCase, formatter);
}

export function createJobCommandHandler(): JobCommandHandler {
    const formatter = new JobEmbedFormatter();
    return new JobCommandHandler(formatter);
}

export function createNinpoCommandHandler(): NinpoCommandHandler {
    const formatter = new NinpoEmbedFormatter();
    return new NinpoCommandHandler(formatter);
}

export function createDensukeCommandHandler(): DensukeCommandHandler {
    const holidayService = new HolidayService();
    const formatter = new DensukeEmbedFormatter();
    return new DensukeCommandHandler(holidayService, formatter);
}

export function createCategoryCommandHandler(): CategoryCommandHandler {
    return new CategoryCommandHandler(
        (guild: Guild) => new CategoryManagementService(guild)
    );
}

export function createTableCommandHandler(): TableCommandHandler {
    return new TableCommandHandler(
        (guild: Guild) => new CategoryManagementService(guild),
        (guild: Guild) => new ChannelLogService(guild)
    );
}

export function createMeigenCommandHandler(): MeigenCommandHandler {
    return new MeigenCommandHandler();
}
