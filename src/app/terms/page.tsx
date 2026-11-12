import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of use" };

const SECTIONS: [string, React.ReactNode][] = [
  [
    "What dattrip does",
    "dattrip compares prices from Aviasales (flights) and LiteAPI (hotels) and links out to book. It is a search and comparison tool: it does not sell flights or hotel rooms, take payments or hold reservations.",
  ],
  [
    "Prices can change",
    "Flight prices are recent fares found by other travellers and can change; the final price is the one on the booking site. For more than one traveller, flight totals are estimated from the single-adult fare. Hotel prices are checked for your dates and guests when you search and again when you click through, but availability can end at any time.",
  ],
  [
    "Booking happens elsewhere",
    "When you choose to book, you leave dattrip and deal directly with the booking site. Its terms, prices, baggage rules, cancellation policy and customer service apply. Check the details there before you pay.",
  ],
  ["Partner links", "Some booking links are affiliate links: dattrip may earn a commission when you book through them, at no extra cost to you. This does not change how results are ranked."],
  [
    "AI answers",
    "The search box and trip assistant use an AI model to read your request and to summarise the offers on screen. It can be wrong. Prices, ratings and availability always come from the providers, not from the AI.",
  ],
  ["No guarantee", "dattrip is provided as is. We work to show accurate, current information but cannot guarantee it, and we are not liable for costs that arise from a price or availability change or from a booking made on another site."],
  [
    "Your data",
    "Saved trips and your theme choice are stored in your own browser and never sent to us. Searches are sent to the providers above to get prices. A Travelpayouts script is loaded to attribute partner bookings.",
  ],
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl pt-10">
      <h1 className="text-title-1 font-semibold tracking-tight">Terms of use</h1>
      <p className="mt-1 text-subhead text-muted-foreground">By using dattrip you agree to the following.</p>
      <div className="mt-8 flex flex-col gap-7">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-headline-1 font-semibold">{title}</h2>
            <p className="mt-1.5 text-paragraph text-muted-foreground">{body}</p>
          </section>
        ))}
        <section>
          <h2 className="text-headline-1 font-semibold">Photos</h2>
          <p className="mt-1.5 text-paragraph text-muted-foreground">
            Destination photos are from Unsplash photographers, listed on the{" "}
            <Link href="/credits" className="underline underline-offset-2 hover:text-foreground">
              photo credits
            </Link>{" "}
            page. Hotel photos are supplied by the hotel provider.
          </p>
        </section>
      </div>
    </article>
  );
}
