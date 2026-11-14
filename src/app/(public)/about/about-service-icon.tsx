const drawings = [
  <g key="leaf"><path d="M12 22c4-4 7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 3 8 7 12Z" /><path d="M12 22V10" /><path d="M8 14c2.5 0 4 1.5 4 4" /><path d="M16 14c-2.5 0-4 1.5-4 4" /></g>,
  <g key="book"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M8 7h8M8 11h6" /></g>,
  <g key="movement"><circle cx="12" cy="5" r="2.5" /><path d="M12 8v5M8 21l4-8 4 8M5 14l7-2 7 2" /></g>,
]

// Preserve the three line icons from the previous About page.
export default function AboutServiceIcon({ index }: { index: number }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{drawings[index]}</svg>
}
