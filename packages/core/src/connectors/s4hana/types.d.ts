export interface S4HANAUser {
    UserID: string;
    UserName: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
    IsLocked?: boolean;
    ValidFrom?: string;
    ValidTo?: string;
}
export interface S4HANARole {
    RoleID: string;
    RoleName: string;
    Description?: string;
    RoleType?: string;
}
export interface S4HANAUserRole {
    UserID: string;
    RoleID: string;
    ValidFrom: string;
    ValidTo: string;
    AssignmentDate?: string;
}
export interface S4HANAQueryOptions {
    filter?: string;
    select?: string[];
    expand?: string[];
    top?: number;
    skip?: number;
    orderBy?: string;
}
export interface S4HANAODataResponse<T> {
    d: {
        results: T[];
        __count?: number;
    };
}
export interface S4HANABatchRequest {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: any;
}
export interface S4HANABatchResponse {
    status: number;
    headers: Record<string, string>;
    body: any;
}
//# sourceMappingURL=types.d.ts.map