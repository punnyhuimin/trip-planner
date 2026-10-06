"use client";

import { useEffect, useState } from "react";

/** The trip's join code as a ticket stub, with a copy-link button. */
export function ShareCode({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (status !== "copied") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  async function copy() {
    const link = `${window.location.origin}/t/${code}`;
    setLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      // Clipboard is unavailable on plain-http origins; show the link instead.
      setStatus("failed");
    }
  }

  return (
    <div className="ticket">
      <div className="px-6 pt-4 pb-3">
        <p className="text-sm font-medium text-muted">Invite the group</p>
        <p className="text-sm text-muted">They&rsquo;ll need this code or the link.</p>
      </div>
      <div className="perforation mx-5" aria-hidden />
      <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-5">
        <p
          className="font-mono text-4xl font-semibold tracking-[0.3em] text-ink"
          aria-label={`Trip code ${code.split("").join(" ")}`}
        >
          {code}
        </p>
        <button type="button" onClick={copy} className="btn btn-ghost w-full sm:w-auto">
          {status === "copied" ? "Copied!" : "Copy link"}
        </button>
        <p aria-live="polite" className="text-center text-sm break-all text-muted">
          {status === "copied" && "Link copied. Paste it into your group chat."}
          {status === "failed" && <>Copy this link: {link}</>}
        </p>
      </div>
    </div>
  );
}
