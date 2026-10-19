// SVG representations adapted from the original Horizon Tuner app.
export function SpringGlyph({
  compression,
  color,
  label,
}: {
  compression: number;
  color: string;
  label: string;
}) {
  const centerX = 27;
  const topY = 13 + compression * 31;
  const bottomY = 70;
  const springHeight = bottomY - topY;

  return (
    <svg
      className="h-[58px] w-[38px]"
      viewBox="0 0 54 82"
      role="img"
      aria-label={`${label} suspension`}
    >
      <path
        className="fill-none stroke-white/10 [stroke-width:7]"
        d={`M${centerX} 8 V74`}
      />
      <path
        className="fill-none stroke-white/20 [stroke-width:2.5] [stroke-linecap:round]"
        d={`M14 10 H40 M12 ${bottomY + 5} H42`}
      />
      <path
        className="fill-none [stroke-width:3.2] [stroke-linecap:round] [stroke-linejoin:round]"
        d={springPath(centerX, topY + 4, springHeight - 8)}
        stroke={color}
      />
      <rect
        className="fill-[#101312] stroke-white/15 [stroke-width:1.4]"
        x="13"
        y={topY - 7}
        width="28"
        height="9"
        rx="3"
      />
      <rect
        className="fill-white/10 stroke-white/20 [stroke-width:1]"
        x="9"
        y={bottomY}
        width="36"
        height="8"
        rx="3"
      />
    </svg>
  );
}

export function RollCarGlyph() {
  return (
    <g>
      <rect
        className="fill-[#050706] stroke-[#2f3f39] [stroke-width:1]"
        x="-29"
        y="10"
        width="9"
        height="13"
        rx="2"
      />
      <rect
        className="fill-[#050706] stroke-[#2f3f39] [stroke-width:1]"
        x="20"
        y="10"
        width="9"
        height="13"
        rx="2"
      />
      <path
        className="fill-[#293c35] stroke-[#f3d09b]/80 [stroke-width:2] [stroke-linejoin:round]"
        d="M-24 -18 H24 L31 -5 V18 H-31 V-5 Z"
      />
      <path
        className="fill-[#19251f] stroke-white/20 [stroke-width:1]"
        d="M-15 -13 H15 L19 -5 H-19 Z"
      />
      <rect
        className="fill-[#101312] stroke-white/15 [stroke-width:1]"
        x="-24"
        y="-1"
        width="48"
        height="12"
        rx="2"
      />
      <circle className="fill-[#f3d09b]" cx="-19" cy="5" r="2.5" />
      <circle className="fill-[#f3d09b]" cx="19" cy="5" r="2.5" />
      <path
        className="fill-none stroke-white/20 [stroke-width:1.5] [stroke-linecap:round]"
        d="M-9 5 H9"
      />
    </g>
  );
}

export function PitchCarGlyph() {
  return (
    <g>
      <path
        className="fill-[#293c35] stroke-[#63da97]/85 [stroke-width:2] [stroke-linejoin:round]"
        d="M-32 8 L-25 -6 L4 -12 L24 -5 L32 8 Z"
      />
      <path
        className="fill-[#19251f] stroke-white/20 [stroke-width:1]"
        d="M-16 -6 L3 -10 L15 -5 L-19 -3 Z"
      />
      <path
        className="fill-none stroke-white/20 [stroke-width:1.8] [stroke-linecap:round]"
        d="M-14 3 H20"
      />
      <circle
        className="fill-[#050706] stroke-[#2f3f39] [stroke-width:1]"
        cx="-20"
        cy="9"
        r="5"
      />
      <circle
        className="fill-[#050706] stroke-[#2f3f39] [stroke-width:1]"
        cx="21"
        cy="9"
        r="5"
      />
    </g>
  );
}

function springPath(centerX: number, topY: number, height: number) {
  const turns = 5.5;
  const amplitude = 9.5;
  const samples = 44;
  const points: string[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    const x = centerX + Math.sin(progress * turns * Math.PI * 2) * amplitude;
    const y = topY + progress * height;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return `M ${points.join(" L ")}`;
}

export function SteeringWheelIcon({ rotation }: { rotation: number }) {
  return (
    <svg
      className="h-[44px] w-[44px] overflow-visible transition-transform duration-100 ease-out"
      style={{ transform: `rotate(${rotation}deg)` }}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Steering wheel position"
    >
      <circle
        className="fill-none stroke-[#f3d09b] [stroke-width:5.5]"
        cx="32"
        cy="32"
        r="25"
      />
      <circle
        className="fill-[#101312] stroke-[#f3d09b] [stroke-width:4]"
        cx="32"
        cy="32"
        r="7"
      />
      <path
        className="fill-none stroke-[#f3d09b] [stroke-width:5.5] [stroke-linecap:round] [stroke-linejoin:round]"
        d="M32 39 L32 57"
      />
      <path
        className="fill-none stroke-[#f3d09b] [stroke-width:5.5] [stroke-linecap:round] [stroke-linejoin:round]"
        d="M26 34 L11 45"
      />
      <path
        className="fill-none stroke-[#f3d09b] [stroke-width:5.5] [stroke-linecap:round] [stroke-linejoin:round]"
        d="M38 34 L53 45"
      />
      <path
        className="fill-none stroke-[#101312] [stroke-width:6] [stroke-linecap:round]"
        d="M24 8 L40 8"
      />
      <path
        className="fill-none stroke-[#f3d09b] [stroke-width:3.5] [stroke-linecap:round]"
        d="M29 7 L35 7"
      />
    </svg>
  );
}
