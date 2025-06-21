export interface JobData {
    name: string;
    skill: string;
    point: string;
    detail: string;
}

export interface JobSearchCriteria {
    query: string;
    subcommand: 'all' | 'name' | 'skill' | 'point' | 'random';
    page: number;
    count?: number; // randomの場合のカウント
}

export interface JobDisplayData {
    title: string;
    jobs: JobData[];
    currentPage: number;
    maxPage: number;
}