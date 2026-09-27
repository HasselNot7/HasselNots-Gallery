"use client";

import { useState } from "react";
import type { ComponentProps, ReactElement } from "react";
import { Button, Tooltip } from "@heroui/react";

function Glyph({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 16 }}>
      {name}
    </span>
  );
}

/**
 * 图标钮的悬停提示。用 render 把触发属性直接交给 <a>/<Button> 本身：
 * Tooltip.Trigger 默认会再包一层 div[role=button][tabindex=0]，多出一个 tab 停靠点。
 */
function Tip({
  label,
  render,
}: {
  label: string;
  // Trigger 的泛型只按它默认的 div 推断，回传的交互属性与宿主标签无关，故在调用处各自收窄
  render: (props: ComponentProps<"div">) => ReactElement;
}) {
  return (
    <Tooltip delay={400}>
      <Tooltip.Trigger render={render} />
      <Tooltip.Content placement="top" showArrow>
        <Tooltip.Arrow />
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

export default function PhotoActions({ exifText, href }: { exifText: string; href: string }) {
  const [note, setNote] = useState("");
  const copyExif = async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(exifText);
    } catch {
      ok = false;
    }
    setNote(ok ? "EXIF 已复制" : "复制失败");
    setTimeout(() => setNote(""), 1800);
  };
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Tip
          label="查看原图"
          render={(props) => (
            // HeroUI 的 Button 明确不接受 href，链接只能套它的 BEM 类复刻同款圆钮
            <a
              {...(props as ComponentProps<"a">)}
              aria-label="查看原图"
              className="button button--icon-only button--outline button--sm no-underline"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Glyph name="download" />
            </a>
          )}
        />
        <Tip
          label="复制 EXIF"
          render={(props) => (
            <Button
              {...(props as unknown as ComponentProps<typeof Button>)}
              aria-label="复制 EXIF"
              isIconOnly
              onPress={copyExif}
              size="sm"
              variant="outline"
            >
              <Glyph name="content_copy" />
            </Button>
          )}
        />
      </div>
      <span aria-live="polite" className="h-4 text-[10px] text-outline">
        {note}
      </span>
    </div>
  );
}
