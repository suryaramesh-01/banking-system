# ══════════════════════════════════════
#  NexaBank Frontend — Dockerfile
#  Static files served via Nginx
# ══════════════════════════════════════
FROM nginx:1.25-alpine
LABEL description="NexaBank Frontend"

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy frontend files
COPY public/ /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
