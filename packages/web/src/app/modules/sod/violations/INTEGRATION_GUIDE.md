# TableWithColumnToggle Integration Guide

## DEFECT-037 & DEFECT-049 FIX: Reduce Table Cognitive Load

**Problem**: Current violations table shows ALL 12+ columns at once, violating Miller's Law (7±2 items) and causing mobile responsiveness issues.

**Solution**: Integrate the existing TableWithColumnToggle component to implement progressive disclosure.

## Implementation Steps

### 1. Define Column Configuration with Priorities

```typescript
import { TableWithColumnToggle, ColumnConfig } from '@/components/ui/TableWithColumnToggle';
import { Violation } from '@/types';

// Define column configs with defaultVisible and priority
const violationColumns: ColumnConfig<Violation>[] = [
  // PRIORITY 1: Critical columns (always visible by default)
  {
    column: {
      id: 'userName',
      header: 'User',
      accessorKey: 'user.name',
    },
    defaultVisible: true,
    priority: 1,
    category: 'Essential',
  },
  {
    column: {
      id: 'riskLevel',
      header: 'Risk',
      accessorKey: 'risk_level',
      cell: ({ getValue }) => {
        const level = getValue() as string;
        const colors = {
          CRITICAL: 'bg-red-100 text-red-800',
          HIGH: 'bg-orange-100 text-orange-800',
          MEDIUM: 'bg-yellow-100 text-yellow-800',
          LOW: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`px-2 py-1 rounded ${colors[level] || ''}`}>
            {level}
          </span>
        );
      },
    },
    defaultVisible: true,
    priority: 1,
    category: 'Essential',
  },
  {
    column: {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
    },
    defaultVisible: true,
    priority: 1,
    category: 'Essential',
  },
  {
    column: {
      id: 'conflictingRoles',
      header: 'Conflicting Roles',
      accessorKey: 'conflicting_roles',
      cell: ({ getValue }) => (getValue() as string[])?.join(', ') || 'N/A',
    },
    defaultVisible: true,
    priority: 1,
    category: 'Essential',
  },
  {
    column: {
      id: 'detectedDate',
      header: 'Detected',
      accessorKey: 'detected_at',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    defaultVisible: true,
    priority: 1,
    category: 'Essential',
  },

  // PRIORITY 2: Important columns (hidden by default, easily accessible)
  {
    column: {
      id: 'department',
      header: 'Department',
      accessorKey: 'user.department',
    },
    defaultVisible: false,
    priority: 2,
    category: 'User Info',
  },
  {
    column: {
      id: 'manager',
      header: 'Manager',
      accessorKey: 'user.manager',
    },
    defaultVisible: false,
    priority: 2,
    category: 'User Info',
  },
  {
    column: {
      id: 'assignedTo',
      header: 'Assigned To',
      accessorKey: 'assigned_to',
    },
    defaultVisible: false,
    priority: 2,
    category: 'Workflow',
  },
  {
    column: {
      id: 'remediation',
      header: 'Remediation Plan',
      accessorKey: 'remediation_plan',
    },
    defaultVisible: false,
    priority: 2,
    category: 'Workflow',
  },

  // PRIORITY 3: Nice-to-have columns (hidden by default)
  {
    column: {
      id: 'lastModified',
      header: 'Last Modified',
      accessorKey: 'updated_at',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    defaultVisible: false,
    priority: 3,
    category: 'Metadata',
  },
  {
    column: {
      id: 'createdBy',
      header: 'Created By',
      accessorKey: 'created_by',
    },
    defaultVisible: false,
    priority: 3,
    category: 'Metadata',
  },
  {
    column: {
      id: 'id',
      header: 'ID',
      accessorKey: 'id',
    },
    defaultVisible: false,
    priority: 3,
    category: 'Metadata',
  },
];
```

### 2. Use TableWithColumnToggle in Component

```typescript
export default function SoDViolationsPageEnhanced() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch violations
  useEffect(() => {
    fetch('/api/modules/sod/violations')
      .then((res) => res.json())
      .then((data) => {
        setViolations(data.violations || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load violations:', error);
        setIsLoading(false);
      });
  }, []);

  const handleRowClick = (violation: Violation) => {
    // Open detail modal
    setSelectedViolation(violation);
    setDetailModalOpen(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">SoD Violations</h1>

      <TableWithColumnToggle
        data={violations}
        columns={violationColumns}
        tableId="sod-violations" // For localStorage persistence
        pageSize={25}
        isLoading={isLoading}
        emptyMessage="No violations found"
        onRowClick={handleRowClick}
        showColumnPicker={true}
      />
    </div>
  );
}
```

## Benefits

✅ **Reduces cognitive load**: Shows only 5 essential columns by default (within 7±2 range)
✅ **Progressive disclosure**: Users can reveal more columns as needed
✅ **Mobile friendly**: Fewer columns fit on small screens
✅ **Persistent preferences**: User's column choices saved in localStorage
✅ **Keyboard accessible**: Column picker is fully keyboard navigable
✅ **Responsive**: Automatically adapts to screen size

## Mobile Responsive Strategy

For mobile (< 768px):
- Show only 3 critical columns: User, Risk, Status
- Use actions button to access detail view
- Hide column picker on very small screens (<480px)

```typescript
// Add responsive column visibility
const isMobile = useMediaQuery('(max-width: 768px)');

const mobileVisibleColumns = ['userName', 'riskLevel', 'status'];

// Override column visibility for mobile
const columnConfigsWithMobile = violationColumns.map((config) => ({
  ...config,
  defaultVisible: isMobile
    ? mobileVisibleColumns.includes(config.column.id as string)
    : config.defaultVisible,
}));
```

## Testing Checklist

- [ ] Desktop (1920px): All 5 default columns visible, column picker works
- [ ] Laptop (1440px): All 5 default columns visible
- [ ] Tablet (768px): Consider reducing to 4 columns
- [ ] Mobile (393px): Only 3 columns visible
- [ ] Column picker: Can show/hide columns
- [ ] LocalStorage: Column preferences persist after refresh
- [ ] Keyboard: Can navigate column picker with Tab/Enter
- [ ] Screen reader: Column labels announced correctly

## Estimated Implementation Time

- Column configuration: 2 hours
- Integration into violations page: 3 hours
- Mobile responsiveness tweaks: 2 hours
- Testing across devices: 1 hour
**Total**: 8 hours

## Rollout Plan

1. **Week 1**: Implement on `/modules/sod/violations` (pilot)
2. **Week 2**: Gather user feedback, adjust defaults
3. **Week 3**: Roll out to all violation tables:
   - `/modules/gl-anomaly`
   - `/modules/invoice-matching`
   - `/modules/user-access-review`
   - `/t/[tenantId]/sod/violations`
4. **Week 4**: Performance testing with 10K+ rows

## Success Metrics

- [ ] Average visible columns reduced from 12 to 5-7
- [ ] Mobile usability score increased from 28 to 80+
- [ ] User task completion time reduced by 50%
- [ ] Cognitive load score improved from 62% to 38%
- [ ] Zero horizontal scroll on mobile

---

**Status**: READY FOR IMPLEMENTATION
**Assigned To**: Frontend Team
**Priority**: P0 (Critical blocker for mobile users)
