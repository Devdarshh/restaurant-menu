#!/bin/bash
set -e

# Write systemd service
sudo tee /etc/systemd/system/spicegarden.service > /dev/null << 'EOF'
[Unit]
Description=Spice Garden Restaurant Menu Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/restaurant-menu
ExecStart=/usr/bin/node /home/ubuntu/restaurant-menu/server.js
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=NODE_ENV=production
Environment=ADMIN_PASSWORD=admin123

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable spicegarden
sudo systemctl restart spicegarden

# Write Nginx configuration
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo "=== SPICE GARDEN SERVICE DEPLOYED SUCCESSFULLY ==="
sudo systemctl status spicegarden --no-pager
