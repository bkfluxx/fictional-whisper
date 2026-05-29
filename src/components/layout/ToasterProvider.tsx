"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export default function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={resolvedTheme as "light" | "dark" | "system"}
    />
  );
}
