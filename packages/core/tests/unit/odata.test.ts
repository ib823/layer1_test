import { ODataQueryBuilder, escapeODataString } from '../../src/utils/odata';

describe('OData Utilities', () => {
  describe('escapeODataString', () => {
    it('should escape single quotes', () => {
      expect(escapeODataString("O'Reilly")).toBe("'O''Reilly'");
    });

    it('should handle strings without special characters', () => {
      expect(escapeODataString('test')).toBe("'test'");
    });

    it('should handle empty strings', () => {
      expect(escapeODataString('')).toBe("''");
    });

    it('should handle multiple quotes', () => {
      expect(escapeODataString("It's O'Reilly's book")).toBe("'It''s O''Reilly''s book'");
    });
  });

  describe('ODataQueryBuilder', () => {
    let builder: ODataQueryBuilder;

    beforeEach(() => {
      builder = new ODataQueryBuilder();
    });

    describe('build', () => {
      it('should return empty string when no parameters set', () => {
        expect(builder.build()).toBe('');
      });
    });

    describe('select', () => {
      it('should add $select parameter with single field', () => {
        const result = builder.select('name').build();
        expect(result).toBe('$select=name');
      });

      it('should add $select parameter with multiple fields', () => {
        const result = builder.select('name', 'email', 'role').build();
        expect(result).toBe('$select=name,email,role');
      });

      it('should chain multiple select calls', () => {
        const result = builder.select('name').select('email').build();
        expect(result).toContain('$select=name,email');
      });
    });

    describe('filter', () => {
      it('should add $filter parameter', () => {
        const result = builder.filter('status eq ACTIVE').build();
        expect(result).toBe('$filter=status eq ACTIVE');
      });

      it('should handle multiple filter conditions', () => {
        const result = builder
          .filter('status eq ACTIVE')
          .filter('age gt 18')
          .build();
        expect(result).toBe('$filter=status eq ACTIVE and age gt 18');
      });

      it('should combine multiple filters with and', () => {
        const result = builder
          .filter('status eq ACTIVE')
          .filter('role eq ADMIN')
          .build();
        expect(result).toContain('$filter=');
        expect(result).toContain(' and ');
      });
    });

    describe('orderBy', () => {
      it('should support ascending order', () => {
        const result = builder.orderByAsc('created_at').build();
        expect(result).toBe('$orderby=created_at asc');
      });

      it('should support descending order', () => {
        const result = builder.orderByDesc('created_at').build();
        expect(result).toBe('$orderby=created_at desc');
      });

      it('should support multiple order by fields', () => {
        const result = builder
          .orderByAsc('name')
          .orderByDesc('created_at')
          .build();
        expect(result).toContain('$orderby=');
        expect(result).toContain('name asc');
        expect(result).toContain('created_at desc');
      });
    });

    describe('top', () => {
      it('should add $top parameter', () => {
        const result = builder.top(10).build();
        expect(result).toBe('$top=10');
      });

      it('should handle different values', () => {
        const result = builder.top(20).build();
        expect(result).toBe('$top=20');
      });
    });

    describe('skip', () => {
      it('should add $skip parameter', () => {
        const result = builder.skip(5).build();
        expect(result).toBe('$skip=5');
      });

      it('should handle pagination offset', () => {
        const result = builder.skip(10).build();
        expect(result).toBe('$skip=10');
      });
    });

    describe('expand', () => {
      it('should add $expand parameter with single navigation', () => {
        const result = builder.expand('orders').build();
        expect(result).toBe('$expand=orders');
      });

      it('should add $expand parameter with multiple navigations', () => {
        const result = builder.expand('orders', 'addresses').build();
        expect(result).toBe('$expand=orders,addresses');
      });

      it('should chain multiple expand calls', () => {
        const result = builder.expand('orders').expand('addresses').build();
        expect(result).toContain('$expand=orders,addresses');
      });
    });

    describe('chaining', () => {
      it('should support chaining multiple operations', () => {
        const result = builder
          .select('name', 'email')
          .filter('status eq ACTIVE')
          .orderByDesc('created_at')
          .top(10)
          .skip(20)
          .build();

        expect(result).toContain('$select=name,email');
        expect(result).toContain('$filter=status eq ACTIVE');
        expect(result).toContain('$orderby=created_at desc');
        expect(result).toContain('$top=10');
        expect(result).toContain('$skip=20');
      });

      it('should properly concatenate parameters with &', () => {
        const result = builder
          .select('name')
          .filter('active eq true')
          .top(5)
          .build();

        const parts = result.split('&');
        expect(parts).toHaveLength(3);
        expect(result).toContain('$select=name');
        expect(result).toContain('$filter=active eq true');
        expect(result).toContain('$top=5');
      });
    });

    describe('pagination', () => {
      it('should support pagination with top and skip', () => {
        const page = 2;
        const pageSize = 20;
        const result = builder
          .top(pageSize)
          .skip((page - 1) * pageSize)
          .build();

        expect(result).toContain('$top=20');
        expect(result).toContain('$skip=20');
      });

      it('should build query for first page', () => {
        const result = builder.top(10).skip(0).build();
        expect(result).toContain('$top=10');
        expect(result).toContain('$skip=0');
      });
    });

    describe('complex queries', () => {
      it('should build comprehensive OData query', () => {
        const result = builder
          .select('id', 'name', 'status')
          .filter('status eq ACTIVE')
          .filter('created_at gt 2024-01-01')
          .orderByDesc('created_at')
          .expand('orders', 'profile')
          .top(25)
          .skip(50)
          .build();

        expect(result).toContain('$filter=');
        expect(result).toContain('$select=');
        expect(result).toContain('$orderby=');
        expect(result).toContain('$expand=');
        expect(result).toContain('$top=25');
        expect(result).toContain('$skip=50');
      });
    });
  });
});
