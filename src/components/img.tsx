/* Remote photos come already sized from provider CDNs, so they bypass Vercel's image optimizer and its Hobby quota. */
/* eslint-disable @next/next/no-img-element */
export function Img({ alt, className, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  return <img alt={alt} loading="lazy" decoding="async" className={className} {...rest} />;
}
