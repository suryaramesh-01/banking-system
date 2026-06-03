# NexaBank — AWS Cloud Deployment Guide

## Architecture
```
Internet → Route 53 → ALB → EC2 (Docker)
                              ├── Nginx (port 80/443)
                              ├── Node.js API (port 5000)
                              └── MongoDB Atlas (cloud)
```

## Step 1 — Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t3.small (min) / t3.medium (prod)
- Security Group: allow 22 (SSH), 80 (HTTP), 443 (HTTPS)

## Step 2 — Install Docker on EC2
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

## Step 3 — Clone & Configure
```bash
git clone https://github.com/yourorg/nexabank.git
cd nexabank
cp backend/.env.example backend/.env
nano backend/.env   # fill MongoDB URI, JWT secrets, email creds
```

## Step 4 — Deploy with Docker Compose
```bash
docker compose up -d --build
docker compose ps          # verify all containers running
docker compose logs -f     # watch logs
```

## Step 5 — MongoDB Atlas Setup
1. Create cluster at https://cloud.mongodb.com
2. Add IP whitelist: EC2 public IP + 0.0.0.0/0 for dev
3. Create DB user with readWrite on nexabank DB
4. Copy connection string → paste into backend/.env MONGODB_URI

## Step 6 — SSL with Certbot (optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 7 — Useful Commands
```bash
docker compose restart backend          # restart API
docker compose exec backend sh          # shell into container
docker compose exec mongo mongosh       # MongoDB shell
docker compose down && docker compose up -d --build  # redeploy
docker system prune -f                  # clean old images
```

## Environment Variables Reference
| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB Atlas connection string |
| JWT_SECRET | Random 64-char secret |
| JWT_REFRESH_SECRET | Another random 64-char secret |
| EMAIL_USER | Gmail address |
| EMAIL_PASS | Gmail app password |
| ALLOWED_ORIGINS | Comma-separated frontend URLs |

## Monitoring
```bash
docker stats              # resource usage
docker compose logs backend --tail=100
```
