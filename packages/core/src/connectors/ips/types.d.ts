export interface IPSUser {
    id: string;
    userName: string;
    name?: {
        givenName?: string;
        familyName?: string;
    };
    emails?: Array<{
        value: string;
        primary?: boolean;
    }>;
    active: boolean;
    groups?: string[];
}
export interface IPSGroup {
    id: string;
    displayName: string;
    members?: Array<{
        value: string;
        $ref: string;
        display?: string;
    }>;
}
export interface IPSQueryOptions {
    filter?: string;
    attributes?: string[];
    startIndex?: number;
    count?: number;
}
export interface IPSListResponse<T> {
    schemas: string[];
    totalResults: number;
    startIndex: number;
    itemsPerPage: number;
    Resources: T[];
}
//# sourceMappingURL=types.d.ts.map