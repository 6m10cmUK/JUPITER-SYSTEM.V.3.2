export abstract class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class DiceExpressionError extends DomainError {
    constructor(expression: string, reason: string) {
        super(`Invalid dice expression "${expression}": ${reason}`);
    }
}

export class CommandExecutionError extends DomainError {
    constructor(commandName: string, reason: string) {
        super(`Failed to execute command "${commandName}": ${reason}`);
    }
}

export class RepositoryError extends DomainError {
    constructor(operation: string, reason: string) {
        super(`Repository operation "${operation}" failed: ${reason}`);
    }
}