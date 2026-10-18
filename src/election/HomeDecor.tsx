// Decorative silhouettes; they do not encode boundaries or election information.
export function IslandDecoration() {
  return <svg className="home-island" viewBox="0 0 200 260" fill="currentColor" aria-hidden="true">
    <path d="m150 14 8 12-3 15 10 9-8 18-16 11-3 17-17 12-8 19-18 5 5 15-14 11-2 13-13-2-9 15-13-2-8 13 4 10-13 13-6-5 1-17 11-10 2-17 13-4-5-11 11-10 3-14 15-2 1-13 12-7 6-18 16-15-1-12 15-20 11-20Z" />
    <path d="m34 213 8-5 7 5-7 9-9-2Zm-15 24 6-6 4 4-4 8-7-1Zm56-61 8-5 5 7-9 6-6-3Zm89-112 7-5 6 7-8 7-5-3Z" />
  </svg>;
}

export function FlowerDecoration() {
  return <svg className="home-flower-outline" viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="0.7" aria-hidden="true">
    {[0,72,144,216,288].map(angle => <g key={angle} transform={`rotate(${angle} 110 110)`}>
      <path d="M110 110C67 96 40 55 58 30 82 5 125 15 135 45 146 73 125 102 110 110Z" />
      <path d="M110 110C98 74 91 51 78 29M110 110C81 76 69 67 53 58M110 110C115 69 115 44 110 24" />
    </g>)}
    <path d="M110 110 170 160M112 114 174 155M150 143l8-12m-3 17 11-12m-7 17 12-10" />
    <circle cx="176" cy="160" r="3" />
  </svg>;
}
