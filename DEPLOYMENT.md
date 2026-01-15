# Landlord Management Software - Deployment Guide

This guide walks you through deploying the Landlord Management Software on a Linux server for self-hosted use on your local network.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Building for Production](#building-for-production)
6. [Local Network Access](#local-network-access)
7. [systemd Service Setup](#systemd-service-setup)
8. [Database Backup and Restore](#database-backup-and-restore)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure your Linux server has the following installed:

### Required Software

- **Node.js**: Version 18.x or higher (tested with v20.x)
  ```bash
  # Check your Node.js version
  node --version
  ```

  If you need to install or update Node.js, use [nvm](https://github.com/nvm-sh/nvm) or download from [nodejs.org](https://nodejs.org/)

- **Git**: For cloning the repository
  ```bash
  sudo apt update
  sudo apt install git
  ```

### System Requirements

- **Operating System**: Linux (Ubuntu, Debian, RHEL, etc.)
- **RAM**: Minimum 512MB (1GB recommended)
- **Disk Space**: Minimum 500MB free space
- **Network**: Local network access with consistent IP address for the server

### Knowledge Requirements

This guide assumes you have:
- Basic Linux command line knowledge
- SSH access to your server
- Sudo privileges for system configuration

---

## Installation

### 1. Clone the Repository

```bash
# Clone to your preferred location
cd ~
git clone <repository-url> LandlordSoftware
cd LandlordSoftware
```

**Note**: Replace `<repository-url>` with the actual Git repository URL provided to you. If you don't have a repository URL, you likely received the software as a zip file instead.

If you received the software as a zip file, extract it instead:
```bash
unzip LandlordSoftware.zip
cd LandlordSoftware
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, client, and server)
npm install

# Install client dependencies
cd client
npm install
cd ..
```

This may take a few minutes as it downloads all required packages.

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and edit it:

```bash
cp .env.example .env
nano .env  # or use your preferred text editor
```

### 2. Configure Environment Variables

Edit the `.env` file with your production settings:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
# IMPORTANT: Use absolute path for production
DATABASE_URL=file:/home/yourusername/LandlordSoftware/data/landlord.db

# Authentication & Session
# CRITICAL: Generate strong random secrets - DO NOT use the defaults!
SESSION_SECRET=your-generated-secret-here
JWT_SECRET=your-generated-secret-here

# Client URL (not used in production, but keep for reference)
CLIENT_URL=http://localhost:5173

# Storage
# Directory for uploaded files (relative to project root)
UPLOAD_DIR=uploads
```

### 3. Generate Secure Secrets

**IMPORTANT**: Never use the default secrets in production. Generate strong random secrets:

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

Copy the generated values into your `.env` file.

### 4. Update Database Path

Replace `/home/yourusername/LandlordSoftware` with the actual absolute path to your installation:

```bash
# Find your absolute path
pwd

# Example result: /home/john/LandlordSoftware
# Then set in .env:
# DATABASE_URL=file:/home/john/LandlordSoftware/data/landlord.db
```

**Why absolute paths?** When running as a systemd service, relative paths may not resolve correctly because the working directory context can differ.

---

## Database Setup

The application uses SQLite, which requires no separate database server installation.

### 1. Create Required Directories

```bash
# Create data directory for database files
mkdir -p data
chmod 755 data

# Create uploads directory for user-uploaded files
mkdir -p uploads
chmod 755 uploads
```

### 2. Initialize the Database

The database will be automatically created when you first run the application. To initialize it with the schema:

```bash
# Generate Prisma client
npx prisma generate

# Create the database schema
npx prisma db push
```

### 3. Seed Initial Data (Optional)

To create a default admin user and sample data:

```bash
npm run db:seed
```

This creates:
- Default admin user: `admin@landlord.com` / `password123`
- Sample properties, tenants, and leases for testing

**IMPORTANT**: Change the admin password immediately after first login!

---

## Building for Production

### 1. Build the Application

```bash
# Build both client and server
npm run build
```

This command:
1. Builds the React frontend (optimized, minified)
2. Compiles TypeScript server code to JavaScript
3. Places built files in the `dist/` directory

The build process may take 1-2 minutes.

### 2. Test the Production Build

Before setting up the service, test that the production build works:

```bash
npm start
```

You should see:
```
Server running on http://localhost:3000
Environment: production
```

Visit `http://localhost:3000` in your browser to verify the application loads.

Press `Ctrl+C` to stop the test server.

---

## Local Network Access

To access the application from other devices on your local network:

### 1. Find Your Server's IP Address

```bash
# Find your local IP address
hostname -I | awk '{print $1}'

# Or use:
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Example result: `192.168.1.100`

### 2. Configure Firewall

Allow incoming connections on your application port (default: 3000):

**For UFW (Ubuntu/Debian):**
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
sudo ufw status
```

**For firewalld (RHEL/CentOS):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

**Why do this?** Linux firewalls block incoming connections by default. Opening the port allows other devices on your network to access the application.

### 3. Access from Network Devices

From any device on your local network, open a web browser and navigate to:

```
http://192.168.1.100:3000
```

Replace `192.168.1.100` with your server's actual IP address.

### 4. Ensure Consistent IP Address

**Important**: Your server should have a consistent IP address so users can reliably access the application.

Options:
1. **Configure Static IP**: Set a static IP in your server's network configuration
2. **DHCP Reservation**: Configure your router to always assign the same IP to your server (recommended for most users)

Consult your router's documentation for setting up DHCP reservations.

### 5. Optional: Use Reverse Proxy for HTTPS

For enhanced security with SSL/TLS encryption, consider setting up a reverse proxy using nginx or Apache. This is beyond the scope of this guide, but many tutorials are available online.

---

## systemd Service Setup

Running the application as a systemd service ensures it:
- Starts automatically on system boot
- Restarts automatically if it crashes
- Runs in the background
- Provides centralized logging

### 1. Create Service File

Create a new systemd service file:

```bash
sudo nano /etc/systemd/system/landlord-software.service
```

### 2. Service Configuration

Paste the following configuration (update paths and username):

```ini
[Unit]
Description=Landlord Management Software
After=network.target
Documentation=https://github.com/yourusername/LandlordSoftware

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername/LandlordSoftware
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/node dist/server/server/src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=landlord-software

[Install]
WantedBy=multi-user.target
```

**IMPORTANT**: Replace the following placeholders:
- `yourusername` - Your Linux username (find with `whoami`)
- `/home/yourusername/LandlordSoftware` - Full path to your installation (find with `pwd` in project directory)

**Finding your Node.js path**:

The `ExecStart` and `Environment PATH` values in the service file need to point to your Node.js binary. The location depends on how you installed Node.js:

```bash
# Find your Node.js binary path
which node
```

Common paths based on installation method:
- **nvm**: `/home/yourusername/.nvm/versions/node/vX.X.X/bin/node`
- **apt/system package manager**: `/usr/bin/node`
- **manual installation**: `/usr/local/bin/node`

Update both the `ExecStart` line and the `Environment PATH` line with your actual Node.js path. For example, if you installed with nvm:

```ini
Environment="PATH=/home/yourusername/.nvm/versions/node/v20.11.0/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/yourusername/.nvm/versions/node/v20.11.0/bin/node dist/server/server/src/server.js
```

### 3. Configuration Explanation

- **User**: Service runs as your user (avoids permission issues)
- **WorkingDirectory**: Project root directory (ensures correct path resolution)
- **Environment PATH**: Includes Node.js binary location
- **ExecStart**: Command to start the application
- **Restart=on-failure**: Automatically restarts if the app crashes
- **RestartSec=10**: Waits 10 seconds before restarting
- **StandardOutput/Error=journal**: Logs to systemd journal

### 4. Enable and Start Service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable landlord-software

# Start the service now
sudo systemctl start landlord-software

# Check service status
sudo systemctl status landlord-software
```

You should see output showing the service is "active (running)".

### 5. Service Management Commands

```bash
# Start the service
sudo systemctl start landlord-software

# Stop the service
sudo systemctl stop landlord-software

# Restart the service
sudo systemctl restart landlord-software

# Check service status
sudo systemctl status landlord-software

# View service logs (real-time)
sudo journalctl -u landlord-software -f

# View last 100 log lines
sudo journalctl -u landlord-software -n 100

# View logs from today
sudo journalctl -u landlord-software --since today

# Disable service from starting on boot
sudo systemctl disable landlord-software
```

### 6. Verify Service is Working

After starting the service, verify it's accessible:

1. Check the service status (should show "active (running)")
2. Visit `http://localhost:3000` on the server
3. Visit `http://SERVER_IP:3000` from another device on your network

---

## Database Backup and Restore

Regular backups are critical for protecting your data. The application uses SQLite databases, making backups straightforward.

### Database Files to Back Up

The application uses two SQLite databases:
1. **Main database**: `data/landlord.db` (properties, tenants, leases, transactions, events)
2. **Session database**: `data/sessions.db` (user sessions - less critical)
3. **Uploaded files**: `uploads/` directory (documents and images)

### Manual Backup

#### 1. Create Backup Script

Create a backup script for easy manual backups:

```bash
nano ~/backup-landlord.sh
```

Paste the following content:

```bash
#!/bin/bash

# Landlord Software Backup Script

# Configuration
PROJECT_DIR="/home/yourusername/LandlordSoftware"
BACKUP_DIR="/home/yourusername/landlord-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="landlord_backup_${DATE}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create temporary backup directory
TEMP_BACKUP="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$TEMP_BACKUP"

echo "Starting backup: $BACKUP_NAME"

# Backup databases
echo "Backing up databases..."
cp "$PROJECT_DIR/data/landlord.db" "$TEMP_BACKUP/"
cp "$PROJECT_DIR/data/sessions.db" "$TEMP_BACKUP/" 2>/dev/null || echo "No sessions.db found (not critical)"

# Backup uploaded files
echo "Backing up uploaded files..."
if [ -d "$PROJECT_DIR/uploads" ]; then
    cp -r "$PROJECT_DIR/uploads" "$TEMP_BACKUP/"
fi

# Backup environment file
echo "Backing up configuration..."
cp "$PROJECT_DIR/.env" "$TEMP_BACKUP/"

# Create compressed archive
echo "Creating archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$TEMP_BACKUP"

# Remove backups older than 7 days
echo "Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "landlord_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
```

**Update the paths**:
- Replace `/home/yourusername/LandlordSoftware` with your project path
- Replace `/home/yourusername/landlord-backups` with your preferred backup location

#### 2. Make Script Executable

```bash
chmod +x ~/backup-landlord.sh
```

#### 3. Run Manual Backup

```bash
~/backup-landlord.sh
```

The script will:
- Create a timestamped backup archive
- Include databases, uploads, and configuration
- Store it in your backup directory
- Remove backups older than 7 days

### Automated Backup with Cron

For daily automated backups, set up a cron job:

#### 1. Edit Crontab

```bash
crontab -e
```

#### 2. Add Backup Schedule

Add this line to run backups daily at 2:00 AM:

```cron
0 2 * * * /home/yourusername/backup-landlord.sh >> /home/yourusername/landlord-backup.log 2>&1
```

**Update the path** to match your username and script location.

**Cron schedule explanation**:
- `0 2 * * *` = Every day at 2:00 AM
- `>> /home/yourusername/landlord-backup.log` = Append output to log file

Other schedule examples:
```cron
0 3 * * * # Daily at 3:00 AM
0 2 * * 0 # Weekly on Sunday at 2:00 AM
0 2 1 * * # Monthly on the 1st at 2:00 AM
```

#### 3. Verify Cron Job

```bash
# List your cron jobs
crontab -l

# Check backup log after scheduled time
cat ~/landlord-backup.log
```

### Restore from Backup

If you need to restore from a backup:

#### 1. Stop the Service

```bash
sudo systemctl stop landlord-software
```

**Why?** Prevents database corruption from simultaneous access during restore.

#### 2. Extract Backup

```bash
# Navigate to backup directory
cd ~/landlord-backups

# List available backups
ls -lh landlord_backup_*.tar.gz

# Extract the backup you want to restore
tar -xzf landlord_backup_20260114_020000.tar.gz
```

#### 3. Restore Files

```bash
# Navigate to project directory
cd ~/LandlordSoftware

# Backup current files (just in case)
mv data/landlord.db data/landlord.db.old
mv uploads uploads.old

# Restore databases
cp ~/landlord-backups/landlord_backup_20260114_020000/landlord.db data/

# Restore uploads
cp -r ~/landlord-backups/landlord_backup_20260114_020000/uploads .

# Restore environment file if needed
cp ~/landlord-backups/landlord_backup_20260114_020000/.env .
```

#### 4. Set Correct Permissions

```bash
chmod 644 data/landlord.db
chmod -R 755 uploads
```

#### 5. Restart Service

```bash
sudo systemctl start landlord-software
sudo systemctl status landlord-software
```

#### 6. Verify Restoration

- Visit the application in your browser
- Check that your data is restored correctly
- Verify uploaded documents are accessible

### Backup Best Practices

1. **Test Restores**: Periodically test your backups by restoring to a test environment
2. **Off-Site Storage**: Copy critical backups to external drives or cloud storage
3. **Monitor Backups**: Regularly check backup logs to ensure backups are running
4. **Retention Policy**: Default is 7 days; adjust based on your needs
5. **Before Updates**: Always backup before updating the application

---

## Security Best Practices

### 1. Environment Variables

- **Never commit `.env` to version control** (already in `.gitignore`)
- **Use strong random secrets** for SESSION_SECRET and JWT_SECRET
- **Regenerate secrets** if you suspect they've been compromised

### 2. File Permissions

Set appropriate permissions for security:

```bash
# Project directory
chmod 755 ~/LandlordSoftware

# Environment file (sensitive)
chmod 600 ~/LandlordSoftware/.env

# Database files
chmod 644 ~/LandlordSoftware/data/*.db

# Upload directory
chmod 755 ~/LandlordSoftware/uploads
```

**Why?**
- `600` = Only owner can read/write (for sensitive files)
- `644` = Owner can write, others can read (for data files)
- `755` = Owner can write, all can read/execute (for directories)

### 3. Firewall Configuration

- **Only open necessary ports** (port 3000 or your chosen port)
- **Restrict access by IP** if you want to limit which devices can connect
- **Keep firewall enabled** at all times

Example for restricting access to local network only:
```bash
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### 4. Regular Updates

Keep your system and dependencies updated:

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies (periodically)
cd ~/LandlordSoftware
npm update

# Rebuild after updates
npm run build
sudo systemctl restart landlord-software
```

### 5. User Access

- **Change default admin password** immediately after first login
- **Use strong passwords** for user accounts
- **Limit admin access** to trusted users only
- **Review user accounts** periodically

### 6. Network Security

- **Local Network Only**: By default, the application is accessible only on your local network. This is appropriate for self-hosted use.
- **Internet Access**: If you need to access from outside your local network:
  - Use a VPN to securely access your local network (recommended)
  - OR use a reverse proxy with SSL/TLS (nginx with Let's Encrypt)
  - **Never** expose the application directly to the internet without HTTPS

### 7. Database Security

- **Regular backups**: Essential for recovery from hardware failure or corruption
- **Backup encryption**: Consider encrypting backup archives if storing off-site
- **Access control**: Ensure database files are only readable by the application user

### 8. Monitoring

Regularly monitor your application:

```bash
# Check service status
sudo systemctl status landlord-software

# Review logs for errors
sudo journalctl -u landlord-software --since today

# Check disk space
df -h

# Monitor system resources
htop  # or top
```

---

## Troubleshooting

### Service Won't Start

**Check service status and logs:**
```bash
sudo systemctl status landlord-software
sudo journalctl -u landlord-software -n 50
```

**Common causes:**

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   sudo lsof -i :3000

   # Solution: Change PORT in .env or stop conflicting service
   ```

2. **Node.js path incorrect:**
   ```bash
   # Find your Node.js path
   which node

   # Update ExecStart path in service file
   sudo nano /etc/systemd/system/landlord-software.service
   sudo systemctl daemon-reload
   ```

3. **Permission issues:**
   ```bash
   # Ensure correct ownership
   chown -R yourusername:yourusername ~/LandlordSoftware

   # Fix permissions
   chmod 755 ~/LandlordSoftware
   chmod 644 ~/LandlordSoftware/data/*.db
   ```

4. **Missing dependencies:**
   ```bash
   cd ~/LandlordSoftware
   npm install
   npm run build
   ```

### Can't Access from Network

**Check firewall:**
```bash
# Verify port is open
sudo ufw status

# If port is blocked, open it
sudo ufw allow 3000/tcp
```

**Verify server is listening:**
```bash
# Check if application is listening on all interfaces
sudo netstat -tlnp | grep 3000

# Should show: 0.0.0.0:3000 or :::3000
```

**Test from server itself:**
```bash
curl http://localhost:3000/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Database Errors

**Database locked error:**
- Caused by multiple processes accessing the database
- Solution: Ensure only one instance is running
  ```bash
  sudo systemctl stop landlord-software
  # Wait a few seconds
  sudo systemctl start landlord-software
  ```

**Database not found:**
- Check DATABASE_URL path in `.env` is absolute and correct
- Verify database file exists: `ls -l ~/LandlordSoftware/data/landlord.db`
- If missing, reinitialize: `npx prisma db push`

**Database corrupted:**
- Restore from backup (see [Restore from Backup](#restore-from-backup))

### Application Crashes

**Check logs for errors:**
```bash
sudo journalctl -u landlord-software -n 100
```

**Common issues:**
- Out of memory: Check with `free -h`, consider increasing server RAM
- Disk full: Check with `df -h`, clean up old files or backups
- Unhandled errors: Review logs, may need to report a bug

**Restart service:**
```bash
sudo systemctl restart landlord-software
```

### Slow Performance

**Check system resources:**
```bash
# CPU and memory usage
htop

# Disk I/O
iostat -x 1 5

# Disk space
df -h
```

**Solutions:**
- Clear old session data: Delete or archive `data/sessions.db`
- Clean up old backups: Remove backups older than needed
- Optimize database: `sqlite3 data/landlord.db "VACUUM;"`
- Increase server resources if consistently overloaded

### Forgot Admin Password

**Production-Safe Password Reset** (preserves all data):

```bash
# Stop service
sudo systemctl stop landlord-software

# Create a password reset script
cd ~/LandlordSoftware
cat > reset-password.js << 'EOF'
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/landlord.db');
const db = new sqlite3.Database(dbPath);

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node reset-password.js <email> <new-password>');
  process.exit(1);
}

bcrypt.hash(newPassword, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  db.run(
    'UPDATE users SET password = ? WHERE email = ?',
    [hash, email],
    function(err) {
      if (err) {
        console.error('Error updating password:', err);
        process.exit(1);
      }
      if (this.changes === 0) {
        console.error(`No user found with email: ${email}`);
        process.exit(1);
      }
      console.log(`Password updated successfully for ${email}`);
      db.close();
    }
  );
});
EOF

# Reset password for admin user
node reset-password.js admin@example.com newSecurePassword123

# Clean up script
rm reset-password.js

# Restart service
sudo systemctl start landlord-software
```

**Alternative: Re-run seed script** (WARNING: This will delete ALL data including properties, tenants, leases, and transactions):

```bash
# Only use this on development/testing systems or if you have a backup
sudo systemctl stop landlord-software
cd ~/LandlordSoftware
npm run db:seed
sudo systemctl start landlord-software
```

### Check Application Health

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-14T12:00:00.000Z"}
```

---

## Additional Resources

### Documentation

- **Node.js**: https://nodejs.org/docs/
- **Express.js**: https://expressjs.com/
- **Prisma**: https://www.prisma.io/docs/

### Support

For issues or questions:
1. Check this deployment guide
2. Review application logs
3. Check the troubleshooting section
4. Consult the project README.md

### Updating the Application

When a new version is available:

```bash
# 1. Backup first!
~/backup-landlord.sh

# 2. Stop the service
sudo systemctl stop landlord-software

# 3. Pull updates (if using git)
cd ~/LandlordSoftware
git pull

# 4. Update dependencies
npm install
cd client && npm install && cd ..

# 5. Rebuild
npm run build

# 6. Update database schema if changed
npx prisma generate
npx prisma db push

# 7. Restart service
sudo systemctl start landlord-software

# 8. Verify
sudo systemctl status landlord-software
```

---

## Summary

You've now completed the deployment of your Landlord Management Software. Here's a quick checklist:

- [x] Prerequisites installed (Node.js, Git)
- [x] Application installed and dependencies installed
- [x] Environment variables configured with strong secrets
- [x] Database initialized
- [x] Production build created
- [x] Firewall configured for local network access
- [x] systemd service configured and running
- [x] Backup script created and tested
- [x] Automated daily backups scheduled
- [x] Security best practices applied

Your application should now be:
- Running automatically on system boot
- Accessible from any device on your local network at `http://SERVER_IP:3000`
- Automatically backing up daily
- Logging to systemd journal for monitoring

**Next Steps:**
1. Access the application and log in with admin credentials
2. Change the default admin password
3. Configure your properties, tenants, and leases
4. Test the backup and restore procedure
5. Set a reminder to review backups periodically

Enjoy your self-hosted Landlord Management Software!
