#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if command -v systemctl &>/dev/null && systemctl list-unit-files 2>/dev/null | grep -q nettopology.service; then
  echo -e "\033[0;33mراه‌اندازی مجدد سرویس nettopology...\033[0m"
  sudo systemctl restart nettopology
  sudo systemctl status nettopology --no-pager
else
  "$DIR/stop.sh"
  sleep 1
  "$DIR/start.sh"
fi
