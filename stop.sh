#!/usr/bin/env bash
if command -v systemctl &>/dev/null && systemctl list-unit-files 2>/dev/null | grep -q nettopology.service; then
  echo -e "\033[0;33mمتوقف کردن سرویس nettopology...\033[0m"
  sudo systemctl stop nettopology
  echo -e "\033[0;32mسرویس متوقف شد.\033[0m"
else
  echo -e "\033[0;33mبستن پروسه‌های در حال اجرای سرور...\033[0m"
  pkill -f "dist/server.cjs" || true
  pkill -f "server.py" || true
  echo -e "\033[0;32mپروسه‌ها بسته شدند.\033[0m"
fi
