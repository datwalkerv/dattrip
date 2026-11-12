"use client";

import { buttonVariants } from "datui";
import Link from "next/link";

type Variants = NonNullable<Parameters<typeof buttonVariants>[0]>;

/** A link that looks like a datui Button. datui's variants are client-only, so server pages go through this. */
export function LinkButton({ href, external, variant, appearance, size = "m", stretched, className, children }: { href: string; external?: boolean; className?: string; children: React.ReactNode } & Pick<Variants, "variant" | "appearance" | "size" | "stretched">) {
  const cls = buttonVariants({ variant, appearance, size, stretched, className });
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={cls}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
