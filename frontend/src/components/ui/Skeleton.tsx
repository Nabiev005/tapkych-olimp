import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}

/** Loading placeholder; hidden from screen readers (announce loading elsewhere). */
export function Skeleton({ width = '100%', height = '1em', radius, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={['skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
