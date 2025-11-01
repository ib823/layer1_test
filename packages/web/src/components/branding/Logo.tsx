'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

interface LogoProps {
  /**
   * Logo variant
   * - 'full': Complete logo with text
   * - 'mark': Icon-only logo
   * - 'horizontal': Full horizontal logo
   */
  variant?: 'full' | 'mark' | 'horizontal';

  /**
   * Size of the logo
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Optional link href (makes logo clickable)
   */
  href?: string;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Custom inline styles
   */
  style?: CSSProperties;
}

/**
 * Logo Component
 *
 * Renders the Prism platform logo with multiple variants
 * and sizes for different contexts (header, sidebar, etc.)
 *
 * @example
 * // Header logo
 * <Logo variant="mark" size="small" href="/dashboard" />
 *
 * @example
 * // Full logo
 * <Logo variant="full" size="large" />
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'medium',
  href,
  className = '',
  style,
}) => {
  // Size mappings in pixels
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };

  // Logo path mappings
  const logoPathMap = {
    full: '/logos/logo-light.png',
    mark: '/logos/logo-mark.png',
    horizontal: '/logos/logo-light.png', // Can be updated with dedicated horizontal version
  };

  const logoDimension = sizeMap[size];
  const logoPath = logoPathMap[variant];

  const LogoImage = (
    <Image
      src={logoPath}
      alt="Prism Logo"
      width={logoDimension}
      height={logoDimension}
      priority={true}
      style={{
        width: logoDimension,
        height: logoDimension,
        ...style,
      }}
      className={`logo logo-${variant} logo-${size} ${className}`}
      onError={(e) => {
        // Fallback: display text if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );

  // If href is provided, wrap in a link
  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center logo-link"
        aria-label="Prism Home"
      >
        {LogoImage}
      </Link>
    );
  }

  return LogoImage;
};

export default Logo;
