# AI Marketing OS v5 - Deployment Guide

## 🚀 نسخة الإنتاج: SaaS-Ready Platform

---

## 📋 متطلبات النشر

### الحد الأدنى من الموارد
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Network**: 100 Mbps

### المتطلبات البرمجية
- Docker 20.10+
- Docker Compose 2.0+
- Python 3.11+
- PostgreSQL 13+
- Redis 6+

---

## 🐳 النشر باستخدام Docker

### 1. إعداد البيئة

```bash
# استنساخ المستودع
git clone https://github.com/your-org/ai-marketing-os.git
cd ai_marketing_os_v2

# إنشاء ملف .env
cp .env.example .env

# تحديث المتغيرات
nano .env
```

### 2. ملف .env

```env
# Application
APP_ENV=production
SECRET_KEY=your-super-secret-key-change-this
DEBUG=false

# Database
DB_USER=admin
DB_PASSWORD=secure_password
DB_NAME=ai_marketing_os
DATABASE_URL=postgresql://admin:secure_password@db:5432/ai_marketing_os

# Redis
REDIS_URL=redis://redis:6379/0

# API
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Security
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_PASSWORD=admin

# Email (for alerts)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. تشغيل Docker Compose

```bash
# بناء الصور
docker-compose build

# تشغيل الخدمات
docker-compose up -d

# التحقق من الحالة
docker-compose ps

# عرض السجلات
docker-compose logs -f api
```

### 4. التحقق من الصحة

```bash
# فحص API
curl http://localhost:8000/health

# الوصول إلى Grafana
# http://localhost:3000

# الوصول إلى Prometheus
# http://localhost:9090
```

---

## ☸️ النشر على Kubernetes

### 1. إنشاء Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-marketing-os
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-marketing-os
  template:
    metadata:
      labels:
        app: ai-marketing-os
    spec:
      containers:
      - name: api
        image: your-registry/ai-marketing-os:latest
        ports:
        - containerPort: 8000
        env:
        - name: APP_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. تطبيق على Kubernetes

```bash
# إنشاء namespace
kubectl create namespace ai-marketing

# تطبيق الـ deployment
kubectl apply -f deployment.yaml -n ai-marketing

# التحقق من الحالة
kubectl get pods -n ai-marketing

# عرض السجلات
kubectl logs -f deployment/ai-marketing-os -n ai-marketing
```

---

## 🌐 النشر على Cloud Platforms

### AWS ECS

```bash
# إنشاء ECR repository
aws ecr create-repository --repository-name ai-marketing-os

# بناء وتحميل الصورة
docker build -t ai-marketing-os:latest .
docker tag ai-marketing-os:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-marketing-os:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ai-marketing-os:latest

# إنشاء ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# تشغيل الخدمة
aws ecs create-service --cluster ai-marketing --service-name api --task-definition ai-marketing-os --desired-count 3
```

### Google Cloud Run

```bash
# تكوين gcloud
gcloud config set project YOUR_PROJECT_ID

# بناء وتحميل الصورة
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-marketing-os

# نشر على Cloud Run
gcloud run deploy ai-marketing-os \
  --image gcr.io/YOUR_PROJECT_ID/ai-marketing-os \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=production
```

### Heroku

```bash
# تسجيل الدخول
heroku login

# إنشاء التطبيق
heroku create ai-marketing-os

# تعيين المتغيرات
heroku config:set APP_ENV=production
heroku config:set SECRET_KEY=your-secret-key

# نشر التطبيق
git push heroku main

# عرض السجلات
heroku logs --tail
```

---

## 🔒 الأمان

### 1. SSL/TLS

```bash
# استخدام Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# تكوين nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://api:8000;
    }
}
```

### 2. Firewall

```bash
# السماح بالمنافذ الضرورية فقط
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Secrets Management

```bash
# استخدام HashiCorp Vault
vault kv put secret/ai-marketing-os \
  db_password=secure_password \
  api_secret_key=your-secret-key
```

---

## 📊 المراقبة والتسجيل

### 1. Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ai-marketing-os'
    static_configs:
      - targets: ['localhost:8000']
```

### 2. Grafana

```bash
# الوصول إلى Grafana
# http://localhost:3000
# Username: admin
# Password: admin (غيره بعد التسجيل الأول)

# إضافة Prometheus كـ data source
# URL: http://prometheus:9090
```

### 3. ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# تشغيل ELK
docker-compose -f docker-compose.elk.yml up -d

# الوصول إلى Kibana
# http://localhost:5601
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push
        run: |
          docker build -t ai-marketing-os:${{ github.sha }} .
          docker push ai-marketing-os:${{ github.sha }}
      - name: Deploy
        run: kubectl set image deployment/ai-marketing-os api=ai-marketing-os:${{ github.sha }}
```

---

## 🧪 الاختبار قبل النشر

### 1. اختبارات الوحدة

```bash
pytest tests/unit -v
```

### 2. اختبارات التكامل

```bash
pytest tests/integration -v
```

### 3. اختبارات الحمل

```bash
# استخدام Apache Bench
ab -n 1000 -c 100 http://localhost:8000/health

# استخدام wrk
wrk -t12 -c400 -d30s http://localhost:8000/health
```

### 4. اختبارات الأمان

```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8000
```

---

## 📈 التوسع

### Horizontal Scaling

```bash
# زيادة عدد النسخ
docker-compose up -d --scale api=5

# أو في Kubernetes
kubectl scale deployment ai-marketing-os --replicas=5
```

### Load Balancing

```nginx
upstream api {
    server api1:8000;
    server api2:8000;
    server api3:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://api;
    }
}
```

---

## 🆘 استكشاف الأخطاء

### 1. فحص السجلات

```bash
# Docker
docker-compose logs api

# Kubernetes
kubectl logs deployment/ai-marketing-os

# System
journalctl -u docker -f
```

### 2. فحص الموارد

```bash
# Docker
docker stats

# Kubernetes
kubectl top nodes
kubectl top pods
```

### 3. فحص الاتصال

```bash
# اختبار API
curl -v http://localhost:8000/health

# اختبار قاعدة البيانات
psql -h localhost -U admin -d ai_marketing_os -c "SELECT 1"

# اختبار Redis
redis-cli ping
```

---

## 🔐 Backup & Recovery

### 1. Backup قاعدة البيانات

```bash
# PostgreSQL
pg_dump -h localhost -U admin ai_marketing_os > backup.sql

# Restore
psql -h localhost -U admin ai_marketing_os < backup.sql
```

### 2. Backup البيانات

```bash
# استخدام rsync
rsync -av /app/storage/ /backup/storage/

# استخدام tar
tar -czf backup-$(date +%Y%m%d).tar.gz /app/storage/
```

---

## 📝 Checklist النشر

- ✅ تحديث متغيرات البيئة
- ✅ تشغيل الاختبارات
- ✅ بناء صور Docker
- ✅ تحديث قاعدة البيانات
- ✅ تشغيل الهجرات
- ✅ تفعيل المراقبة
- ✅ إعداد النسخ الاحتياطية
- ✅ اختبار الصحة
- ✅ إعداد التنبيهات
- ✅ توثيق النشر

---

## 📞 الدعم

للمساعدة والدعم:
- 📧 Email: support@aimarketing.com
- 💬 Slack: #ai-marketing-support
- 📖 Docs: https://docs.aimarketing.com

---

**Version**: 5.0 (SaaS-Ready)  
**Status**: ✅ **PRODUCTION-READY**  
**Last Updated**: March 23, 2024
