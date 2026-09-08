#!/usr/bin/env bash

# NetTopology Uninstaller Script
if [ "$EUID" -ne 0 ]; then
  echo "لطفاً با دسترسی root یا sudo اجرا نمایید: sudo bash uninstall.sh"
  exit 1
fi

echo "در حال متوقف‌سازی و حذف سرویس nettopology..."
systemctl stop nettopology.service 2>/dev/null || true
systemctl disable nettopology.service 2>/dev/null || true
rm -f /etc/systemd/system/nettopology.service
systemctl daemon-reload

pkill -f "dist/server.cjs" || true
pkill -f "server.py" || true

echo "سرویس با موفقیت حذف شد."
