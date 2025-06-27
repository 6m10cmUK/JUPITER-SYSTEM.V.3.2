export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: string;
    error?: Error;
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    error(message: string, context?: string, error?: Error): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    warn(message: string, context?: string): void {
        this.log(LogLevel.WARN, message, context);
    }

    info(message: string, context?: string): void {
        this.log(LogLevel.INFO, message, context);
    }

    debug(message: string, context?: string): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    private log(level: LogLevel, message: string, context?: string, error?: Error): void {
        if (level > this.logLevel) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            context,
            error
        };

        this.output(entry);
    }

    private output(entry: LogEntry): void {
        const timestamp = entry.timestamp.toISOString();
        const levelName = LogLevel[entry.level];
        const contextStr = entry.context ? `[${entry.context}]` : '';
        const baseMessage = `${timestamp} [${levelName}] ${contextStr} ${entry.message}`;

        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(baseMessage);
                if (entry.error) {
                    console.error(entry.error.stack);
                }
                break;
            case LogLevel.WARN:
                console.warn(baseMessage);
                break;
            case LogLevel.INFO:
                console.info(baseMessage);
                break;
            case LogLevel.DEBUG:
                console.debug(baseMessage);
                break;
        }
    }
}

// グローバルロガーインスタンス
export const logger = Logger.getInstance();