#!/usr/bin/env bash
# ==============================================================================
# NetTopology - Interactive VPS Uninstaller & Cleanup Suite
# ==============================================================================

set -eo pipefail

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

clear 2>/dev/null || true
echo -e "${RED}${BOLD}"
cat << "EOF"
======================================================================
  ███╗   ██╗███████╗████████╗████████╗ ██████╗ ██████╗  ██████╗ 
  ████╗  ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗
  ██╔██╗ ██║█████╗     ██║      ██║   ██║   ██║██████╔╝██║   ██║
  ██║╚██╗██║██╔══╝     ██║      ██║   ██║   ██║██╔═══╝ ██║   ██║
  ██║ ╚████║███████╗   ██║      ██║   ╚██████╔╝██║     ╚██████╔╝
  ╚═╝  ╚═══╝╚══════╝   ╚═╝      ╚═╝    ╚═════╝ ╚═╝      ╚═════╝ 
        CISCO NETWORK TOPOLOGY PANEL - VPS UNINSTALLER
        Repository: https://github.com/shahbazimasoud/NetTopology
        Developer: Masoud Shahbazi (https://www.linkedin.com/in/masoudshahbazi/)
======================================================================
EOF
echo -e "${NC}"

# Check privileges
if [ "$EUID" -ne 0 ]; then
  log_error "Please run this uninstaller as root (using sudo)."
  exit 1
fi

INSTALL_DIR="/opt/nettopology"
NON_INTERACTIVE=false
PRESERVE_DATA=true

# Parse CLI flags
for arg in "$@"; do
  case $arg in
    -y|--yes|--force|-f|--non-interactive)
      NON_INTERACTIVE=true
      ;;
    --preserve-data)
      PRESERVE_DATA=true
      NON_INTERACTIVE=true
      ;;
    --purge-all)
      PRESERVE_DATA=false
      ;;
    DELETE)
      NON_INTERACTIVE=true
      ;;
  esac
done

if [ "$NON_INTERACTIVE" = false ]; then
  echo -e "\n${YELLOW}Would you like to uninstall NetTopology completely?${NC}"
  echo -e "${RED}[WARNING] All network topology configurations and device data will be backed up to /etc/nettopology-backup before removal.${NC}"
  CONFIRM_DELETE=""
  if [ -t 0 ]; then
    printf "%s" "Type 'DELETE' to confirm full uninstallation, or press Enter to cancel: "
    read -r CONFIRM_DELETE
  elif [ -e /dev/tty ]; then
    printf "%s" "Type 'DELETE' to confirm full uninstallation, or press Enter to cancel: " > /dev/tty
    read -r CONFIRM_DELETE < /dev/tty || CONFIRM_DELETE=""
  else
    log_info "Running in automated non-interactive mode. Proceeding with data backup & uninstallation..."
    CONFIRM_DELETE="DELETE"
  fi

  if [ "$CONFIRM_DELETE" != "DELETE" ]; then
    echo ""
    log_info "Uninstallation cancelled by user. No files or services were removed."
    exit 0
  fi
fi

echo ""
log_step "Proceeding with uninstallation and data protection..."

# 1. Backup Topology Data
BACKUP_DIR="/etc/nettopology-backup"
if [ "$PRESERVE_DATA" = true ]; then
  log_step "Creating persistent backup of network topology database in $BACKUP_DIR..."
  mkdir -p "$BACKUP_DIR"
  if [ -f "$INSTALL_DIR/backend/network_data.json" ]; then
    cp "$INSTALL_DIR/backend/network_data.json" "$BACKUP_DIR/network_data.json"
    log_success "Preserved database to $BACKUP_DIR/network_data.json"
  fi
fi

# 2. Stop & Remove Systemd Service
log_step "Stopping and removing NetTopology systemd service daemon..."
if systemctl is-active --quiet nettopology 2>/dev/null; then
  systemctl stop nettopology || true
fi

if systemctl is-enabled --quiet nettopology 2>/dev/null; then
  systemctl disable nettopology || true
fi

if [ -f "/etc/systemd/system/nettopology.service" ]; then
  rm -f "/etc/systemd/system/nettopology.service"
  systemctl daemon-reload || true
  systemctl reset-failed || true
  log_success "Systemd service removed."
fi

# Kill any leftover orphaned Node or Python processes for NetTopology
pkill -f "dist/server.cjs" 2>/dev/null || true
pkill -f "backend/server.py" 2>/dev/null || true

# 3. Clean up Nginx Configuration
if [ -f "/etc/nginx/sites-enabled/nettopology.conf" ] || [ -f "/etc/nginx/sites-available/nettopology.conf" ]; then
  log_step "Removing Nginx reverse proxy configuration..."
  rm -f "/etc/nginx/sites-enabled/nettopology.conf"
  rm -f "/etc/nginx/sites-available/nettopology.conf"
  if command -v nginx &>/dev/null && nginx -t &>/dev/null; then
    systemctl reload nginx || true
  fi
  log_success "Nginx proxy configuration removed."
fi

# 4. Remove Installation Directory
if [ -d "$INSTALL_DIR" ]; then
  log_step "Removing installation directory ($INSTALL_DIR)..."
  rm -rf "$INSTALL_DIR"
  log_success "Installation directory removed."
fi

echo ""
log_success "NetTopology uninstallation completed successfully!"
if [ "$PRESERVE_DATA" = true ] && [ -f "$BACKUP_DIR/network_data.json" ]; then
  echo -e "💾 ${GREEN}Your network topology data was safely preserved in: ${BOLD}$BACKUP_DIR/network_data.json${NC}"
  echo -e "   If you reinstall NetTopology in the future, your configurations will be automatically restored."
fi
echo -e "${CYAN}======================================================================${NC}"
