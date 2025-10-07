# Ant Design & RBAC Implementation Guide

## Overview

This guide documents the implementation of Ant Design UI framework and Role-Based Access Control (RBAC) system for the SAP GRC Platform.

---

## What Has Been Implemented

### 1. ✅ Ant Design Installation & Configuration

**Installed Packages:**
```bash
pnpm add antd @ant-design/icons @ant-design/nextjs-registry dayjs
```

**Configured in Root Layout:**
- `packages/web/src/app/layout.tsx` - Wrapped with AntdRegistry and ConfigProvider
- Custom theme with SAP GRC branding colors
- Responsive component sizes

---

### 2. ✅ Authentication System

**Files Created:**

#### `packages/web/src/types/auth.ts`
- Role enum (5 roles: System Admin, Tenant Admin, Compliance Manager, Auditor, User)
- Permission enum (20+ granular permissions)
- User interface and auth types
- Role-to-permission mapping
- Permission matching utility functions

#### `packages/web/src/lib/auth/authService.ts`
- Login/logout API calls
- Token management (localStorage + httpOnly cookies)
- Token refresh mechanism
- Development mode authentication
- getCurrentUser() method

#### `packages/web/src/lib/auth/AuthContext.tsx`
- React Context for auth state
- useAuth() hook
- Role and permission checking methods:
  - `hasRole(role)`
  - `hasPermission(permission)`
  - `hasAnyRole(roles[])`
  - `hasAllRoles(roles[])`
- Automatic redirect based on role after login

---

### 3. ✅ Protected Routes & Permission Components

#### `packages/web/src/components/auth/ProtectedRoute.tsx`
- Wraps pages/components requiring authentication
- Role-based access control
- Loading states
- Unauthorized (403) page
- HOC version: `withProtectedRoute()`

**Usage:**
```tsx
<ProtectedRoute allowedRoles={[Role.SYSTEM_ADMIN]}>
  <AdminPage />
</ProtectedRoute>
```

#### `packages/web/src/components/auth/Can.tsx`
- Permission-based rendering
- `<Can>` - Show if has role/permission
- `<Cannot>` - Show if doesn't have role/permission
- `<RoleSwitch>` & `<RoleCase>` - Different content per role

**Usage:**
```tsx
<Can permission={Permission.VIOLATIONS_REMEDIATE}>
  <Button>Remediate</Button>
</Can>

<RoleSwitch>
  <RoleCase roles={[Role.SYSTEM_ADMIN]}>
    <AdminDashboard />
  </RoleCase>
  <RoleCase roles={[Role.USER]} default>
    <UserDashboard />
  </RoleCase>
</RoleSwitch>
```

---

### 4. ✅ Login Page

**File:** `packages/web/src/app/login/page.tsx`

**Features:**
- Professional split-screen design
- Ant Design Form with validation
- Email and password inputs
- Development mode with role selector
- Error handling with Alert
- Animated branding section
- Responsive design
- "Forgot password" and "Help" links

**Development Mode:**
- Set `NEXT_PUBLIC_DEV_MODE=true` to enable
- Select role from dropdown
- Quick login without real backend

---

### 5. ✅ Dashboard Layout

**File:** `packages/web/src/components/layouts/DashboardLayout.tsx`

**Features:**
- Collapsible sidebar navigation
- Role-based menu items
- User avatar with dropdown menu
- Notification bell with badge
- Breadcrumb navigation
- Responsive design
- SAP GRC branding

**Menu Structure:**
- Dashboard (all roles)
- Administration (System Admin only)
  - Admin Dashboard
  - Tenants
  - Connectors
  - System Settings
- Users (Admin & Compliance Manager)
- Violations (All except User)
- Analytics (All except User)
- Reports (All except User)
- My Violations (User only)

---

### 6. ✅ Admin Dashboard Page

**File:** `packages/web/src/app/admin/dashboard/page.tsx`

**Features:**
- System-wide KPIs (Tenants, Users, Violations, Health)
- System resource monitoring (CPU, Memory, Database)
- Connector status overview
- Tenant management table
- Protected route for System Admin only

---

## File Structure

```
packages/web/src/
├── types/
│   └── auth.ts                        # Auth types & enums
├── lib/
│   └── auth/
│       ├── authService.ts             # API calls
│       └── AuthContext.tsx            # Auth state provider
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx         # Route protection
│   │   └── Can.tsx                    # Permission components
│   └── layouts/
│       └── DashboardLayout.tsx        # Main layout
└── app/
    ├── layout.tsx                     # Root layout (configured)
    ├── login/
    │   ├── page.tsx                   # Login page
    │   └── login.css                  # Login styles
    ├── admin/
    │   └── dashboard/
    │       └── page.tsx               # Admin dashboard
    └── dashboard/
        └── page.tsx                   # Existing user dashboard
```

---

## How to Use

### 1. Enable Development Mode

Create `.env.local`:
```env
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Start the Application

```bash
cd packages/web
pnpm dev
```

### 3. Login

1. Go to http://localhost:3000/login
2. In development mode, select a role (e.g., System Admin)
3. Click "Quick Dev Login"
4. You'll be redirected to the appropriate dashboard

### 4. Protected Pages

Create a protected page:

```tsx
// app/violations/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Role } from '@/types/auth';

export default function ViolationsPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.TENANT_ADMIN, Role.COMPLIANCE_MANAGER]}>
      <DashboardLayout>
        {/* Your content */}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

### 5. Permission-Based UI

Hide/show elements based on permissions:

```tsx
import { Can } from '@/components/auth/Can';
import { Permission } from '@/types/auth';

<Can permission={Permission.USERS_MANAGE}>
  <Button onClick={editUser}>Edit User</Button>
</Can>

<Can role={[Role.SYSTEM_ADMIN, Role.TENANT_ADMIN]}>
  <DeleteButton />
</Can>
```

---

## API Integration

### Required Backend Endpoints

The frontend expects these endpoints:

```typescript
POST /api/auth/login
Body: { email: string, password: string }
Returns: { user: User, token: string, refreshToken?: string, expiresIn: number }

POST /api/auth/logout
Headers: Authorization: Bearer {token}

GET /api/auth/me
Headers: Authorization: Bearer {token}
Returns: User

POST /api/auth/refresh
Body: { refreshToken: string }
Returns: { token: string }
```

### Backend Implementation (Already Exists)

The backend already has XSUAA authentication:
- `packages/api/src/middleware/auth.ts` - Authentication middleware
- `requireRole(role)` middleware for protected routes

**To Connect:**
1. Implement `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` endpoints
2. These should use existing XSUAA authentication or dev mode
3. Return user with roles from XSUAA role collections

---

## Next Steps

### Immediate (Required for Functionality)

1. **Create Auth API Endpoints**
   - Implement `/api/auth/*` routes in backend
   - Connect to existing XSUAA middleware
   - Add development mode bypass

2. **Create .env Files**
   - Add `NEXT_PUBLIC_DEV_MODE=true` for dev
   - Add `NEXT_PUBLIC_API_URL`

3. **Test Login Flow**
   - Test with each role
   - Verify redirects work
   - Test permission checks

### Short Term (Enhance UX)

4. **Create More Dashboard Pages**
   - Tenant dashboard (`/dashboard`)
   - Compliance dashboard (violations-focused)
   - Auditor dashboard (read-only)
   - User dashboard (personal view)

5. **Migrate Existing Pages to Ant Design**
   - `/violations` - Use Ant Design Table
   - `/users` - Use Ant Design Table with filters
   - `/analytics` - Use Ant Design Charts
   - Use `DashboardLayout` wrapper

6. **Add Permission Checks to Existing Pages**
   - Wrap with `<ProtectedRoute>`
   - Use `<Can>` for conditional UI elements
   - Hide/disable actions based on permissions

### Medium Term (Polish)

7. **Implement All Permission Checks**
   - Review each page
   - Add granular permission checks
   - Test with all role combinations

8. **Create User Profile Page**
   - `/profile` - View/edit profile
   - Change password
   - View assigned roles

9. **Add Notifications System**
   - Bell icon in header (already added)
   - Notification drawer
   - Real-time updates (WebSocket)

10. **Error Pages**
    - `/unauthorized` - Better 403 page
    - `/not-found` - 404 page
    - Error boundaries

### Long Term (Production Ready)

11. **Production Auth**
    - Disable dev mode
    - Full XSUAA integration
    - Session management
    - Refresh token rotation

12. **Testing**
    - Unit tests for auth hooks
    - Integration tests for login flow
    - E2E tests for role-based access

13. **Security Hardening**
    - CSRF protection
    - Rate limiting on login
    - Session timeout
    - Audit logging

---

## Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"
**Solution:** Make sure AuthProvider wraps your component tree in `app/layout.tsx`

### Issue: Login redirects to wrong page
**Solution:** Check `redirectAfterLogin()` in `AuthContext.tsx` and ensure role-based logic is correct

### Issue: Permission checks not working
**Solution:**
1. Verify user has correct roles in auth state
2. Check ROLE_PERMISSIONS mapping in `types/auth.ts`
3. Ensure permissions are loaded when user authenticates

### Issue: Ant Design styles not applying
**Solution:**
1. Verify AntdRegistry wraps app in `layout.tsx`
2. Check ConfigProvider is configured
3. Import Ant Design CSS if needed

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Root Layout (layout.tsx)                             │  │
│  │  ├─ AntdRegistry                                      │  │
│  │  ├─ ConfigProvider (Theme)                            │  │
│  │  └─ AuthProvider (Auth State)                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │                                                        │  │
│  │  ┌──────────────┐          ┌───────────────────────┐  │  │
│  │  │ Login Page   │          │   Dashboard Layout    │  │  │
│  │  │ (public)     │          │   (protected)         │  │  │
│  │  └──────────────┘          │   ├─ Sidebar (Nav)    │  │  │
│  │                             │   ├─ Header (User)    │  │  │
│  │                             │   └─ Content (Pages)  │  │  │
│  │                             └───────────────────────┘  │  │
│  │                                       │                 │  │
│  │  ┌────────────────────────────────────┴──────────────┐  │
│  │  │            Protected Pages                       │  │
│  │  │  ┌─────────────────┐  ┌──────────────────────┐  │  │
│  │  │  │ Admin Dashboard │  │ User Dashboard       │  │  │
│  │  │  │ (Admin only)    │  │ (All authenticated)  │  │  │
│  │  │  └─────────────────┘  └──────────────────────┘  │  │
│  │  │  ┌─────────────────┐  ┌──────────────────────┐  │  │
│  │  │  │ Violations      │  │ Users                │  │  │
│  │  │  │ (Most roles)    │  │ (Admins only)        │  │  │
│  │  │  └─────────────────┘  └──────────────────────┘  │  │
│  │  └──────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │            Auth Context (useAuth)                     │  │
│  │  - user, isAuthenticated, isLoading                   │  │
│  │  - login(), logout(), hasRole(), hasPermission()      │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │   Backend API (Express)        │
           │   ├─ /api/auth/*               │
           │   ├─ XSUAA Middleware          │
           │   └─ Role-based endpoints      │
           └────────────────────────────────┘
```

---

## Summary

✅ **What Works:**
- Complete RBAC system with 5 roles and 20+ permissions
- Beautiful Ant Design login page
- Protected routes with role checking
- Permission-based UI components
- Dashboard layout with navigation
- Admin dashboard example
- Development mode for testing

⚠️ **What's Needed:**
- Backend API endpoints for auth
- Connect to existing XSUAA auth
- Migrate existing pages to use new layout
- Create role-specific dashboards

📚 **Documentation:**
- RBAC Architecture: `docs/RBAC_ARCHITECTURE.md`
- This guide: `docs/ANTD_IMPLEMENTATION_GUIDE.md`

---

**Questions? Issues?**

Refer to:
1. RBAC Architecture document for role/permission design
2. Ant Design docs: https://ant.design/
3. Next.js 15 docs: https://nextjs.org/docs
