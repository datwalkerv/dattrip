import { BedDouble, CalendarRange, Receipt } from "lucide-react";

const STEPS = [
  { icon: CalendarRange, title: "Search a whole month", body: "Pick where you fly from, a month and a trip length. dattrip compares real outbound and return date pairs, not just the cheapest way out." },
  { icon: BedDouble, title: "Hotels worth staying in", body: "Every stay is rated 8.0 or higher and within 3 km of the centre. Breakfast-inclusive rates come first, and each pick says why it was chosen." },
  { icon: Receipt, title: "One honest total", body: "Return flights for everyone plus the whole stay and any fees paid at the hotel, added up. Then book each part on the provider's own site." },
];

export function HowItWorks() {
  return (
    <section className="mt-16 tablet:mt-24" aria-labelledby="how-title">
      <h2 id="how-title" className="text-title-1 font-semibold tracking-tight tablet:text-display-4">
        The whole trip, priced before you book
      </h2>
      <ol className="mt-8 grid gap-4 tablet:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="tabular text-subhead text-muted-foreground" aria-hidden>
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-headline-1 font-semibold">{title}</h3>
            <p className="mt-2 text-paragraph text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
