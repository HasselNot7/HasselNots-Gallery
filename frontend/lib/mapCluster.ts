/**
 * 足迹地图的邻近聚合：按当前 zoom 的投影像素做网格合并。
 * 纯函数、零依赖，单独成模块是为了能脱离浏览器逐级断言守恒性（见任务验收）。
 */

/** 按坐标 4 位小数分组后的基础点，是聚合的最小单位；P 为业务侧的照片类型 */
export type BasePoint<P> = {
  lat: number;
  lng: number;
  count: number;
  color: string;
  name: string | null;
  photos: P[];
};

/** 簇：一个网格桶里落下的所有基础点 */
export type Cluster<P> = {
  lat: number;
  lng: number;
  count: number;
  color: string;
  names: string[];
  photos: P[];
};

/** 桶边长（屏幕像素）：同一 zoom 下水平/垂直相距不到 60px 的点会被合并 */
export const CLUSTER_CELL_PX = 60;

/**
 * 每个基础点只会被投进唯一一个桶（key 由 floor 决定，投影坐标即使为负也只算一次），
 * 因此任意缩放级别下所有徽标数字之和恒等于照片总数 —— 聚合只是视觉合并，不改变数据。
 */
export function clusterBasePoints<P>(
  project: (lat: number, lng: number, zoom: number) => { x: number; y: number },
  points: BasePoint<P>[],
  zoom: number
): Cluster<P>[] {
  const buckets = new Map<string, BasePoint<P>[]>();
  for (const p of points) {
    const pt = project(p.lat, p.lng, zoom);
    const key = `${Math.floor(pt.x / CLUSTER_CELL_PX)},${Math.floor(pt.y / CLUSTER_CELL_PX)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  return Array.from(buckets.values()).map((members) => {
    const count = members.reduce((sum, m) => sum + m.count, 0);
    const lat = members.reduce((sum, m) => sum + m.lat * m.count, 0) / count;
    const lng = members.reduce((sum, m) => sum + m.lng * m.count, 0) / count;
    const names = Array.from(new Set(members.map((m) => m.name).filter((n): n is string => !!n)));
    const photos = members.flatMap((m) => m.photos);
    // 颜色跟随簇内照片最多的那个成员，平票时取先出现的，结果确定
    const dominant = members.reduce((a, b) => (b.photos.length > a.photos.length ? b : a), members[0]);
    return { lat, lng, count, color: dominant.color, names, photos };
  });
}
