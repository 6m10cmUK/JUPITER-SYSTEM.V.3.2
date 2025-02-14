export type StatKey = 'str' | 'con' | 'pow' | 'dex' | 'app' | 'siz' | 'int' | 'edu' | 'luc';

export const statOrder: StatKey[] = ['str', 'con', 'pow', 'dex', 'app', 'siz', 'int', 'edu', 'luc'];

export interface StatusData {
    str: number;
    con: number;
    pow: number;
    dex: number;
    app: number;
    siz: number;
    int: number;
    edu: number;
    luc: number;
    details: {
        [key: string]: string;
    };
}