#!/bin/bash

# Zombie Car Game Production Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required files exist
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker compose file $COMPOSE_FILE not found"
    fi
    
    if [[ ! -f ".env" ]]; then
        error "Environment file .env not found"
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    # Check available disk space (require at least 5GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 5242880 ]]; then
        error "Insufficient disk space. At least 5GB required."
    fi
    
    # Check if ports are available
    if netstat -tuln | grep -q ":80 "; then
        warn "Port 80 is already in use"
    fi
    
    if netstat -tuln | grep -q ":443 "; then
        warn "Port 443 is already in use"
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Database backup
backup_database() {
    log "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup PostgreSQL
    docker exec zombie-car-postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/postgres_backup.sql" || {
        warn "Database backup failed, but continuing deployment"
    }
    
    # Backup Redis
    docker exec zombie-car-redis redis-cli BGSAVE || {
        warn "Redis backup failed, but continuing deployment"
    }
    
    log "Database backup completed"
}

# Build and deploy
deploy() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    log "Building application images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Stop existing services gracefully
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --timeout 30
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "Deployment completed successfully"
}

# Health checks
check_service_health() {
    log "Checking service health..."
    
    # Check frontend
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "Frontend is healthy"
    else
        error "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log "Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Check database
    if docker exec zombie-car-postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        log "Database is healthy"
    else
        error "Database health check failed"
    fi
    
    # Check Redis
    if docker exec zombie-car-redis redis-cli ping | grep -q PONG; then
        log "Redis is healthy"
    else
        error "Redis health check failed"
    fi
    
    log "All services are healthy"
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore database from backup
    if [[ -f "$BACKUP_DIR/postgres_backup.sql" ]]; then
        log "Restoring database from backup..."
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        docker exec -i zombie-car-postgres psql -U "$DB_USER" "$DB_NAME" < "$BACKUP_DIR/postgres_backup.sql"
    fi
    
    # Start services with previous version
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "Rollback completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    log "Cleanup completed"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Update CDN cache if configured
    if [[ -n "$CDN_INVALIDATION_SCRIPT" ]]; then
        log "Invalidating CDN cache..."
        bash "$CDN_INVALIDATION_SCRIPT" || warn "CDN cache invalidation failed"
    fi
    
    # Send deployment notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Zombie Car Game deployed successfully to $ENVIRONMENT\"}" \
            "$SLACK_WEBHOOK_URL" || warn "Slack notification failed"
    fi
    
    log "Post-deployment tasks completed"
}

# Main deployment flow
main() {
    log "Starting Zombie Car Game deployment..."
    
    # Load environment variables
    source .env
    
    case "$1" in
        "deploy")
            pre_deployment_checks
            backup_database
            deploy
            post_deployment
            cleanup
            ;;
        "rollback")
            rollback
            ;;
        "health")
            check_service_health
            ;;
        "backup")
            backup_database
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup}"
            echo "  deploy  - Deploy the application"
            echo "  rollback - Rollback to previous version"
            echo "  health  - Check service health"
            echo "  backup  - Create database backup"
            exit 1
            ;;
    esac
}

# Trap errors and run rollback
trap 'error "Deployment failed. Consider running rollback."' ERR

main "$@"