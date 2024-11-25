#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl nodejs npm mysql-server freeradius freeradius-mysql nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Configure MySQL
mysql_secure_installation

# Create database and user
mysql -e "CREATE DATABASE radius;"
mysql -e "CREATE USER 'radius'@'localhost' IDENTIFIED BY 'your_password_here';"
mysql -e "GRANT ALL PRIVILEGES ON radius.* TO 'radius'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Import FreeRADIUS schema
mysql -u radius -p radius < /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql

# Configure FreeRADIUS
cp /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/
chown -R freerad:freerad /etc/freeradius/3.0/mods-enabled/sql

# Install PM2 for process management
npm install -g pm2

# Create application directory
mkdir -p /opt/hotspot-manager
cd /opt/hotspot-manager

# Install dependencies
npm install

# Build the frontend
npm run build

# Set up environment variables
cp server/.env.example server/.env
# Remember to update the .env file with proper values

# Set up Nginx
cat > /etc/nginx/sites-available/hotspot-manager << EOL
server {
    listen 80;
    server_name your_ip_address;

    location / {
        root /opt/hotspot-manager/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

ln -s /etc/nginx/sites-available/hotspot-manager /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Start services
systemctl restart freeradius
systemctl restart nginx

# Start application with PM2
cd /opt/hotspot-manager
pm2 start server/index.js --name hotspot-api
pm2 save
pm2 startup