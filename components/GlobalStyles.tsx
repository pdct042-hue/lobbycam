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

      /* ── Layout shell + responsive main grid ─────────────────────────
         The page is a three-column newspaper on wide screens, collapses to
         two columns on tablets, and stacks to a single readable column on
         phones. Column dividers become horizontal rules once stacked. */
      .lc-shell { max-width: 1400px; margin-left: auto; margin-right: auto; }

      .lc-title { font-size: clamp(30px, 6vw, 42px); }

      .lc-grid {
        display: grid;
        grid-template-columns: minmax(0, 5fr) minmax(0, 3.5fr) minmax(0, 3.5fr);
        gap: 24px;
      }
      .lc-col-floor     { padding-right: 20px; border-right: 1px solid var(--rule); }
      .lc-col-wire      { padding-left: 16px; padding-right: 16px; border-right: 1px solid var(--rule); }
      .lc-col-conflicts { padding-left: 16px; }

      /* One-line description under each column header. */
      .lc-dek { font-size: 12.5px; line-height: 1.4; color: var(--muted-dark); margin: 2px 0 0; }

      /* Tablet: floor spans the full width on its own row; the two money
         columns sit side-by-side beneath it. */
      @media (max-width: 1080px) {
        .lc-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
        .lc-col-floor {
          grid-column: 1 / -1;
          padding-right: 0;
          border-right: none;
          border-bottom: 1px solid var(--rule);
          padding-bottom: 20px;
        }
        .lc-col-wire      { padding-left: 0; }
        .lc-col-conflicts { padding-left: 16px; }
      }

      /* Phone: single column; every divider becomes a bottom rule. */
      @media (max-width: 680px) {
        .lc-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; }
        .lc-col-floor, .lc-col-wire, .lc-col-conflicts {
          padding: 0 0 20px 0;
          border-right: none;
          border-bottom: 1px solid var(--rule);
        }
        .lc-col-conflicts { border-bottom: none; padding-bottom: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .ticker-track { animation: none; }
        .animate-fade, .animate-flash, .bar-fill { animation: none; transition: none; }
      }

      /* ── Threat-level banner (DEFCON meter) ──────────────────────────
         Primary orientation: how hot is the floor, and what is the page
         showing right now. The 3·2·1 meter lights the active level. */
      .lc-banner {
        display: flex; align-items: flex-start; gap: 16px;
        margin-top: 10px; padding: 12px 16px;
        background: var(--white-warm);
        border: 1px solid var(--rule); border-left-width: 5px;
      }
      .lc-meter { display: flex; gap: 6px; flex-shrink: 0; }
      .lc-meter-pip {
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        font-family: var(--font-sans), system-ui, sans-serif;
        font-weight: 800; font-size: 15px; border: 1.5px solid var(--rule);
      }
      .lc-banner-body { min-width: 0; }
      .lc-banner-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
      .lc-banner-code {
        color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
        padding: 2px 7px; text-transform: uppercase;
        font-family: var(--font-sans), system-ui, sans-serif;
      }
      .lc-banner-headline { font-weight: 700; font-size: 14px; }
      .lc-banner-preview {
        font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
        color: var(--muted-dark); border: 1px dashed var(--muted); padding: 1px 5px;
      }
      .lc-banner-blurb { margin: 4px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--muted-body); }

      /* ── Level modes: full-width takeovers above the routine grid ──── */
      .lc-mode {
        margin-top: 12px; margin-bottom: 4px;
        padding: 14px 16px 16px;
        background: var(--white-warm);
        border: 1px solid var(--rule); border-top-width: 4px;
      }
      .lc-mode-critical { border-top-color: var(--red); }
      .lc-mode-elevated { border-top-color: #B8860B; }
      .lc-mode-tag {
        display: inline-block; color: #fff;
        font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 3px 9px; margin-bottom: 10px;
        font-family: var(--font-sans), system-ui, sans-serif;
      }
      .lc-mode-headline h2 { margin: 0; }
      .lc-mode-headline p { margin: 2px 0 0; }

      /* Honest "not built yet" callout used inside scaffolded modes. */
      .lc-scaffold-note {
        display: flex; gap: 10px; align-items: flex-start;
        margin-top: 12px; padding: 10px 12px;
        background: var(--cream); border: 1px dashed var(--rule);
      }
      .lc-scaffold-note p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted-body); }
      .lc-scaffold-badge {
        flex-shrink: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--muted-dark); background: rgba(138,109,30,0.12); padding: 2px 6px; margin-top: 1px;
      }
      .lc-scaffold-note code, .lc-banner code, .lc-chyron-empty code { font-size: 11px; }

      /* ── Conflict chyron (TV lower-third ticker) ── */
      .lc-chyron { display: flex; align-items: stretch; margin-top: 12px; border: 1px solid var(--ink); }
      .lc-chyron-tag {
        flex-shrink: 0; display: flex; align-items: center;
        background: var(--ink); color: var(--cream);
        font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 6px 10px;
      }
      .lc-chyron-viewport { overflow: hidden; flex: 1; display: flex; align-items: center; }
      .lc-chyron-track { display: flex; align-items: center; gap: 40px; white-space: nowrap; padding: 6px 12px; }
      .lc-chyron-item { font-size: 13px; }
      .lc-chyron-empty { font-size: 12px; color: var(--muted-body); white-space: normal; padding: 6px 12px; }

      @media (max-width: 680px) {
        .lc-banner { flex-direction: column; gap: 10px; }
      }

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
