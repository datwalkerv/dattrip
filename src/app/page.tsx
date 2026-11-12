import { Hero } from "@/components/home/hero";
import { HomeClient } from "@/components/home/home-client";
import { HowItWorks } from "@/components/home/how-it-works";
import { catalogueGet } from "@/lib/catalogue";

const HERO = catalogueGet("DBV")!;

export default async function Home({ searchParams }: PageProps<"/">) {
  const to = (await searchParams).to;
  const preset = typeof to === "string" && catalogueGet(to) ? { to: [to] } : undefined;
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const month = next.toISOString().slice(0, 7);
  return (
    <>
      <Hero destination={HERO} />
      <HomeClient preset={preset} month={month} />
      <HowItWorks />
    </>
  );
}
