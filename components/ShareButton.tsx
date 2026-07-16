"use client";

import { useState } from "react";

export default function ShareButton({ shareText }: { shareText: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full py-3 text-sm font-bold uppercase tracking-wider"
      style={{ background: "var(--ink)", color: "var(--cream)", cursor: "pointer", border: "none", letterSpacing: "0.1em", fontSize: 12 }}
    >
      {copied ? "Copied to Clipboard ✓" : "Share This Profile — Copy to Clipboard"}
    </button>
  );
}
