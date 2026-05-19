// Converts regional-indicator emoji pairs (e.g. 🇧🇷) to flagcdn.com images.
// Non-flag emojis are rendered as a plain span — works on all platforms.

const RI_BASE = 0x1F1E6; // regional indicator 'A'

function toCountryCode(emoji: string): string | null {
  const pts = [...emoji].map(c => c.codePointAt(0) ?? 0);
  if (
    pts.length === 2 &&
    pts[0] >= RI_BASE && pts[0] <= RI_BASE + 25 &&
    pts[1] >= RI_BASE && pts[1] <= RI_BASE + 25
  ) {
    return String.fromCharCode(pts[0] - RI_BASE + 65, pts[1] - RI_BASE + 65).toLowerCase();
  }
  return null;
}

interface Props {
  emoji: string;
  size?: number;         // pixel width; height auto-calculated at 3:2 ratio
  className?: string;
  style?: React.CSSProperties;
}

export default function Flag({ emoji, size = 24, className, style }: Props) {
  const code = toCountryCode(emoji);
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt={emoji}
        width={size}
        height={Math.round(size * 0.67)}
        className={className}
        style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
        loading="lazy"
      />
    );
  }
  return <span className={className} style={style}>{emoji}</span>;
}
