import { Plane } from "lucide-react";
import Link from "next/link";

const LINKS = [
  ["Search", "/#search"],
  ["Saved trips", "/saved"],
  ["Terms of use", "/terms"],
  ["Photo credits", "/credits"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-separator">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 tablet:flex-row tablet:items-center tablet:justify-between tablet:px-6">
        <div className="flex items-center gap-2 text-subhead">
          <Plane className="size-4 -rotate-45" aria-hidden />
          <span className="font-semibold tracking-tight">dattrip</span>
          <span className="text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-subhead text-muted-foreground">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
