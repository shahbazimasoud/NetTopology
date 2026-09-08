#!/usr/bin/env bash
# ==============================================================================
# NetTopology — Enterprise Cisco Network Topology & Port Security Management Panel
# Automated VPS & Server Setup Installer
# Supports Ubuntu 20.04/22.04/24.04, Debian 11/12, and other Debian-based systems
# ==============================================================================

set -eo pipefail

# Make script non-interactive for underlying package managers
export DEBIAN_FRONTEND=noninteractive
export APT_LISTCHANGES_FRONTEND=none
export NEEDRESTART_MODE=a
export UCF_FORCE_CONFFOLD=1

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logger functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PANEL_VERSION="latest"

clear 2>/dev/null || true
echo -e "${CYAN}${BOLD}"
cat << "EOF"
======================================================================
  ███╗   ██╗███████╗████████╗████████╗ ██████╗ ██████╗  ██████╗ 
  ████╗  ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗
  ██╔██╗ ██║█████╗     ██║      ██║   ██║   ██║██████╔╝██║   ██║
  ██║╚██╗██║██╔══╝     ██║      ██║   ██║   ██║██╔═══╝ ██║   ██║
  ██║ ╚████║███████╗   ██║      ██║   ╚██████╔╝██║     ╚██████╔╝
  ╚═╝  ╚═══╝╚══════╝   ╚═╝      ╚═╝    ╚═════╝ ╚═╝      ╚═════╝ 
        CISCO NETWORK TOPOLOGY & PORT SECURITY MANAGEMENT PANEL
        Developer: Masoud Shahbazi (https://www.linkedin.com/in/masoudshahbazi/)
        Repository: https://github.com/shahbazimasoud/NetTopology
======================================================================
EOF
echo -e "${NC}"

# Check privileges
if [ "$EUID" -ne 0 ]; then
  log_error "Please run this installer as root (using sudo)."
  echo -e "${YELLOW}Usage:${NC} curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/setup-panel.sh | sudo bash"
  echo -e "${YELLOW}Or locally:${NC} sudo bash setup-panel.sh"
  exit 1
fi

# Detect system environment and installer location
INSTALL_DIR=$(pwd)
if [ -f "$INSTALL_DIR/package.json" ] && grep -q "react-example" "$INSTALL_DIR/package.json"; then
  log_info "Detected installer is running from within the NetTopology project directory."
else
  log_step "Preparing installation directory..."
  INSTALL_DIR="/opt/nettopology"
  if [ -d "$INSTALL_DIR" ]; then
    log_warning "Directory $INSTALL_DIR already exists. We will update it."
  else
    mkdir -p "$INSTALL_DIR"
  fi
fi

# ------------------------------------------------------------------------------
# 1. Interactive Questions (Safe for curl | bash execution via /dev/tty)
# ------------------------------------------------------------------------------
prompt_read() {
  local prompt_msg="$1"
  local var_name="$2"
  local default_val="$3"
  local is_secret="${4:-false}"
  local user_input=""

  # Use existing env var if pre-configured
  eval "local existing_val=\"\${$var_name:-}\""
  if [ -n "$existing_val" ]; then
    log_info "Using pre-configured value for $var_name: $existing_val"
    return 0
  fi

  # Determine TTY output device so prompt is NEVER hidden when piped via curl | bash
  local tty_out="&2"
  if [ -c /dev/tty ] && [ -w /dev/tty ]; then
    tty_out="/dev/tty"
  fi

  if [ "$tty_out" = "/dev/tty" ]; then
    printf "%s" "$prompt_msg" > /dev/tty
  else
    printf "%s" "$prompt_msg" >&2
  fi

  if [ -t 0 ]; then
    if [ "$is_secret" = "true" ]; then
      read -r -s user_input
      echo "" >&2
    else
      read -r user_input
    fi
  elif [ -c /dev/tty ] && [ -r /dev/tty ]; then
    if [ "$is_secret" = "true" ]; then
      read -r -s user_input < /dev/tty 2>/dev/null || user_input="$default_val"
      echo "" > /dev/tty 2>/dev/null || true
    else
      read -r user_input < /dev/tty 2>/dev/null || user_input="$default_val"
    fi
  else
    user_input="$default_val"
    echo " [Non-interactive mode, using default: $default_val]" >&2
  fi

  eval "$var_name=\"\${user_input:-\$default_val}\""
}

echo -e "\n${YELLOW}>>> Please provide network and server configurations below:${NC}\n"

# Detect Server Private/Public IP
DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$DETECTED_IP" ] && DETECTED_IP="127.0.0.1"

prompt_read "Enter Domain Name or Server IP for NetTopology [Default: ${DETECTED_IP}]: " PANEL_DOMAIN "${DETECTED_IP}"

# Port Configuration
while true; do
  prompt_read "Enter Web Access Port to run the panel on [Default: 3000]: " PANEL_PORT "3000"
  if [[ "$PANEL_PORT" =~ ^[0-9]+$ ]] && [ "$PANEL_PORT" -ge 1 ] && [ "$PANEL_PORT" -le 65535 ]; then
    break
  else
    log_error "Invalid port number. Please enter a value between 1 and 65535."
    PANEL_PORT="3000"
  fi
done

# Enable Nginx Reverse Proxy with SSL?
prompt_read "Enable Nginx Reverse Proxy with SSL support? (y/n) [Default: y]: " ENABLE_NGINX "y"

# ------------------------------------------------------------------------------
# 2. System Dependency Installation
# ------------------------------------------------------------------------------
log_step "Checking and repairing package database state..."
DEBIAN_FRONTEND=noninteractive dpkg --configure -a < /dev/null 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get install -f -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" < /dev/null 2>/dev/null || true

log_step "Updating local package list..."
DEBIAN_FRONTEND=noninteractive apt-get update -y < /dev/null || log_warning "Some repositories failed to update. Continuing with remaining catalogs..."

log_step "Installing general system tools (git, curl, build-essential, python3, openssl, ca-certificates)..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
  git curl build-essential python3 python3-pip ca-certificates gnupg lsb-release xz-utils openssl ufw < /dev/null

# Node.js 20/22 LTS Installation
install_nodejs() {
  local NODE_VER
  NODE_VER=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo "0")
  NODE_VER=${NODE_VER:-0}

  if command -v node &>/dev/null && [ "$NODE_VER" -ge 20 ]; then
    log_info "Node.js $(node -v) is already installed."
    return 0
  fi

  log_step "Installing Node.js 22 LTS..."
  
  # Method 1: NodeSource official setup
  log_info "Attempt 1: Installing via NodeSource repository..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | DEBIAN_FRONTEND=noninteractive bash - < /dev/null 2>/dev/null || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" nodejs < /dev/null 2>/dev/null || true
  
  NODE_VER=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo "0")
  NODE_VER=${NODE_VER:-0}

  # Method 2: Direct pre-built binary fallback (Works on all Ubuntu/Debian versions)
  if [ "$NODE_VER" -lt 20 ]; then
    log_warning "NodeSource repository setup failed. Method 2: Downloading official Node.js 22 LTS prebuilt binary..."
    local ARCH
    ARCH=$(uname -m)
    local NODE_ARCH="x64"
    case "$ARCH" in
      x86_64) NODE_ARCH="x64" ;;
      aarch64|arm64) NODE_ARCH="arm64" ;;
      *) NODE_ARCH="x64" ;;
    esac
    local NODE_DIST="node-v22.14.0-linux-${NODE_ARCH}"
    rm -rf "/tmp/${NODE_DIST}*"
    if curl -fsSL --connect-timeout 20 --max-time 120 "https://nodejs.org/dist/v22.14.0/${NODE_DIST}.tar.xz" -o "/tmp/${NODE_DIST}.tar.xz" || \
       curl -fsSL --connect-timeout 20 --max-time 120 "https://mirror.ghproxy.com/https://nodejs.org/dist/v22.14.0/${NODE_DIST}.tar.xz" -o "/tmp/${NODE_DIST}.tar.xz"; then
      tar -xJf "/tmp/${NODE_DIST}.tar.xz" -C /usr/local --strip-components=1 || true
      rm -f "/tmp/${NODE_DIST}.tar.xz"
    fi
  fi

  NODE_VER=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo "0")
  NODE_VER=${NODE_VER:-0}

  if [ "$NODE_VER" -ge 20 ]; then
    log_success "Node.js successfully installed: $(node -v)"
  else
    log_error "Failed to install Node.js 20+. Please install Node.js manually."
    exit 1
  fi
}

install_nodejs

# ------------------------------------------------------------------------------
# 3. Code Retrieval & Directory Setup
# ------------------------------------------------------------------------------
if [ "$(pwd)" != "$INSTALL_DIR" ]; then
  log_step "Cloning or downloading NetTopology repository into $INSTALL_DIR..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Git repository found. Fetching latest updates..."
    cd "$INSTALL_DIR"
    if ! git -c network.maxSubmissions=1 -c network.lowSpeedLimit=1000 -c network.lowSpeedTime=30 fetch --all; then
      log_warning "Git fetch failed. Trying fallback mirror..."
      git remote set-url origin https://mirror.ghproxy.com/https://github.com/shahbazimasoud/NetTopology.git
      git fetch --all || true
    fi
    git reset --hard origin/master || git reset --hard origin/main || true
  else
    rm -rf "$INSTALL_DIR"/*
    CLONE_SUCCESS=false

    # Try 1: Direct Git Clone
    log_info "Attempt 1: Direct git clone from GitHub..."
    if git -c network.maxSubmissions=1 -c network.lowSpeedLimit=1000 -c network.lowSpeedTime=30 clone https://github.com/shahbazimasoud/NetTopology.git "$INSTALL_DIR"; then
      CLONE_SUCCESS=true
    fi

    # Try 2: Mirror Proxy Clone
    if [ "$CLONE_SUCCESS" = false ]; then
      log_warning "Direct git clone failed. Attempt 2: Cloning via GitHub Mirror Proxy..."
      if git -c network.maxSubmissions=1 -c network.lowSpeedLimit=1000 -c network.lowSpeedTime=30 clone https://mirror.ghproxy.com/https://github.com/shahbazimasoud/NetTopology.git "$INSTALL_DIR"; then
        CLONE_SUCCESS=true
      fi
    fi

    # Try 3: Direct ZIP Download
    if [ "$CLONE_SUCCESS" = false ]; then
      log_warning "Attempt 3: Downloading repository ZIP archive..."
      apt-get install -y unzip || true
      rm -f /tmp/NetTopology.zip
      if curl -f -sSL --connect-timeout 20 --max-time 120 -o /tmp/NetTopology.zip https://github.com/shahbazimasoud/NetTopology/archive/refs/heads/master.zip || \
         curl -f -sSL --connect-timeout 20 --max-time 120 -o /tmp/NetTopology.zip https://mirror.ghproxy.com/https://github.com/shahbazimasoud/NetTopology/archive/refs/heads/master.zip; then
        mkdir -p /tmp/nettop-extracted
        unzip -q -o /tmp/NetTopology.zip -d /tmp/nettop-extracted
        mv /tmp/nettop-extracted/NetTopology-master/* "$INSTALL_DIR/" || cp -r /tmp/nettop-extracted/NetTopology-master/* "$INSTALL_DIR/" || true
        rm -rf /tmp/nettop-extracted /tmp/NetTopology.zip
        CLONE_SUCCESS=true
      fi
    fi

    if [ "$CLONE_SUCCESS" = false ]; then
      log_error "Failed to retrieve the NetTopology repository."
      exit 1
    fi

    cd "$INSTALL_DIR"
  fi
fi

# ------------------------------------------------------------------------------
# 4. Restore Persistent Database if Available
# ------------------------------------------------------------------------------
BACKUP_FILE="/etc/nettopology-backup/network_data.json"
TARGET_DATA_FILE="$INSTALL_DIR/backend/network_data.json"

if [ -f "$BACKUP_FILE" ]; then
  log_info "Restoring persistent network topology database from $BACKUP_FILE..."
  mkdir -p "$INSTALL_DIR/backend"
  cp "$BACKUP_FILE" "$TARGET_DATA_FILE"
  log_success "Database restored successfully."
fi

# ------------------------------------------------------------------------------
# 5. Dependency Installation & Production Build
# ------------------------------------------------------------------------------
log_step "Installing NPM dependencies..."
npm config set fetch-retry-maxtimeout 180000
npm config set fetch-retry-mintimeout 30000
npm config set fetch-retries 10

if ! npm install; then
  log_warning "Standard npm install failed. Retrying with mirror registry (registry.npmmirror.com)..."
  npm config set registry https://registry.npmmirror.com
  npm install || { log_error "NPM installation failed."; exit 1; }
  npm config delete registry
fi

log_step "Compiling NetTopology Production Build (Vite + TypeScript Backend)..."
npm run build

# Ensure scripts have execute permissions
chmod +x "$INSTALL_DIR"/*.sh 2>/dev/null || true

# ------------------------------------------------------------------------------
# 6. Systemd Service Deployment
# ------------------------------------------------------------------------------
log_step "Configuring Systemd Daemon Service..."
SERVICE_FILE="/etc/systemd/system/nettopology.service"
NODE_EXEC=$(command -v node || echo "/usr/local/bin/node")

cat << EOF > "$SERVICE_FILE"
[Unit]
Description=NetTopology - Cisco Network Topology & Port Security Automation Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_EXEC dist/server.cjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nettopology.service
systemctl restart nettopology.service
log_success "NetTopology systemd daemon service is active and running!"

# ------------------------------------------------------------------------------
# 7. Optional Nginx Reverse Proxy with Self-Signed SSL
# ------------------------------------------------------------------------------
if [[ "$ENABLE_NGINX" =~ ^[Yy]$ ]]; then
  log_step "Setting up Nginx Reverse Proxy with SSL on port $PANEL_PORT..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx openssl < /dev/null || true

  mkdir -p /etc/nginx/ssl
  SSL_CERT="/etc/nginx/ssl/nettopology.crt"
  SSL_KEY="/etc/nginx/ssl/nettopology.key"

  if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    log_info "Generating 10-year Self-Signed TLS Certificate..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout "$SSL_KEY" \
      -out "$SSL_CERT" \
      -subj "/CN=$PANEL_DOMAIN/O=NetTopology/OU=Network Management" 2>/dev/null || true
    chmod 600 "$SSL_KEY"
  fi

  NGINX_CONF="/etc/nginx/sites-available/nettopology.conf"
  cat << EOF > "$NGINX_CONF"
server {
    listen $PANEL_PORT ssl http2;
    listen [::]:$PANEL_PORT ssl http2;
    server_name $PANEL_DOMAIN _;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket & Cisco Terminal Stream Support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

  ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/nettopology.conf"
  if nginx -t &>/dev/null; then
    systemctl reload nginx || systemctl restart nginx
    log_success "Nginx successfully configured with SSL on port $PANEL_PORT!"
  else
    log_warning "Nginx configuration test failed. Reverting to direct port 3000 access."
  fi
fi

# ------------------------------------------------------------------------------
# 8. Firewall Configuration (UFW / Firewalld)
# ------------------------------------------------------------------------------
if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
  log_info "Configuring UFW firewall rules..."
  ufw allow 3000/tcp comment 'NetTopology Direct' 2>/dev/null || true
  if [[ "$ENABLE_NGINX" =~ ^[Yy]$ ]]; then
    ufw allow "$PANEL_PORT/tcp" comment 'NetTopology Web SSL' 2>/dev/null || true
  fi
fi

# ------------------------------------------------------------------------------
# 9. Installation Report Summary
# ------------------------------------------------------------------------------
if [[ "$ENABLE_NGINX" =~ ^[Yy]$ ]]; then
  ACCESS_URL="https://$PANEL_DOMAIN:$PANEL_PORT"
else
  ACCESS_URL="http://$PANEL_DOMAIN:3000"
fi

echo ""
log_success "NETTOPOLOGY INSTALLATION COMPLETED SUCCESSFULLY!"
echo -e "${CYAN}======================================================================${NC}"
echo -e "  ${BOLD}NetTopology Service is active and running under systemd daemon!${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "  🌐 ${BOLD}Web Panel Access URL:${NC} ${GREEN}${BOLD}${ACCESS_URL}${NC}"
echo -e "  🔗 ${BOLD}Direct Backend URL:${NC}   ${BLUE}http://${DETECTED_IP}:3000${NC}"
echo -e "  📂 ${BOLD}Install Directory:${NC}    ${YELLOW}${INSTALL_DIR}${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "  ⚙️  ${BOLD}Service Commands:${NC}"
echo -e "     • Check Status:   ${YELLOW}systemctl status nettopology${NC}"
echo -e "     • Restart Panel:  ${YELLOW}systemctl restart nettopology${NC}"
echo -e "     • View Live Logs: ${YELLOW}journalctl -u nettopology -f -n 50${NC}"
echo -e "     • Stop Service:   ${YELLOW}systemctl stop nettopology${NC}"
echo -e ""
echo -e "  🗑️  ${BOLD}To Uninstall:${NC}"
echo -e "     ${RED}curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/uninstall-panel.sh | sudo bash${NC}"
echo -e "${CYAN}======================================================================${NC}"
