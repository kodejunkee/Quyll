import './LoadingSkeleton.css';

type SkeletonVariant = 'text' | 'card' | 'list-item' | 'circle';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
}

const VARIANT_STYLES: Record<SkeletonVariant, { width: string; height: string; borderRadius: string }> = {
  text: { width: '100%', height: '16px', borderRadius: 'var(--radius-sm)' },
  card: { width: '100%', height: '120px', borderRadius: 'var(--radius-lg)' },
  'list-item': { width: '100%', height: '48px', borderRadius: 'var(--radius-md)' },
  circle: { width: '40px', height: '40px', borderRadius: 'var(--radius-full)' },
};

function LoadingSkeleton({
  variant = 'text',
  width,
  height,
  borderRadius,
  count = 1,
}: LoadingSkeletonProps) {
  const defaults = VARIANT_STYLES[variant];

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: width ?? defaults.width,
            height: height ?? defaults.height,
            borderRadius: borderRadius ?? defaults.borderRadius,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export { LoadingSkeleton };
export type { LoadingSkeletonProps };
