"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { Img } from "@/components/img";

const navBtn = "absolute flex size-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white";

export function HotelGallery({ images, name }: { images: string[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const n = images.length;
  const go = (d: number) => setIndex((i) => (i + d + n) % n);
  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };

  return (
    <>
      <div className={`mt-4 grid gap-2 overflow-hidden rounded-lg ${n >= 3 ? "grid-cols-2 tablet:grid-cols-4" : "grid-cols-1"}`}>
        {images.slice(0, 5).map((src, i) => (
          <button key={src} type="button" onClick={() => open(i)} aria-label={`Open photo ${i + 1} of ${n}`} className={`cursor-zoom-in ${n >= 3 && i === 0 ? "col-span-2 row-span-2" : ""}`}>
            <Img src={src} alt={`${name}, photo ${i + 1}`} className={`w-full object-cover ${n >= 3 && i === 0 ? "h-full max-h-80" : "h-40 tablet:h-[9.75rem]"}`} />
          </button>
        ))}
      </div>

      {/* The dialog fills the viewport, so a click that lands on it (not on the image or buttons) is an outside click. */}
      <dialog
        ref={dialog}
        aria-label={`${name} photos`}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        className="m-0 size-full max-h-none max-w-none bg-black/90 p-0 backdrop:bg-transparent open:flex open:items-center open:justify-center"
      >
        <Img src={images[index]} alt={`${name}, photo ${index + 1} of ${n}`} loading="eager" className="max-h-[90vh] max-w-[92vw] object-contain" />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-footnote text-white/80 tabular">
          {index + 1} / {n}
        </p>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className={`${navBtn} top-4 right-4`}>
          <X className="size-5" />
        </button>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${navBtn} left-4 top-1/2 -translate-y-1/2`}>
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${navBtn} right-4 top-1/2 -translate-y-1/2`}>
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
