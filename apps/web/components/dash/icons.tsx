// Inline stroke icons for the Daylight dashboard (24-unit grid, round caps, 1.7 stroke).
// Decorative: callers give the button its aria-label.
import type { CSSProperties, Ref, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; weight?: number };

function Icon({ size = 18, weight = 1.7, children, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
);

export const KeyIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12 20 3M16 7l3 3M14 9l2 2" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon weight={2.2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

/** A sidebar outline with a chevron: points right to hide the panel, left to show it. */
export const PanelIcon = ({ collapsed = false, ...p }: IconProps & { collapsed?: boolean }) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="5" />
    <path d="M15 4v16" />
    <path d={collapsed ? "m11 9-3 3 3 3" : "m8 9 3 3-3 3"} />
  </Icon>
);

export const ChevronIcon = ({ up = false, ...p }: IconProps & { up?: boolean }) => (
  <Icon weight={2.2} {...p}>
    <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon weight={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon weight={2} {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const ExternalIcon = (p: IconProps) => (
  <Icon weight={2} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);

export const BinIcon = (p: IconProps) => (
  <Icon weight={1.6} {...p}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5" />
  </Icon>
);

export const ResetIcon = (p: IconProps) => (
  <Icon weight={1.9} {...p}>
    <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon weight={2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);

export const MergeIcon = (p: IconProps) => (
  <Icon weight={1.8} {...p}>
    <circle cx="9" cy="12" r="5" />
    <circle cx="15" cy="12" r="5" />
  </Icon>
);

/** The under-reported hexagon outline, in the map's pink. */
export function HexOutline({ size = 16, stroke = 2.2 }: { size?: number; stroke?: number }) {
  return (
    <svg aria-hidden width={size} height={size * 1.12} viewBox="-9 -10 18 20">
      <polygon
        points="0,-8 7,-4 7,4 0,8 -7,4 -7,-4"
        fill="none"
        stroke="#E7298A"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Loading dots: eight dots that fade around a ring; `.dl-spin` steps them. */
export function DotSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  const dots = [
    [17, 10, 0.95],
    [14.95, 14.95, 0.8],
    [10, 17, 0.65],
    [5.05, 14.95, 0.5],
    [3, 10, 0.38],
    [5.05, 5.05, 0.28],
    [10, 3, 0.2],
    [14.95, 5.05, 0.12],
  ] as const;
  return (
    <svg aria-hidden className={`dl-spin ${className}`} width={size} height={size} viewBox="0 0 20 20">
      <g fill="currentColor">
        {dots.map(([cx, cy, o]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" opacity={o} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The Bin-It mark: a hexagon of six dots (a map cell) with the center flagged coral.
 * `ringStyle` styles the six outer dots as one group and `centerRef` reaches the coral dot, so
 * LogoMark can spin the ring around it; the plain mark needs neither.
 */
export function HexMark({
  size = 32,
  ringStyle,
  centerRef,
  style,
}: {
  size?: number;
  ringStyle?: CSSProperties;
  centerRef?: Ref<SVGCircleElement>;
  style?: CSSProperties;
}) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 30 30" style={style}>
      <g fill="#2A2926" style={ringStyle}>
        <circle cx="24.5" cy="15" r="3" />
        <circle cx="19.75" cy="6.8" r="3" />
        <circle cx="10.25" cy="6.8" r="3" />
        <circle cx="5.5" cy="15" r="3" />
        <circle cx="10.25" cy="23.2" r="3" />
        <circle cx="19.75" cy="23.2" r="3" />
      </g>
      <circle ref={centerRef} cx="15" cy="15" r="3.8" fill="#FF6363" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
    </svg>
  );
}
