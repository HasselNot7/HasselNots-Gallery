#!/bin/bash
# 生产服务器启动脚本（systemd 也使用此配置）
# 用法: ./start-frontend-prod.sh [--build]
#   --build  先构建再启动（部署新代码后使用）
export NODE_ENV=production
cd "$(dirname "$0")/frontend"
if [ "$1" = "--build" ]; then
  npm run build
fi
exec npm run start
