/**
 * PageHead Component
 *
 * Sets page title and meta description for SEO and accessibility
 * WCAG 2.4.2 Page Titled (Level A): Web pages have titles that describe topic or purpose
 *
 * @example
 * ```tsx
 * <PageHead
 *   title="SoD Violations"
 *   description="View and manage Segregation of Duties violations"
 * />
 * ```
 */

'use client';

import { useEffect } from 'react';

interface PageHeadProps {
  /** Page title (will be suffixed with " - ABeam CoreBridge") */
  title: string;
  /** Optional meta description for SEO */
  description?: string;
}

export const PageHead: React.FC<PageHeadProps> = ({ title, description }) => {
  useEffect(() => {
    // Set page title
    document.title = `${title} - ABeam CoreBridge`;

    // Set meta description if provided
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }
  }, [title, description]);

  return null; // This component doesn't render anything
};

export default PageHead;
