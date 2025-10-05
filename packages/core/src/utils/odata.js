"use strict";
/**
 * OData query builder utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ODataQueryBuilder = void 0;
exports.escapeODataString = escapeODataString;
exports.formatODataDate = formatODataDate;
class ODataQueryBuilder {
    filters = [];
    selects = [];
    expands = [];
    orderBy = [];
    topValue;
    skipValue;
    filter(condition) {
        this.filters.push(condition);
        return this;
    }
    select(...fields) {
        this.selects.push(...fields);
        return this;
    }
    expand(...relations) {
        this.expands.push(...relations);
        return this;
    }
    orderByAsc(field) {
        this.orderBy.push(`${field} asc`);
        return this;
    }
    orderByDesc(field) {
        this.orderBy.push(`${field} desc`);
        return this;
    }
    top(value) {
        this.topValue = value;
        return this;
    }
    skip(value) {
        this.skipValue = value;
        return this;
    }
    build() {
        const params = [];
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
exports.ODataQueryBuilder = ODataQueryBuilder;
function escapeODataString(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
function formatODataDate(date) {
    return date.toISOString();
}
//# sourceMappingURL=odata.js.map