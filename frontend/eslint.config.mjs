import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 本站图片由后端与 Cloudflare R2 直出，刻意使用原生 <img> 配 loading="lazy"，
      // 不接入 next/image 的优化管线与域名白名单：源站已经按尺寸出缩略图，
      // 再套一层 loader 只会增加配置面与运行时开销。
      // 这是项目决策而非缺陷，留着 16 条告警只会淹没真实问题。
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
