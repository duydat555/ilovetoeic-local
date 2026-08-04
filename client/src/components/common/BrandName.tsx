import type { HTMLAttributes } from 'react';

type BrandNameProps = HTMLAttributes<HTMLSpanElement>;

export const BrandName = ({ className = '', ...props }: BrandNameProps) => (
  <span className={`inline-flex whitespace-nowrap ${className}`} {...props}>
    <span className="text-[#ffc72c]">ilo</span>
    <span className="text-[#1b2a4a]">vetoeic</span>
  </span>
);
