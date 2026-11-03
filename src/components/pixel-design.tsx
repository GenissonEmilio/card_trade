import icons from './design-icons.json';

export type DesignIconName = keyof typeof icons | 'pokemon';

/** Local, licensed Phosphor duotone paths used in the approved Figma design. */
export function DesignIcon({
  name,
  size = 20,
  className = '',
}: {
  name: DesignIconName;
  size?: number;
  className?: string;
}) {
  if (name === 'pokemon')
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path d="M3 12a9 9 0 0 1 18 0Z" fill="currentColor" opacity=".25" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3 12h5m8 0h5" stroke="currentColor" strokeWidth="1.7" />
        <circle
          cx="12"
          cy="12"
          r="3.2"
          fill="var(--pixel-dark, #13071c)"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}

export function RibbonLabel({
  children,
  icon,
  primary = false,
}: {
  children: React.ReactNode;
  icon?: DesignIconName;
  primary?: boolean;
}) {
  return (
    <>
      {icon && (
        <span className={`ribbon-icon ${primary ? 'purple' : 'lime'}`}>
          <DesignIcon name={icon} />
        </span>
      )}
      <span className="control-label">{children}</span>
    </>
  );
}

export function PixelArt({ name, className = '' }: { name: string; className?: string }) {
  return (
    <img
      className={`pixel-art ${className}`}
      src={`/brand/pixel/${name}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
