'use client';

import { UserAccessReviewDashboard } from '@/components/modules/user-access-review/UserAccessReviewDashboard';
import { PageHead } from '@/components/seo/PageHead';

/**
 * User Access Review Module Page
 *
 * Provides comprehensive user access analysis and SoD violation detection capabilities.
 */
export default function UserAccessReviewPage() {
  return (
    <>
      <PageHead
        title="User Access Review"
        description="Comprehensive user access analysis and periodic access certification"
      />
      <UserAccessReviewDashboard />
    </>
  );
}
