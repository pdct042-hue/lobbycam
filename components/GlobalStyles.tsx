export default function GlobalStyles() {
  return (
    <style>{`
      :root {
        --cream: #F7F4EE;
        --white-warm: #FFFDF7;
        --ink: #1A1A1A;
        --red: #C8102E;
        --blue: #1B3A6B;
        --rule: #D4CFC6;
        --rule-light: #EDEAE4;
        --rule-border: #E8E5DF;
        --muted: #8A8680;
        --muted-dark: #5A5650;
        --muted-body: #3A3632;
      }

      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; background: var(--cream); }

      .serif { font-family: var(--font-serif), Georgia, serif; }
      .sans { font-family: var(--font-sans), system-ui, sans-serif; }
      .ink { color: var(--ink); }
      .red { color: var(--red); }
      .blue { color: var(--blue); }
      .caption { font-size: 10px; color: var(--muted); font-family: var(--font-sans), system-ui, sans-serif; letter-spacing: 0.03em; }
      .small-caps { font-variant: small-caps; letter-spacing: 0.08em; }
      .section-header { font-variant: small-caps; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--blue); font-family: var(--font-sans), system-ui, sans-serif; }

      @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes flash-red { 0% { background-color: rgba(200,16,46,0.15); } 100% { background-color: transparent; } }

      .animate-fade { animation: fade-in 300ms ease-out; }
      .animate-flash { animation: flash-red 1.5s ease-out; }
      .ticker-track { animation: ticker-scroll 80s linear infinite; }
      .ticker-paused .ticker-track { animation-play-state: paused; }
      .bar-fill { transition: width 0.6s ease-out; }

      .member-card { transition: border-color 0.15s ease; cursor: pointer; }
      .member-card:hover { border-color: var(--red); }

      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

      .skip-link {
        position: absolute; left: -9999px; top: 0; z-index: 100;
        padding: 8px 16px; background: var(--ink); color: var(--cream);
        font-family: var(--font-sans), system-ui, sans-serif; font-size: 14px; text-decoration: none;
      }
      .skip-link:focus { left: 8px; top: 8px; }

      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
      }
    `}</style>
  );
}
