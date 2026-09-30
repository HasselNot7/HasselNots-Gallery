"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Skeleton,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from "@heroui/react";
import { DetectedGear, GearItem, getGearFullImageUrl, getGearImageUrl, getToken } from "@/lib/api";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

interface Draft {
  id?: number;
  kind: "camera" | "lens";
  brand: string;
  model: string;
  label: string;
  focal_range: string;
  max_aperture: string;
  note: string;
}

const blankDraft = (kind: Draft["kind"] = "camera"): Draft => ({
  kind,
  brand: "",
  model: "",
  label: "",
  focal_range: "",
  max_aperture: "",
  note: "",
});

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextField className="w-full" value={value} onChange={onChange}>
      <Label className="text-label-caps text-outline">{label}</Label>
      <Input placeholder={placeholder} />
    </TextField>
  );
}

async function errorDetail(res: Response) {
  const body = await res.json().catch(() => null);
  return body?.detail || `HTTP ${res.status}`;
}

/**
 * 器材面板。照片里的 camera_model / lens_model 是 EXIF 自由文本，
 * 这里把它们登记成有品牌、封面、备注的条目；「从照片导入」列的就是库里真实出现过的型号。
 */
export default function GearPanel() {
  const [gears, setGears] = useState<GearItem[] | null>(null);
  const [detected, setDetected] = useState<DetectedGear[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const modalState = useOverlayState();
  const fileRef = useRef<HTMLInputElement>(null);
  // 同一个隐藏 input 服务所有行：点哪一行的「上传封面」就把 id 记在这里
  const uploadTarget = useRef<number | null>(null);

  const headers = () => ({ Authorization: `Bearer ${getToken()}` });
  const jsonHeaders = () => ({ ...headers(), "Content-Type": "application/json" });

  const load = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([
        fetch(`/api/gear`, { cache: "no-store" }),
        fetch(`/api/gear/detected`, { headers: { Authorization: `Bearer ${getToken()}` }, cache: "no-store" }),
      ]);
      if (!g.ok) toast.danger(`器材列表读取失败（HTTP ${g.status}）`);
      setGears(g.ok ? await g.json() : []);
      setDetected(d.ok ? await d.json() : []);
    } catch {
      toast.danger("器材列表读取失败");
      setGears([]);
    }
  }, []);

  useEffect(() => {
    // 与 admin 页其它面板一致：取数包在 async IIFE 里，setState 不落在 effect 同步段
    (async () => {
      await load();
    })();
  }, [load]);

  async function saveDraft() {
    if (!draft) return;
    const body = {
      kind: draft.kind,
      brand: draft.brand,
      model: draft.model,
      label: draft.label,
      focal_range: draft.focal_range,
      max_aperture: draft.max_aperture,
      note: draft.note,
    };
    setSaving(true);
    try {
      const res = await fetch(draft.id ? `/api/gear/${draft.id}` : `/api/gear`, {
        method: draft.id ? "PATCH" : "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.danger(await errorDetail(res));
        return;
      }
      const saved = (await res.json()) as GearItem;
      toast.success(draft.id ? "已保存" : `${saved.model} 已登记`);
      setDraft(null);
      modalState.close();
      load();
    } catch {
      toast.danger("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function removeGear(gear: GearItem) {
    if (!window.confirm(`删除「${gear.brand || ""} ${gear.model}」？照片不会受影响，只是这张器材卡消失。`)) return;
    const res = await fetch(`/api/gear/${gear.id}`, { method: "DELETE", headers: headers() });
    if (res.ok) toast.success("已删除");
    else toast.danger(await errorDetail(res));
    load();
  }

  function pickImage(id: number) {
    uploadTarget.current = id;
    fileRef.current?.click();
  }

  async function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = uploadTarget.current;
    e.target.value = "";
    if (!file || id === null) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/gear/${id}/image`, { method: "POST", headers: headers(), body: form });
    if (res.ok) toast.success("封面已更新");
    else toast.danger(await errorDetail(res));
    load();
  }

  async function removeImage(gear: GearItem) {
    const res = await fetch(`/api/gear/${gear.id}/image`, { method: "DELETE", headers: headers() });
    if (res.ok) toast.success("封面已移除");
    else toast.danger(await errorDetail(res));
    load();
  }

  async function importDetected(item: DetectedGear) {
    const res = await fetch(`/api/gear`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        kind: item.kind,
        model: item.model,
        brand: item.suggested_brand,
        focal_range: item.suggested_focal_range,
        max_aperture: item.suggested_max_aperture,
      }),
    });
    if (res.ok) toast.success(`${item.model} 已登记`);
    else toast.danger(await errorDetail(res));
    load();
  }

  const pending = detected.filter((d) => !d.known);
  const cameras = (gears ?? []).filter((g) => g.kind === "camera");
  const lenses = (gears ?? []).filter((g) => g.kind === "lens");

  function renderRow(gear: GearItem) {
    // updated_at 当版本号：换图后接口地址不变，不加它就命中浏览器里的旧缓存
    const cover = gear.has_image ? (
      <img
        src={`${getGearImageUrl(gear.id)}?v=${encodeURIComponent(gear.updated_at)}`}
        alt=""
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[22px] text-outline">
        {gear.kind === "camera" ? "photo_camera" : "center_focus_strong"}
      </span>
    );

    return (
      <Card key={gear.id} className="flex-row items-center gap-3 p-3">
        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
          {/* 缩略图点开原图：原图存了但平时用不到，给个入口比加一个按钮省地方 */}
          {gear.has_full_image ? (
            <a
              href={getGearFullImageUrl(gear.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full"
              title="在新标签页查看原图"
              aria-label={`${gear.model} 原图`}
            >
              {cover}
            </a>
          ) : (
            cover
          )}
        </div>
        <div className="min-w-0 flex-1">
          {/* 分组标题已经写了机身/镜头，行内再放一个胶囊只会挤掉品牌名（390 宽实测截成「F…」） */}
          <div className="truncate text-body-md text-on-surface">{gear.brand || "无品牌"}</div>
          <div className="mt-0.5 truncate text-metadata-sm text-outline" style={{ fontFamily: MONO }} title={gear.model}>
            {gear.model}
            {gear.focal_range ? ` · ${gear.focal_range}` : ""}
            {gear.max_aperture ? ` ${gear.max_aperture}` : ""}
          </div>
          {gear.label && <div className="mt-0.5 truncate text-metadata-sm text-on-surface-variant">展示名：{gear.label}</div>}
        </div>
        <div className="flex shrink-0 gap-1">
          {/* 「封面」两字在 390 宽下会把品牌挤成「Fujififi…」，窄屏退成纯图标按钮 */}
          <Button size="sm" variant="outline" aria-label="上传封面" onPress={() => pickImage(gear.id)}>
            <span className="material-symbols-outlined text-[16px]">publish</span>
            <span className="max-sm:hidden">封面</span>
          </Button>
          {gear.has_image && (
            <Button isIconOnly size="sm" variant="ghost" aria-label="移除封面" onPress={() => removeImage(gear)}>
              <span className="material-symbols-outlined text-[18px]">image_not_supported</span>
            </Button>
          )}
          <Button isIconOnly size="sm" variant="ghost" aria-label="编辑" onPress={() => openEditor(gear)}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </Button>
          <Button isIconOnly size="sm" variant="ghost" aria-label="删除" onPress={() => removeGear(gear)}>
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </Button>
        </div>
      </Card>
    );
  }

  function openEditor(gear?: GearItem) {
    setDraft(gear ? { ...gear } : blankDraft());
    modalState.open();
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFilePicked} className="hidden" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-headline-lg text-primary">器材</h2>
        <Button onPress={() => openEditor()}>
          <span className="material-symbols-outlined text-[16px]">add</span>
          新增器材
        </Button>
      </div>

      {gears === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h3 className="mb-3 text-label-caps uppercase tracking-widest text-outline">
                从照片 EXIF 导入 · {pending.length} 个型号还没登记
              </h3>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {pending.map((d) => (
                  <Card key={`${d.kind}-${d.model}`} className="flex-row items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body-md text-on-surface" title={d.model}>
                        {d.suggested_brand || "未知品牌"} {d.model}
                      </div>
                      <div className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
                        {d.photos} 张 · {d.kind === "camera" ? "机身" : "镜头"}
                        {d.suggested_focal_range ? ` · ${d.suggested_focal_range} ${d.suggested_max_aperture}` : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onPress={() => importDetected(d)}>
                      登记
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {[
            { title: "机身", items: cameras },
            { title: "镜头", items: lenses },
          ].map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-label-caps uppercase tracking-widest text-outline">
                {group.title} · {group.items.length}
              </h3>
              {group.items.length === 0 ? (
                <EmptyState className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined mb-2 text-5xl text-outline">
                    {group.title === "机身" ? "photo_camera" : "center_focus_strong"}
                  </span>
                  <p className="text-body-md">还没有登记{group.title}</p>
                </EmptyState>
              ) : (
                <div className="space-y-2">{group.items.map(renderRow)}</div>
              )}
            </section>
          ))}
        </div>
      )}

      {draft && (
        <Modal.Backdrop isOpen={modalState.isOpen} onOpenChange={modalState.setOpen} variant="blur">
          <Modal.Container scroll="inside">
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{draft.id ? "编辑器材" : "新增器材"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <div className="flex gap-2">
                  {(["camera", "lens"] as const).map((kind) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant={draft.kind === kind ? "primary" : "outline"}
                      onPress={() => setDraft({ ...draft, kind })}
                    >
                      {kind === "camera" ? "机身" : "镜头"}
                    </Button>
                  ))}
                </div>
                <Field label="品牌" value={draft.brand} onChange={(v) => setDraft({ ...draft, brand: v })} placeholder="Sony / Sigma / Fujifilm" />
                <Field
                  label="型号（EXIF 原样）*"
                  value={draft.model}
                  onChange={(v) => setDraft({ ...draft, model: v })}
                  placeholder="ILCE-7CM2"
                />
                <p className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
                  型号要和照片 EXIF 一字不差才对得上，优先用上面的「登记」按钮从实测值导入。
                </p>
                <Field label="展示名" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} placeholder="留空则用「品牌 型号」" />
                {draft.kind === "lens" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="焦段" value={draft.focal_range} onChange={(v) => setDraft({ ...draft, focal_range: v })} placeholder="28-70mm" />
                    <Field label="最大光圈" value={draft.max_aperture} onChange={(v) => setDraft({ ...draft, max_aperture: v })} placeholder="F2.8" />
                  </div>
                )}
                <TextField className="w-full" value={draft.note} onChange={(v) => setDraft({ ...draft, note: v })}>
                  <Label className="text-label-caps text-outline">备注</Label>
                  <TextArea rows={3} placeholder="手感、搭配、下次想试什么" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setDraft(null)}>
                  取消
                </Button>
                <Button isDisabled={saving || !draft.model.trim()} isPending={saving} onPress={saveDraft}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </div>
  );
}
