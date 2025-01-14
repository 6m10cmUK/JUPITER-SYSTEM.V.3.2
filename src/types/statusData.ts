export type StatKey = 'str' | 'con' | 'pow' | 'dex' | 'app' | 'siz' | 'int' | 'edu';

export const statOrder: StatKey[] = ['str', 'con', 'pow', 'dex', 'app', 'siz', 'int', 'edu'];

export interface StatusData {
    str: number;
    con: number;
    pow: number;
    dex: number;
    app: number;
    siz: number;
    int: number;
    edu: number;
    details: {
        [key: string]: string;
    };
}