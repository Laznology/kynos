export interface SimpleIconData {
  title: string;
  slug: string;
  hex: string;
  source: string;
  svg: string;
  path: string;
}

export const SimpleIcon = ({
  icon,
  className = "h-4 w-4",
  color,
}: {
  icon: SimpleIconData;
  className?: string;
  color?: string;
}) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    fill={color || "currentColor"}
    className={className}
  >
    <path d={icon.path} />
  </svg>
);
