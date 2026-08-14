"use client";

import { useEffect } from "react";

/** 页面加载时上报一次 PV（POST /api/visit）。 */
export default function VisitTracker() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    fetch(`/api/visit?path=${encodeURIComponent(path)}`, { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
