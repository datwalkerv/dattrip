"use client";

import { IconButton, useColorScheme } from "datui";
import { Bookmark, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";
import { useTheme } from "./providers";

export function SiteHeader() {
  const { setTheme } = useTheme();
  const scheme = useColorScheme();
  return (
    <header className="sticky top-0 z-20 border-b border-separator bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 tablet:px-6">
        <Link href="/" className="flex items-center gap-2 text-title-3 font-semibold tracking-tight">
          <Logo size={26} />
          dattrip
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link href="/saved" className="flex h-9 items-center gap-1.5 rounded-md px-3 text-subhead text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bookmark className="size-4" aria-hidden />
            Saved
          </Link>
          <IconButton label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(scheme === "dark" ? "light" : "dark")}>
            {scheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </IconButton>
        </nav>
      </div>
    </header>
  );
}
