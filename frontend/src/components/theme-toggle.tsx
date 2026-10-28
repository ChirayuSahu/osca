"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// One click flips between light and dark. Until then the theme follows the
// device setting (the provider's default is "system").
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    // Fixed label: the server can't know the theme, so a theme-specific label would mismatch on hydration
    <Button variant="ghost" size="icon" aria-label="Toggle light and dark mode" onClick={() => setTheme(next)}>
      <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
