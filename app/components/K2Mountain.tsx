export default function K2Mountain({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      className="k2-mountain"
      viewBox="0 0 900 500"
      preserveAspectRatio="xMaxYMax meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-hidden="true"
    >
      <ellipse cx="450" cy="500" rx="500" ry="120" fill="#4a3820" opacity=".4"/>
      <polygon points="0,320 120,200 220,280 320,160 420,250 520,140 620,220 720,170 820,240 900,200 900,380 0,380" fill="#2a2018"/>
      <polygon points="450,15 200,380 700,380" fill="#3d3020"/>
      <polygon points="450,15 200,380 450,380" fill="#4a3c28"/>
      <polygon points="450,15 700,380 450,380" fill="#302418"/>
      <polygon points="450,15 395,130 505,130" fill="#e8dfc8"/>
      <polygon points="450,15 450,130 505,130" fill="#c8bfa8"/>
      <polygon points="200,380 80,380 180,260 250,320" fill="#2a2018"/>
      <polygon points="700,380 820,380 720,250 650,310" fill="#201810"/>
      <polygon points="0,380 100,280 200,380" fill="#1e1810"/>
      <polygon points="750,380 860,240 900,340 900,380" fill="#1e1810"/>
      <rect x="0" y="378" width="900" height="122" fill="#1a1510"/>
      <line x1="450" y1="15" x2="415" y2="130" stroke="#e8dfc8" strokeWidth="1.5" opacity=".6"/>
      <line x1="450" y1="15" x2="468" y2="100" stroke="#e8dfc8" strokeWidth="1" opacity=".4"/>
      <line x1="450" y1="15" x2="400" y2="195" stroke="#d0c8b0" strokeWidth="1" opacity=".25"/>
      <path d="M310,280 Q380,250 450,255 Q520,260 590,280" stroke="#6a5840" strokeWidth=".8" fill="none" opacity=".4"/>
      <path d="M270,320 Q360,295 450,300 Q540,305 630,320" stroke="#5a4830" strokeWidth=".8" fill="none" opacity=".3"/>
    </svg>
  );
}
