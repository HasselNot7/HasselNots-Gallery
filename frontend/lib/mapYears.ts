export interface YearMarker {
  shoot_time: string;
}

const YEAR_COLORS = [
  "#163828", // 深绿
  "#b23b2e", // 砖红
  "#2f6b8a", // 藏青
  "#8a5a2f", // 赭黄
  "#6b4fa0", // 紫
  "#2e7d5b", // 翠绿
  "#a8567a", // 玫红
  "#4f6a2e", // 橄榄
  "#7a2f8a", // 深紫
  "#2f8a7a", // 青绿
];

export function yearColor(year: number): string {
  const idx = ((year % 100) + 100) % 100 % YEAR_COLORS.length;
  return YEAR_COLORS[idx];
}

export function yearOf(shootTime: string): number | null {
  if (!shootTime) return null;
  const y = new Date(shootTime).getFullYear();
  return isNaN(y) ? null : y;
}

export function yearsForLegend(markers: YearMarker[]): number[] {
  const years = new Set<number>();
  markers.forEach((m) => {
    const y = yearOf(m.shoot_time);
    if (y !== null) years.add(y);
  });
  return [...years].sort((a, b) => b - a);
}
