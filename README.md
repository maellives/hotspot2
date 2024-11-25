# Hotspot Management System

A complete system for managing WiFi hotspot users with FreeRADIUS integration and UniFi access points.

## System Requirements

- Ubuntu Server 20.04 LTS
- Node.js 20.x
- MySQL 8.0
- FreeRADIUS 3.0
- Nginx

## Installation Instructions

1. Clone this repository to your server:
   ```bash
   git clone https://your-repository-url.git /opt/hotspot-manager
   ```

2. Make the installation script executable and run it:
   ```bash
   cd /opt/hotspot-manager
   chmod +x setup/install.sh
   ./setup/install.sh
   ```

3. Configure the MySQL database:
   - The installation script will prompt you to set a root password
   - Import the database schema:
     ```bash
     mysql -u root -p radius < backend/config/database.sql
     ```

4. Configure FreeRADIUS:
   - Copy the SQL configuration:
     ```bash
     cp backend/config/radius/sql.conf /etc/freeradius/3.0/mods-available/sql
     ```
   - Update the password in the SQL configuration file
   - Restart FreeRADIUS:
     ```bash
     systemctl restart freeradius
     ```

5. Build and deploy the frontend:
   ```bash
   npm install
   npm run build
   ```

6. Start the application:
   ```bash
   pm2 start backend/index.js --name hotspot-api
   pm2 save
   ```

7. Configure Nginx:
   - Update the server_name in /etc/nginx/sites-available/hotspot-manager
   - Test and restart Nginx:
     ```bash
     nginx -t
     systemctl restart nginx
     ```

## Default Credentials

- Admin login:
  - Email: admin@example.com
  - Password: (set during installation)

## Security Considerations

1. Change the default admin password immediately after installation
2. Configure SSL/TLS certificates using Certbot
3. Set up firewall rules using UFW
4. Regularly update system packages and dependencies

## Maintenance

- Monitor logs:
  ```bash
  pm2 logs hotspot-api
  tail -f /var/log/freeradius/radius.log
  ```

- Backup database:
  ```bash
  mysqldump -u root -p radius > backup.sql
  ```

## Support

For issues and support, please contact your system administrator or create an issue in the repository.