#!/usr/bin/env bash

# ==============================================================================
#  NetTopology - Cisco Network Topology & Port Security Automation Panel
#  Automated Installation Script for Linux (Ubuntu, Debian, RHEL, CentOS, Fedora, Arch)
# ==============================================================================

set -e

# Color definitions for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print Banner
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║     🌐  NetTopology - Enterprise Network Management Panel        ║"
echo "║     🚀  Version: 1.3.3 (Production Stable)                       ║"
echo "║     🛡️  Cisco Port Security & CDP/LLDP Topology Visualizer       ║"
echo "║     🎨  Spatial Cyber Neon & Multi-Theme Network Studio          ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}[1/6]${NC} ${BOLD}بررسی سطح دسترسی کاربر (Checking privileges)...${NC}"
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}توجه: برای نصب پکیج‌های سیستمی و ساخت سرویس systemd نیاز به دسترسی root / sudo است.${NC}"
  echo -e "${YELLOW}لطفاً اسکریپت را با sudo اجرا نمایید: sudo bash install.sh${NC}"
  echo ""
  read -p "آیا می‌خواهید با sudo مجدداً اجرا شود؟ (y/N): " choice
  if [[ "$choice" =~ ^[Yy]$ ]]; then
    exec sudo bash "$0" "$@"
  else
    echo -e "${RED}خطا: دسترسی کافی وجود ندارد. نصب متوقف شد.${NC}"
    exit 1
  fi
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "${GREEN}✓ مسیر ریشه پنل:${NC} $APP_DIR"

# Detect Local & Public IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
[ -z "$LOCAL_IP" ] && LOCAL_IP="127.0.0.1"

echo -e "\n${YELLOW}>>> لطفاً تنظیمات شبکه و پورت امن SSL را مشخص کنید:${NC}"
read -p "آدرس دامنه یا آی‌پی سرور جهت صدور گواهی SSL [پیش‌فرض: $LOCAL_IP]: " PANEL_DOMAIN
PANEL_DOMAIN="${PANEL_DOMAIN:-$LOCAL_IP}"

while true; do
  read -p "پورت امن HTTPS / SSL برای دسترسی به پنل NetTopology [پیش‌فرض: 8443]: " PANEL_SSL_PORT
  PANEL_SSL_PORT="${PANEL_SSL_PORT:-8443}"
  if [[ "$PANEL_SSL_PORT" =~ ^[0-9]+$ ]] && [ "$PANEL_SSL_PORT" -ge 1 ] && [ "$PANEL_SSL_PORT" -le 65535 ]; then
    break
  else
    echo -e "${RED}پورت نامعتبر است. یک عدد بین 1 تا 65535 وارد کنید.${NC}"
  fi
done

# Internal loopback ports for Node and Python (isolated from external network)
INTERNAL_NODE_PORT="3000"
INTERNAL_BACKEND_PORT="5001"
if [ "$PANEL_SSL_PORT" -eq "$INTERNAL_NODE_PORT" ]; then
  INTERNAL_NODE_PORT="13000"
fi
if [ "$PANEL_SSL_PORT" -eq "$INTERNAL_BACKEND_PORT" ]; then
  INTERNAL_BACKEND_PORT="15001"
fi

echo -e "${CYAN}✓ معماری امنیتی SSL تنظیم شد:${NC}"
echo -e "  • دسترسی عمومی: صرفاً از طریق HTTPS با پورت $PANEL_SSL_PORT و گواهی Self-Signed"
echo -e "  • جداسازی داخلی: سرویس‌های Node.js و Python به لوپ‌بک محلی (127.0.0.1) محدود شدند.\n"

# ذخیره تنظیمات در فایل .env
cat << EOF > "$APP_DIR/.env"
NODE_ENV=production
HOST=127.0.0.1
PYTHON_HOST=127.0.0.1
PORT=$INTERNAL_NODE_PORT
FRONTEND_PORT=$INTERNAL_NODE_PORT
BACKEND_PORT=$INTERNAL_BACKEND_PORT
PYTHON_PORT=$INTERNAL_BACKEND_PORT
PANEL_SSL_PORT=$PANEL_SSL_PORT
PANEL_DOMAIN=$PANEL_DOMAIN
EOF

# ------------------------------------------------------------------------------
# 2. Package Manager & System Dependencies
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[2/6]${NC} ${BOLD}نصب پیش‌نیازهای سیستمی (Python3, Git, Curl)...${NC}"

if command -v apt-get &>/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y curl git python3 python3-pip
elif command -v dnf &>/dev/null; then
  dnf install -y curl git python3 python3-pip
elif command -v yum &>/dev/null; then
  yum install -y curl git python3 python3-pip
elif command -v pacman &>/dev/null; then
  pacman -Sy --noconfirm curl git python python-pip
else
  echo -e "${YELLOW}مدیریت پکیج شناخته نشد، لطفاً از نصب بودن git, curl و python3 اطمینان حاصل فرمایید.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Node.js & NPM Installation (Node 18+ or 20+ required)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[3/6]${NC} ${BOLD}بررسی و نصب Node.js (v20 LTS)...${NC}"

INSTALL_NODE=false
if ! command -v node &>/dev/null; then
  INSTALL_NODE=true
else
  NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    echo -e "${YELLOW}نسخه فعلی Node.js ($NODE_VER) قدیمی است. نسخه ۲۰ LTS نصب می‌شود.${NC}"
    INSTALL_NODE=true
  else
    echo -e "${GREEN}✓ Node.js نسخه $(node -v) قبلاً نصب است.${NC}"
  fi
fi

if [ "$INSTALL_NODE" = true ]; then
  echo -e "${CYAN}در حال دریافت و نصب Node.js 20 LTS...${NC}"
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  elif command -v pacman &>/dev/null; then
    pacman -S --noconfirm nodejs npm
  fi
  echo -e "${GREEN}✓ Node.js $(node -v) و NPM $(npm -v) با موفقیت نصب شدند.${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Install Project Dependencies & Build App
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[4/6]${NC} ${BOLD}نصب وابستگی‌های پروژه و بیلد نهایی پنل (Building NetTopology)...${NC}"

# Ensure correct permissions
chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR" 2>/dev/null || true

# Run npm install as normal user if sudo was used
if [ -n "$SUDO_USER" ]; then
  su - "$SUDO_USER" -c "cd '$APP_DIR' && npm install"
  su - "$SUDO_USER" -c "cd '$APP_DIR' && npm run build"
else
  npm install
  npm run build
fi

echo -e "${GREEN}✓ کامپایل و بیلد پروژه با موفقیت انجام شد.${NC}"

# ------------------------------------------------------------------------------
# 5. Create Management Scripts (start.sh, stop.sh, restart.sh)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[5/6]${NC} ${BOLD}ایجاد اسکریپت‌های مدیریت پنل (Start/Stop/Restart)...${NC}"

# start.sh
cat << 'EOF' > "$APP_DIR/start.sh"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if command -v systemctl &>/dev/null && systemctl list-unit-files | grep -q nettopology.service; then
  echo -e "\033[0;32mروشن کردن سرویس nettopology از طریق systemd...\033[0m"
  sudo systemctl start nettopology
  sudo systemctl status nettopology --no-pager
else
  echo -e "\033[0;36mاجرای پنل در حالت مستقیم...\033[0m"
  node dist/server.cjs
fi
EOF
chmod +x "$APP_DIR/start.sh"

# stop.sh
cat << 'EOF' > "$APP_DIR/stop.sh"
#!/usr/bin/env bash
if command -v systemctl &>/dev/null && systemctl list-unit-files | grep -q nettopology.service; then
  echo -e "\033[0;33mمتوقف کردن سرویس nettopology...\033[0m"
  sudo systemctl stop nettopology
  echo -e "\033[0;32mسرویس متوقف شد.\033[0m"
else
  echo -e "\033[0;33mبستن پروسه‌های در حال اجرای سرور...\033[0m"
  pkill -f "dist/server.cjs" || true
  pkill -f "server.py" || true
  echo -e "\033[0;32mپروسه‌ها بسته شدند.\033[0m"
fi
EOF
chmod +x "$APP_DIR/stop.sh"

# restart.sh
cat << 'EOF' > "$APP_DIR/restart.sh"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
if command -v systemctl &>/dev/null && systemctl list-unit-files | grep -q nettopology.service; then
  echo -e "\033[0;33mراه‌اندازی مجدد سرویس nettopology...\033[0m"
  sudo systemctl restart nettopology
  sudo systemctl status nettopology --no-pager
else
  "$DIR/stop.sh"
  sleep 1
  "$DIR/start.sh"
fi
EOF
chmod +x "$APP_DIR/restart.sh"

# ------------------------------------------------------------------------------
# 6. Configure Systemd Service (Autostart on Boot)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[6/6]${NC} ${BOLD}پیکربندی سرویس سیستم‌دی (systemd daemon)...${NC}"

NODE_BIN=$(command -v node)
SERVICE_FILE="/etc/systemd/system/nettopology.service"
RUN_USER=${SUDO_USER:-$(whoami)}

# Ensure execute permissions
chmod +x "$APP_DIR"/*.sh 2>/dev/null || true
chmod +x "$APP_DIR/backend/server.py" 2>/dev/null || true

# Stop previous instances if running
systemctl stop nettopology.service 2>/dev/null || true
pkill -f "dist/server.cjs" 2>/dev/null || true
pkill -f "backend/server.py" 2>/dev/null || true
sleep 1

cat << EOF > "$SERVICE_FILE"
[Unit]
Description=NetTopology - Network Management & Port Security Panel
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=-$APP_DIR/.env
ExecStart=$NODE_BIN $APP_DIR/dist/server.cjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PYTHON_HOST=127.0.0.1
Environment=PORT=$INTERNAL_NODE_PORT
Environment=FRONTEND_PORT=$INTERNAL_NODE_PORT
Environment=BACKEND_PORT=$INTERNAL_BACKEND_PORT
Environment=PYTHON_PORT=$INTERNAL_BACKEND_PORT

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nettopology.service
systemctl restart nettopology.service

# Check health
sleep 2
if ! systemctl is-active --quiet nettopology.service; then
  echo -e "${RED}خطا: سرویس با موفقیت فعال نشد. لاگ‌های زیر را بررسی کنید:${NC}"
  journalctl -u nettopology.service -n 25 --no-pager || true
fi

# Configure Nginx Reverse Proxy with Strict Self-Signed SSL Only
echo ""
echo -e "${BLUE}[6/6]${NC} ${BOLD}پیکربندی Nginx و گواهی امنیتی Self-Signed SSL روی پورت $PANEL_SSL_PORT...${NC}"
if command -v apt-get &>/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx openssl < /dev/null || true
elif command -v dnf &>/dev/null; then
  dnf install -y nginx openssl || true
fi

# Remove default site
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

mkdir -p /etc/nginx/ssl
SSL_CERT="/etc/nginx/ssl/nettopology.crt"
SSL_KEY="/etc/nginx/ssl/nettopology.key"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
  echo -e "${CYAN}در حال صدور گواهی 10 ساله Self-Signed SSL برای $PANEL_DOMAIN...${NC}"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CERT" \
    -subj "/CN=$PANEL_DOMAIN/O=NetTopology/OU=Enterprise Network Security" 2>/dev/null || true
  chmod 600 "$SSL_KEY"
fi

NGINX_CONF="/etc/nginx/sites-available/nettopology.conf"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cat << EOF > "$NGINX_CONF"
# NetTopology - Enterprise Cisco Topology & Management Panel
# Strict HTTPS / Self-Signed SSL Mode (Port $PANEL_SSL_PORT)
server {
    listen $PANEL_SSL_PORT ssl http2;
    listen [::]:$PANEL_SSL_PORT ssl http2;
    server_name $PANEL_DOMAIN _;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    client_max_body_size 50M;

    error_page 497 301 =301 https://\$host:$PANEL_SSL_PORT\$request_uri;

    location / {
        proxy_pass http://127.0.0.1:$INTERNAL_NODE_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$INTERNAL_NODE_PORT/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/nettopology.conf"
if nginx -t &>/dev/null; then
  systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
fi

# Firewall Check (UFW)
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$PANEL_SSL_PORT/tcp" comment 'NetTopology Secure HTTPS SSL' 2>/dev/null || true
  ufw delete allow 3000/tcp 2>/dev/null || true
  ufw delete allow 5001/tcp 2>/dev/null || true
  ufw delete allow 80/tcp 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD} 🎉  نصب و پیکربندی امنیتی با موفقیت کامل انجام شد!                 ${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "🔒 ${BOLD}آدرس امن دسترسی به پنل (Strict Self-Signed SSL):${NC}"
echo -e "   ${GREEN}${BOLD}https://${PANEL_DOMAIN}:${PANEL_SSL_PORT}${NC}"
echo ""
echo -e "🛡️  ${BOLD}وضعیت معماری امنیتی:${NC}"
echo -e "   • حالت: ${PURPLE}${BOLD}فقط SSL / HTTPS فعال است (پورت ${PANEL_SSL_PORT})${NC}"
echo -e "   • پورت‌های داخلی: ${BLUE}روی 127.0.0.1 ایزوله و محافظت شده‌اند${NC}"
echo -e "   • گواهی SSL: ${YELLOW}/etc/nginx/ssl/nettopology.crt${NC}"
echo ""
echo -e "🔹 ${BOLD}دستورات مدیریت پنل:${NC}"
echo -e "   • وضعیت سرویس:          ${YELLOW}sudo systemctl status nettopology${NC}"
echo -e "   • ری‌استارت سرویس:        ${YELLOW}sudo systemctl restart nettopology && sudo systemctl restart nginx${NC}"
echo -e "   • متوقف کردن سرویس:     ${YELLOW}sudo systemctl stop nettopology && sudo systemctl stop nginx${NC}"
echo -e "   • مشاهده لاگ‌های زنده:    ${YELLOW}sudo journalctl -u nettopology -f${NC}"
echo ""
echo -e "${PURPLE}${BOLD}از استفاده از پنل مدیریت و امنیت شبکه سیسکو لذت ببرید! 🚀${NC}"
