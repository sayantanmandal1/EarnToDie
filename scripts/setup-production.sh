#!/bin/bash

# Production Environment Setup Script for Zombie Car Game
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        vim \
        nginx \
        certbot \
        python3-certbot-nginx \
        fail2ban \
        ufw \
        logrotate
    
    log "System dependencies installed"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    log "Docker installed. Please log out and back in for group changes to take effect."
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Download and install Docker Compose
    DOCKER_COMPOSE_VERSION="2.20.2"
    sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "Docker Compose installed"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow specific application ports
    sudo ufw allow 8080/tcp  # Backend API
    sudo ufw allow 3000/tcp  # Frontend dev server (if needed)
    
    # Enable firewall
    sudo ufw --force enable
    
    log "Firewall configured"
}

# Setup fail2ban
setup_fail2ban() {
    log "Setting up fail2ban..."
    
    # Create custom jail configuration
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    # Restart fail2ban
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
    
    log "Fail2ban configured"
}

# Create application directories
create_directories() {
    log "Creating application directories..."
    
    # Create main application directory
    sudo mkdir -p /opt/zombie-car-game
    sudo chown $USER:$USER /opt/zombie-car-game
    
    # Create log directories
    sudo mkdir -p /var/log/zombie-car-game
    sudo chown $USER:$USER /var/log/zombie-car-game
    
    # Create backup directory
    sudo mkdir -p /backups/zombie-car-game
    sudo chown $USER:$USER /backups/zombie-car-game
    
    # Create SSL certificate directory
    sudo mkdir -p /etc/ssl/zombie-car-game
    sudo chown $USER:$USER /etc/ssl/zombie-car-game
    
    log "Directories created"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    read -p "Enter your domain name (e.g., zombiecargame.com): " DOMAIN
    read -p "Enter your email for Let's Encrypt: " EMAIL
    
    if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
        # Stop nginx if running
        sudo systemctl stop nginx || true
        
        # Get SSL certificate
        sudo certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
        log "SSL certificates configured for $DOMAIN"
    else
        warn "Skipping SSL setup - domain or email not provided"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p monitoring/prometheus/data
    mkdir -p monitoring/grafana/data
    
    # Set permissions
    sudo chown -R 472:472 monitoring/grafana/data  # Grafana user
    sudo chown -R 65534:65534 monitoring/prometheus/data  # Nobody user
    
    log "Monitoring setup completed"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    # Copy logrotate configuration
    sudo cp logging/logrotate.conf /etc/logrotate.d/zombie-car-game
    
    # Test logrotate configuration
    sudo logrotate -d /etc/logrotate.d/zombie-car-game
    
    log "Log rotation configured"
}

# Create environment file template
create_env_template() {
    log "Creating environment file template..."
    
    cat > .env.template <<EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=gameuser
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=zombie_game

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# Application Configuration
JWT_SECRET=CHANGE_ME_JWT_SECRET_KEY
GIN_MODE=release
LOG_LEVEL=info
CORS_ORIGINS=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# CDN Configuration
REACT_APP_CDN_URL=https://cdn.yourdomain.com
CDN_PROVIDER=cloudflare

# Monitoring
GRAFANA_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
EOF
    
    info "Environment template created at .env.template"
    info "Please copy it to .env and update the values:"
    info "cp .env.template .env"
    info "nano .env"
}

# Setup system limits
setup_system_limits() {
    log "Setting up system limits..."
    
    # Increase file descriptor limits
    sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
# Zombie Car Game limits
$USER soft nofile 65536
$USER hard nofile 65536
$USER soft nproc 32768
$USER hard nproc 32768
EOF
    
    # Increase system limits
    sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Zombie Car Game system limits
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.max_map_count = 262144
fs.file-max = 2097152
EOF
    
    # Apply sysctl changes
    sudo sysctl -p
    
    log "System limits configured"
}

# Main setup function
main() {
    log "Starting Zombie Car Game production setup..."
    
    check_root
    install_dependencies
    install_docker
    install_docker_compose
    setup_firewall
    setup_fail2ban
    create_directories
    setup_ssl
    setup_monitoring
    setup_logrotate
    create_env_template
    setup_system_limits
    
    log "Production setup completed!"
    info ""
    info "Next steps:"
    info "1. Copy .env.template to .env and configure your settings"
    info "2. Configure your DNS to point to this server"
    info "3. Run the deployment script: ./scripts/deploy.sh deploy"
    info "4. Set up monitoring dashboards in Grafana"
    info ""
    info "Important: Please log out and back in for Docker group changes to take effect"
}

main "$@"