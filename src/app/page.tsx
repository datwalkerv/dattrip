import Link from "next/link";
import { DestinationImage } from "@/components/destination/destination-image";
import { HomeSearch } from "@/components/search/home-search";
import { CATALOGUE, catalogueGet } from "@/lib/catalogue";

const FEATURED = ["LIS", "BCN", "ROM", "ATH", "MLA", "CPH", "RAK", "DBV"].map((c) => catalogueGet(c)!).filter(Boolean);

export default async function Home({ searchParams }: PageProps<"/">) {
  const to = (await searchParams).to;
  const preset = typeof to === "string" && catalogueGet(to) ? { to: [to] } : undefined;
  return (
    <>
      <section className="mx-auto max-w-3xl pb-8 pt-14 text-center tablet:pt-24">
        <h1 className="text-display-2 font-semibold tracking-tight tablet:text-[56px] tablet:leading-[60px]">Find your next trip for less.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-body text-muted-foreground tablet:text-title-3">Discover the cheapest flights, the best hotels, and complete trips worth taking.</p>
      </section>

      <section id="search" aria-label="Search" className="mx-auto max-w-4xl scroll-mt-20">
        <HomeSearch key={preset?.to[0] ?? ""} initial={preset} />
      </section>

      <section className="mt-20" aria-labelledby="discover">
        <div className="flex items-baseline justify-between">
          <h2 id="discover" className="text-title-1 font-semibold tracking-tight">
            Where to next
          </h2>
          <p className="text-subhead text-muted-foreground">{CATALOGUE.length} destinations in Anywhere search</p>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 tablet:grid-cols-4 tablet:gap-4">
          {FEATURED.map((d) => (
            <li key={d.code}>
              <Link href={`/?to=${d.code}#search`} className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
                <DestinationImage destination={d} width={600} className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="p-3">
                  <p className="text-headline-2 font-medium">{d.city}</p>
                  <p className="text-footnote text-muted-foreground">
                    {d.country}
                    {d.photoCredit && ` · Photo: ${d.photoCredit.name} / Unsplash`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 grid gap-8 tablet:grid-cols-3" aria-label="How dattrip works">
        {[
          ["Flights and hotel, one price", "Every result is a complete trip: return flights for everyone plus the whole stay, added up."],
          ["Whole months, anywhere", "Search a month and a trip length. dattrip compares real date pairs instead of guessing from the cheapest outbound."],
          ["Hotels worth staying in", "Rated 8.0 or higher, within 3 km of the centre, breakfast first. Each pick says why it was chosen."],
        ].map(([title, body]) => (
          <div key={title}>
            <h3 className="text-headline-1 font-semibold">{title}</h3>
            <p className="mt-1.5 text-paragraph text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
