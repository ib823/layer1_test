/**
 * OData query builder utilities
 */
export declare class ODataQueryBuilder {
    private filters;
    private selects;
    private expands;
    private orderBy;
    private topValue?;
    private skipValue?;
    filter(condition: string): this;
    select(...fields: string[]): this;
    expand(...relations: string[]): this;
    orderByAsc(field: string): this;
    orderByDesc(field: string): this;
    top(value: number): this;
    skip(value: number): this;
    build(): string;
}
export declare function escapeODataString(value: string): string;
export declare function formatODataDate(date: Date): string;
//# sourceMappingURL=odata.d.ts.map