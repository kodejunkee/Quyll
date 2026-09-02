import React from 'react';

export interface QuyllIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function QuyllIcon({ 
  size = 24, 
  width, 
  height, 
  className, 
  style, 
  color = 'currentColor', 
  ...props 
}: QuyllIconProps) {
  const iconWidth = size ?? width ?? 24;
  const iconHeight = size ?? height ?? 24;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 221 241"
      width={iconWidth}
      height={iconHeight}
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-label="Quyll Icon"
      {...props}
    >
      <path
        fill={color}
        fillRule="evenodd"
        d="M159 20C96 61 55 136 49 220l-1 8 2-5c3-9 6-14 10-18s4-5 4-10c0-21 9-54 22-81 7-13 21-35 25-39 3-3 3-2-1 3-13 20-27 63-31 98-1 5-1 11-2 14v4l5-1c31-6 51-23 54-46l1-5-15-1c-18 0-23-1-9-2 10-1 23-4 23-5s-1-6-2-12c-2-8-2-14-2-21l1-11h-7c-8-1-8-3 0-3h7l1-6c4-19 15-42 30-61 6-7 6-7-5 0"
      />
      <path
        fill={color}
        fillRule="evenodd"
        opacity={0.8}
        d="M120 88h4c7 0 8-1 2-1-3 0-6 0-6 1m1 54h9c3 0 0-1-4-1-5 0-7 1-5 1"
      />
    </svg>
  );
}

export default QuyllIcon;
