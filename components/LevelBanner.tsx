"use client";

import { LEVELS, LEVEL_SCALE, type AlertLevel } from "@/lib/level";

// The DEFCON-style status banner. It's the site's primary orientation: a
// first-time visitor should read it and immediately know how "hot" the floor
// is and what the page is currently showing them. The 3·2·1 meter lights the
// active level; the copy explains what that state means.

export default function LevelBanner({
  level,
  preview = false,
}: {
  level: AlertLevel;
  preview?: boolean;
}) {
  const meta = LEVELS[level];
  return (
    <div
      className="lc-banner mx-6"
      style={{ borderColor: meta.color }}
      role="status"
      aria-live="polite"
      aria-label={`Alert ${meta.code}: ${meta.name}. ${meta.headline}`}
    >
      {/* DEFCON meter: 3 · 2 · 1, active level lit in its color */}
      <div className="lc-meter" aria-hidden="true">
        {LEVEL_SCALE.map((l) => {
          const on = l === level;
          const lm = LEVELS[l];
          return (
            <span
              key={l}
              className="lc-meter-pip"
              style={{
                background: on ? lm.color : "transparent",
                color: on ? "#fff" : "var(--muted)",
                borderColor: on ? lm.color : "var(--rule)",
                opacity: on ? 1 : 0.55,
              }}
            >
              {l}
            </span>
          );
        })}
      </div>

      <div className="lc-banner-body">
        <div className="lc-banner-heading">
          <span
            className="lc-banner-code"
            style={{ background: meta.color }}
          >
            {meta.code} · {meta.name.toUpperCase()}
          </span>
          <span className="lc-banner-headline" style={{ color: meta.color }}>
            {meta.headline}
          </span>
          {preview && <span className="lc-banner-preview">Preview</span>}
        </div>
        <p className="lc-banner-blurb">{meta.blurb}</p>
      </div>
    </div>
  );
}
