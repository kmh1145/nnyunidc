#!/bin/sh
set -e

echo ">>> 初始化数据库表..."
npx prisma db push --skip-generate

echo ">>> 初始化默认数据..."
node scripts/init-db.mjs

echo ">>> 启动应用..."
exec node server.js
