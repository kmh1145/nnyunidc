#!/bin/sh
set -e

echo "🔧 初始化数据库表结构..."
npx prisma db push --skip-generate

echo "🌱 初始化默认数据..."
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/init-db.ts

echo "🚀 启动应用..."
exec node server.js
