"use client";

import { useEffect, useState } from "react";

function computeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Greeting() {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    setGreeting(computeGreeting());
  }, []);

  // Render nothing until hydrated to avoid SSR/client mismatch
  if (!greeting) return null;

  return <h1 className="text-3xl font-heading text-foreground">{greeting}</h1>;
}
