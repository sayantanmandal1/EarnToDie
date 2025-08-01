# Zombie Car Game - Production Deployment Guide

This guide covers the complete production deployment setup for the Zombie Car Game, including infrastructure setup, monitoring, logging, and CDN integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [CDN Configuration](#cdn-configuration)
5. [Monitoring Setup](#monitoring-setup)
6. [Logging Configuration](#logging-configuration)
7. [Security Considerations](#security-considerations)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores
- **Network**: Static IP address and domain name

### Required Accounts/Services

- Domain registrar account (for DNS management)
- SSL certificate (Let's Encrypt recommended)
- CDN provider account (Cloudflare, AWS CloudFront, or Azure CDN)
- Monitoring service (optional: external monitoring)
- Notification service (Slack webhook for alerts)

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clone the repository
git clone https://github.com/your-org/zombie-car-game.git
cd zombie-car-game

# Run the production setup script
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.template .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```env
# Database Configuration
DB_USER=gameuser
DB_PASSWORD=your_secure_password_here
DB_NAME=zombie_game

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# Application Security
JWT_SECRET=your_jwt_secret_key_here

# Domain Configuration
CORS_ORIGINS=https://yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com

# CDN Configuration
REACT_APP_CDN_URL=https://cdn.yourdomain.com

# Monitoring
GRAFANA_PASSWORD=your_grafana_password_here

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 3. DNS Configuration

Configure your DNS records:

```
A     yourdomain.com        -> YOUR_SERVER_IP
A     www.yourdomain.com    -> YOUR_SERVER_IP
A     api.yourdomain.com    -> YOUR_SERVER_IP
CNAME cdn.yourdomain.com    -> your-cdn-endpoint
```

## Application Deployment

### 1. Build and Deploy

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy the application
./scripts/deploy.sh deploy
```

### 2. Verify Deployment

```bash
# Check service health
./scripts/deploy.sh health

# Check running containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Access the Application

- **Frontend**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Monitoring**: https://yourdomain.com:3001 (Grafana)
- **Metrics**: https://yourdomain.com:9090 (Prometheus)

## CDN Configuration

### 1. Choose CDN Provider

The application supports multiple CDN providers:

- **Cloudflare** (Recommended for ease of use)
- **AWS CloudFront** (Best for AWS ecosystem)
- **Azure CDN** (Best for Azure ecosystem)

### 2. Configure CDN

```bash
# Run CDN setup script
node scripts/cdn-setup.js cloudflare

# This creates configuration files in cdn-config/
ls cdn-config/
```

### 3. Upload Assets to CDN

```bash
# Build production assets
npm run build

# Upload to CDN (example for Cloudflare)
./cdn-config/upload-cloudflare.sh
```

### 4. Update Environment Variables

```env
REACT_APP_CDN_URL=https://your-cdn-domain.com
CDN_PROVIDER=cloudflare
```

## Monitoring Setup

### 1. Access Grafana Dashboard

1. Navigate to `https://yourdomain.com:3001`
2. Login with username `admin` and the password from your `.env` file
3. Import the pre-configured dashboard from `monitoring/grafana/dashboards/zombie-car-game.json`

### 2. Key Metrics to Monitor

- **Active Players**: Current number of online players
- **Game Sessions**: Rate of new game sessions
- **API Response Time**: 95th percentile response times
- **Error Rate**: Percentage of failed requests
- **Database Performance**: Connection count and query performance
- **System Resources**: CPU, memory, and disk usage

### 3. Set Up Alerts

Configure alerts in Grafana for:

- High error rate (>5%)
- Slow response times (>2 seconds)
- High memory usage (>80%)
- Database connection issues
- Service downtime

## Logging Configuration

### 1. Log Locations

- **Application Logs**: `/var/log/zombie-car-game/`
- **Nginx Logs**: `/var/log/nginx/`
- **Database Logs**: `/var/log/postgresql/`
- **System Logs**: `/var/log/syslog`

### 2. Log Rotation

Logs are automatically rotated daily and compressed. Configuration is in `logging/logrotate.conf`.

### 3. Centralized Logging (Optional)

For centralized logging with Elasticsearch and Fluentd:

```bash
# Add to docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml -f docker-compose.logging.yml up -d
```

## Security Considerations

### 1. Firewall Configuration

The setup script configures UFW firewall with these rules:

- Allow SSH (port 22)
- Allow HTTP (port 80)
- Allow HTTPS (port 443)
- Allow API (port 8080)
- Deny all other incoming traffic

### 2. SSL/TLS Configuration

- SSL certificates are automatically obtained from Let's Encrypt
- Certificates auto-renew via cron job
- Strong cipher suites are configured in nginx

### 3. Application Security

- JWT tokens for authentication
- CORS properly configured
- Rate limiting enabled
- Security headers set
- Database connections encrypted

### 4. Regular Security Updates

```bash
# Update system packages monthly
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
./scripts/deploy.sh deploy
```

## Maintenance

### 1. Database Backups

```bash
# Manual backup
./scripts/deploy.sh backup

# Automated backups are created before each deployment
ls /backups/
```

### 2. Log Management

```bash
# View recent logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Clean old logs (done automatically by logrotate)
sudo logrotate -f /etc/logrotate.d/zombie-car-game
```

### 3. Performance Optimization

```bash
# Analyze bundle size
npm run build:analyze

# Check database performance
docker exec zombie-car-postgres psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Monitor system resources
htop
```

### 4. Updates and Rollbacks

```bash
# Deploy new version
git pull origin main
./scripts/deploy.sh deploy

# Rollback if needed
./scripts/deploy.sh rollback
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check system resources
df -h
free -h
```

#### 2. Database Connection Issues

```bash
# Check database status
docker exec zombie-car-postgres pg_isready -U $DB_USER

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. High Memory Usage

```bash
# Check memory usage by container
docker stats

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew --force-renewal
```

### Performance Issues

#### 1. Slow API Responses

- Check database query performance in Grafana
- Review slow query logs
- Consider adding database indexes
- Check if CDN is properly configured

#### 2. High CPU Usage

- Monitor CPU usage in Grafana
- Check for memory leaks in application logs
- Consider scaling horizontally

#### 3. Database Performance

```bash
# Check database statistics
docker exec zombie-car-postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
"
```

### Emergency Procedures

#### 1. Complete System Failure

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Check system status
systemctl status docker
df -h
free -h

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

#### 2. Data Recovery

```bash
# Restore from backup
./scripts/deploy.sh rollback

# Or restore specific backup
docker exec -i zombie-car-postgres psql -U $DB_USER $DB_NAME < /backups/BACKUP_DATE/postgres_backup.sql
```

## Support and Monitoring

### Health Check Endpoints

- **Frontend**: `https://yourdomain.com/health`
- **Backend**: `https://api.yourdomain.com/health`
- **Database**: Check via backend health endpoint

### Monitoring URLs

- **Grafana**: `https://yourdomain.com:3001`
- **Prometheus**: `https://yourdomain.com:9090`

### Log Analysis

```bash
# Search for errors in logs
grep -r "ERROR" /var/log/zombie-car-game/

# Monitor real-time logs
tail -f /var/log/zombie-car-game/app.log
```

For additional support, check the application logs and monitoring dashboards first, then consult this documentation for troubleshooting steps.