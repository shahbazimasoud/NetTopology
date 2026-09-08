#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if command -v systemctl &>/dev/null && systemctl list-unit-files 2>/dev/null | grep -q nettopology.service; then
  echo -e "\033[0;32mروشن کردن سرویس nettopology از طریق systemd...\033[0m"
  sudo systemctl start nettopology
  sudo systemctl status nettopology --no-pager
else
  echo -e "\033[0;36mاجرای پنل در حالت مستقیم Node...\033[0m"
  if [ -f "dist/server.cjs" ]; then
    node dist/server.cjs
  else
    npm run dev
  fi
fi
