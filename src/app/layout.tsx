import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "dattrip — find your next trip for less", template: "%s · dattrip" },
  description: "Discover the cheapest flights, the best hotels, and complete trips worth taking.",
  applicationName: "dattrip",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
};

// Applies the saved theme before first paint so dark mode never flashes white.
const themeScript = `try{var t=localStorage.getItem("dattrip:theme")||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

const driveScript = `(function(){var script=document.createElement("script");script.async=1;script.setAttribute("data-cmp-ab","2");script.src='https://tp-em.com/NTk5OTE4.js?t=599918';document.head.appendChild(script);})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Travelpayouts Drive: site verification and affiliate tracking. Kept as their inline loader so their checker recognises it. */}
        <script data-noptimize="1" data-cfasync="false" data-wpfc-render="false" seraph-accel-crit="1" data-no-defer="1" data-cmp-ab="2" dangerouslySetInnerHTML={{ __html: driveScript }} />
      </head>
      <body>
        <Providers>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 pb-24 tablet:px-6">{children}</main>
          <footer className="border-t border-separator">
            <p className="mx-auto max-w-6xl px-4 py-6 text-footnote text-muted-foreground tablet:px-6">
              dattrip compares prices from Aviasales (flights) and LiteAPI (hotels) and links out to book. Flight prices are recent fares found by other travellers and can change; the final price is the one on the booking site.{" "}
              <Link href="/credits" className="underline underline-offset-2 hover:text-foreground">
                Photo credits
              </Link>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
