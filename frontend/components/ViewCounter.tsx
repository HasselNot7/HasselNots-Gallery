"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Increments the view counter once per page load (client-side, after hydration)
 * and reflects the live count.
 */
export default function ViewCounter({
  kind,
  slug,
  currentViews,
}: {
  kind: "article" | "photo";
  slug: string;
  currentViews: number;
}) {
  const [views, setViews] = useState(currentViews);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/${kind === "article" ? "articles" : "photos"}/${slug}/view`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.views === "number") setViews(d.views);
      })
      .catch(() => {});
  }, [kind, slug]);

  return (
    <span className="inline-flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">visibility</span>
      {views}
    </span>
  );
}
