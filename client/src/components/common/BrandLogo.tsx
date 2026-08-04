import type { HTMLAttributes } from 'react';
import logoUrl from '../../assets/icons/logo.svg';

interface BrandLogoProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
}

export const BrandLogo = ({
  alt = '',
  className = '',
  ...props
}: BrandLogoProps) => (
  <span
    className={`relative block overflow-hidden bg-white ${className}`}
    {...props}
  >
    <img
      src={logoUrl}
      alt={alt}
      className="absolute inset-0 size-full scale-[1.3] object-contain"
    />
  </span>
);
