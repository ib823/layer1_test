# Role-Based Access Control (RBAC) Architecture

## Overview

This document outlines the Role-Based Access Control implementation for the SAP GRC Platform using Ant Design components.

## Role Hierarchy

```
┌─────────────────────────────────────────────┐
│              System Admin                    │
│  - Full system access                        │
│  - Manage all tenants                        │
│  - Configure connectors                      │
│  - View all analytics                        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│           Tenant Admin                       │
│  - Manage tenant users                       │
│  - Configure tenant settings                 │
│  - Run SoD analysis                          │
│  - View tenant analytics                     │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│         Compliance Manager                   │
│  - View SoD violations                       │
│  - Generate reports                          │
│  - Review user access                        │
│  - Create remediation tasks                  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│           Auditor                            │
│  - Read-only access                          │
│  - View violations                           │
│  - Export reports                            │
│  - View analytics (read-only)                │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│              User                            │
│  - View own access                           │
│  - View assigned violations                  │
│  - Request access changes                    │
└─────────────────────────────────────────────┘
```

## Role Definitions

### 1. System Admin
**Role ID**: `system_admin`

**Permissions**:
- `system:*` - Full system access
- `tenants:*` - Manage all tenants
- `connectors:*` - Configure SAP connectors
- `users:*` - Manage all users
- `analytics:view` - View all analytics
- `settings:*` - Modify system settings

**Routes**:
- `/admin/*` - All admin pages
- `/dashboard` - System-wide dashboard
- `/analytics` - Global analytics
- `/tenants` - Tenant management
- `/connectors` - Connector configuration

---

### 2. Tenant Admin
**Role ID**: `tenant_admin`

**Permissions**:
- `tenant:manage` - Manage own tenant
- `users:manage` - Manage tenant users
- `sod:run` - Execute SoD analysis
- `violations:view` - View all violations
- `reports:generate` - Generate reports
- `analytics:view` - View tenant analytics

**Routes**:
- `/dashboard` - Tenant dashboard
- `/users` - User management
- `/violations` - SoD violations
- `/analytics` - Tenant analytics
- `/settings` - Tenant settings

---

### 3. Compliance Manager
**Role ID**: `compliance_manager`

**Permissions**:
- `violations:view` - View violations
- `violations:remediate` - Create remediation tasks
- `reports:generate` - Generate reports
- `users:view` - View user access
- `analytics:view` - View analytics

**Routes**:
- `/dashboard` - Compliance dashboard
- `/violations` - SoD violations
- `/users` - View users (read-only)
- `/analytics` - Compliance analytics
- `/reports` - Report generation

---

### 4. Auditor
**Role ID**: `auditor`

**Permissions**:
- `violations:view` - View violations (read-only)
- `users:view` - View user access (read-only)
- `reports:export` - Export reports
- `analytics:view` - View analytics (read-only)
- `audit:log` - View audit logs

**Routes**:
- `/dashboard` - Audit dashboard (read-only)
- `/violations` - View violations (read-only)
- `/users` - View users (read-only)
- `/analytics` - View analytics (read-only)
- `/audit-logs` - Audit trail

---

### 5. User
**Role ID**: `user`

**Permissions**:
- `profile:view` - View own profile
- `profile:update` - Update own profile
- `violations:view-own` - View own violations
- `access:request` - Request access changes

**Routes**:
- `/profile` - User profile
- `/my-violations` - Own violations
- `/access-requests` - Access request form

---

## Permission Matrix

| Feature | System Admin | Tenant Admin | Compliance Mgr | Auditor | User |
|---------|--------------|--------------|----------------|---------|------|
| Manage Tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure Connectors | ✅ | ❌ | ❌ | ❌ | ❌ |
| Run SoD Analysis | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Violations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Remediate Violations | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Own Violations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request Access | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Implementation Strategy

### Frontend (Next.js + Ant Design)

#### 1. Authentication Flow

```typescript
// packages/web/src/lib/auth/AuthContext.tsx
interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
```

#### 2. Protected Routes

```typescript
// packages/web/src/components/auth/ProtectedRoute.tsx
<ProtectedRoute
  allowedRoles={['system_admin', 'tenant_admin']}
  fallback="/unauthorized"
>
  <AdminDashboard />
</ProtectedRoute>
```

#### 3. Permission-Based Components

```typescript
// packages/web/src/components/auth/Can.tsx
<Can permission="violations:remediate">
  <Button>Create Remediation Task</Button>
</Can>

<Can role="system_admin">
  <ConnectorConfigPanel />
</Can>
```

#### 4. Page Structure

```
/login                    - Login page (Ant Design Form)
/unauthorized             - Access denied page
/admin/
  ├─ dashboard           - System admin dashboard
  ├─ tenants             - Tenant management
  ├─ connectors          - Connector configuration
  └─ system-settings     - System settings
/dashboard               - Role-based dashboard (redirects)
/violations              - SoD violations list
/violations/[id]         - Violation details
/users                   - User management
/users/[id]              - User details
/analytics               - Analytics dashboard
/reports                 - Report generation
/profile                 - User profile
/my-violations           - Current user's violations
/access-requests         - Access request form
```

---

## Backend Integration

### XSUAA Role Collections

Map roles to XSUAA role collections in SAP BTP:

```json
{
  "xs-security.json": {
    "scopes": [
      {
        "name": "$XSAPPNAME.system_admin",
        "description": "System Administrator"
      },
      {
        "name": "$XSAPPNAME.tenant_admin",
        "description": "Tenant Administrator"
      },
      {
        "name": "$XSAPPNAME.compliance_manager",
        "description": "Compliance Manager"
      },
      {
        "name": "$XSAPPNAME.auditor",
        "description": "Auditor"
      },
      {
        "name": "$XSAPPNAME.user",
        "description": "Regular User"
      }
    ],
    "role-collections": [
      {
        "name": "SAP_GRC_System_Admin",
        "role-template-references": ["$XSAPPNAME.system_admin"]
      },
      {
        "name": "SAP_GRC_Tenant_Admin",
        "role-template-references": ["$XSAPPNAME.tenant_admin"]
      },
      {
        "name": "SAP_GRC_Compliance_Manager",
        "role-template-references": ["$XSAPPNAME.compliance_manager"]
      },
      {
        "name": "SAP_GRC_Auditor",
        "role-template-references": ["$XSAPPNAME.auditor"]
      },
      {
        "name": "SAP_GRC_User",
        "role-template-references": ["$XSAPPNAME.user"]
      }
    ]
  }
}
```

### API Route Protection

```typescript
// Example: packages/api/src/routes/violations.ts
router.get('/violations',
  authenticate,
  requireRole('auditor'), // Minimum role required
  async (req, res) => {
    // Handler
  }
);

router.post('/violations/:id/remediate',
  authenticate,
  requireRole('compliance_manager'),
  async (req, res) => {
    // Handler
  }
);
```

---

## Ant Design Components to Use

### Login Page
- `Form` - Login form
- `Input` - Username/password fields
- `Input.Password` - Password field with visibility toggle
- `Button` - Submit button
- `Alert` - Error messages
- `Card` - Login container

### Admin Dashboard
- `Layout` (Sider, Header, Content, Footer) - Page layout
- `Menu` - Navigation menu
- `Breadcrumb` - Page breadcrumbs
- `Card` - Dashboard cards
- `Statistic` - KPI metrics
- `Table` - Data tables
- `Dropdown` - User menu
- `Avatar` - User avatar

### User Management
- `Table` - User list with sorting/filtering
- `Tag` - Role badges
- `Badge` - Status indicators
- `Modal` - Edit user dialog
- `Form` - User edit form
- `Select` - Role selector
- `Transfer` - Permission assignment

### Violations Page
- `Table` - Violations list
- `Descriptions` - Violation details
- `Steps` - Remediation workflow
- `Timeline` - Violation history
- `Drawer` - Violation detail panel

---

## Security Considerations

1. **Token Storage**: Store JWT in httpOnly cookies, not localStorage
2. **CSRF Protection**: Use CSRF tokens for state-changing operations
3. **Session Timeout**: Auto-logout after 30 minutes of inactivity
4. **Role Validation**: Always validate roles on backend, not just frontend
5. **Audit Logging**: Log all authentication and authorization events
6. **Multi-tenancy**: Ensure tenant isolation at all levels

---

## Next Steps

1. Install Ant Design and configure theme
2. Create authentication context and service
3. Build login page with Ant Design
4. Implement protected route wrapper
5. Create role-based dashboard layouts
6. Migrate existing components to Ant Design
7. Add permission checks to all UI components
8. Test RBAC with different role combinations
9. Deploy and configure XSUAA role collections

---

**Questions for Discussion:**

1. Should we support multi-role users (e.g., someone who is both Tenant Admin and Auditor)?
2. Do you need dynamic role assignment (roles changed at runtime)?
3. Should we implement field-level permissions (e.g., hide specific fields based on role)?
4. Do you want SSO integration beyond XSUAA (e.g., Azure AD, Okta)?
5. Should we track "last accessed" and show recently viewed items per role?
