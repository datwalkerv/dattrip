"use client";

import { Skeleton } from "datui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-6" aria-busy="true" aria-label="Checking current prices">
      <Skeleton width="40%" height={20} visibilityDelay={150} />
      <Skeleton width="100%" height={320} borderRadius={16} visibilityDelay={150} />
      <Skeleton width="60%" height={28} visibilityDelay={150} />
      <Skeleton width="80%" height={16} visibilityDelay={150} />
    </div>
  );
}
