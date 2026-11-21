const P: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calc: "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 3v4h10V5zm1 7h2v2H8zm4 0h2v2h-2zm4 0h2v6h-2zm-8 4h2v2H8zm4 0h2v2h-2z",
  doc: "M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5M8 13h8M8 17h6",
  building: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 11h.01M12 11h.01M15 11h.01",
  menu: "M4 6h16M4 12h16M4 18h16",
  heart: "M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z",
  baby: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 18a7 7 0 0 1 14 0M10 7h.01M14 7h.01M10.5 9a2 2 0 0 0 3 0",
  pregnant: "M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM10 8h3c3 0 5 2.5 5 5.5S16 19 14 19v3h-4v-6l-1-4z",
  chat: "M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z",
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  check: "M5 12.5 10 17 19 7",
  x: "M6 6l12 12M18 6 6 18",
  back: "M15 5 8 12l7 7",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  settings: "M10.28 5.11L10.58 2.51L13.42 2.51L13.72 5.11L15.66 5.91L17.71 4.28L19.72 6.29L18.09 8.34L18.89 10.28L21.49 10.58L21.49 13.42L18.89 13.72L18.09 15.66L19.72 17.71L17.71 19.72L15.66 18.09L13.72 18.89L13.42 21.49L10.58 21.49L10.28 18.89L8.34 18.09L6.29 19.72L4.28 17.71L5.91 15.66L5.11 13.72L2.51 13.42L2.51 10.58L5.11 10.28L5.91 8.34L4.28 6.29L6.29 4.28L8.34 5.91ZM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0 -6z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  user: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0",
  users: "M9 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2 20a7 7 0 0 1 14 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 13.5a7 7 0 0 1 4 6.5",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v5M16 3v5",
  briefcase: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  coins: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10",
  folder: "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  send: "M3 11 21 3l-8 18-2-8z",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
  info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v6M12 7.5h.01",
  infopoint: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7.4h.01M10.4 10.6H12v6M10.2 16.6h3.6",
  print: "M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
  search: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM15.3 15.3 20.5 20.5",
};

export default function Icon({ name, size = 22, stroke = 1.8, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] || P.info} />
    </svg>
  );
}
