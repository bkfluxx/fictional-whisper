"use client";

import { useState } from "react";

interface Props {
  isPrivate: boolean;
  title: string | null;
  html: string;
}

export default function PrivateReveal({ isPrivate, title, html }: Props) {
  const [revealed, setRevealed] = useState(false);

  const content = (
    <>
      <h1 className="text-3xl font-heading font-normal text-foreground leading-snug mb-6">
        {title ?? <span className="text-foreground/30 italic">Untitled</span>}
      </h1>
      <div className="fw-prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );

  if (!isPrivate || revealed) return content;

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="blur-md select-none pointer-events-none">{content}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={() => setRevealed(true)}
          className="bg-card border border-border shadow-md px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 text-foreground"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Reveal entry
        </button>
      </div>
    </div>
  );
}
