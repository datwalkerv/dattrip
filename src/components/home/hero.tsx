import Link from "next/link";
import { DestinationImage } from "@/components/destination/destination-image";
import type { Destination } from "@/types/trip";

/** Photo-led hero. The search card overlaps its bottom edge, so the panel leaves room below the text. */
export function Hero({ destination }: { destination: Destination }) {
  return (
    <section className="relative pt-4 tablet:pt-6" aria-labelledby="hero-title">
      <div className="relative h-[400px] overflow-hidden rounded-2xl bg-secondary tablet:h-[540px]">
        <DestinationImage destination={destination} width={1920} priority className="hero-drift absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" aria-hidden />
        <div className="relative flex h-full flex-col items-center justify-center px-6 pb-32 text-center text-white [text-shadow:0_1px_28px_rgb(0_0_0/0.55)] tablet:pb-48">
          <h1 id="hero-title" className="rise max-w-3xl text-[clamp(40px,6.4vw,72px)] font-semibold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]">
            Find your next trip for less.
          </h1>
          <p className="rise mt-5 max-w-2xl text-body text-white/90 [animation-delay:90ms] [text-wrap:balance] tablet:text-title-3">Discover the cheapest flights, the best hotels, and complete trips worth taking.</p>
        </div>
        {destination.photoCredit && (
          <Link href="/credits" className="absolute bottom-3 right-4 text-caption-2 text-white/70 hover:text-white">
            {destination.city} · {destination.photoCredit.name}
          </Link>
        )}
      </div>
    </section>
  );
}
