/**
 * OData query builder utilities
 */

export class ODataQueryBuilder {
  private filters: string[] = [];
  private selects: string[] = [];
  private expands: string[] = [];
  private orderBy: string[] = [];
  private topValue?: number;
  private skipValue?: number;

  filter(condition: string): this {
    this.filters.push(condition);
    return this;
  }

  select(...fields: string[]): this {
    this.selects.push(...fields);
    return this;
  }

  expand(...relations: string[]): this {
    this.expands.push(...relations);
    return this;
  }

  orderByAsc(field: string): this {
    this.orderBy.push(`${field} asc`);
    return this;
  }

  orderByDesc(field: string): this {
    this.orderBy.push(`${field} desc`);
    return this;
  }

  top(value: number): this {
    this.topValue = value;
    return this;
  }

  skip(value: number): this {
    this.skipValue = value;
    return this;
  }

  build(): string {
    const params: string[] = [];

    if (this.filters.length > 0) {
      params.push(`$filter=${this.filters.join(' and ')}`);
    }

    if (this.selects.length > 0) {
      params.push(`$select=${this.selects.join(',')}`);
    }

    if (this.expands.length > 0) {
      params.push(`$expand=${this.expands.join(',')}`);
    }

    if (this.orderBy.length > 0) {
      params.push(`$orderby=${this.orderBy.join(',')}`);
    }

    if (this.topValue !== undefined) {
      params.push(`$top=${this.topValue}`);
    }

    if (this.skipValue !== undefined) {
      params.push(`$skip=${this.skipValue}`);
    }

    return params.join('&');
  }
}

export function escapeODataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function formatODataDate(date: Date): string {
  return date.toISOString();
}