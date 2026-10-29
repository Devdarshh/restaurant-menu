# Spice Garden — Restaurant Menu Website

A simple responsive restaurant menu website built with HTML, CSS, and JavaScript. It is suitable for hosting on an Ubuntu AWS EC2 instance with Nginx.

## Features
- Responsive layout for desktop and mobile
- Menu cards with prices and descriptions
- Category filters
- Search dishes by name or description
- Restaurant contact and opening hours section

## Run locally
Open `index.html` in your browser, or use the VS Code Live Server extension.

The food photos are loaded from Unsplash, so an internet connection is needed to display them.

## Deploy to AWS EC2 (Ubuntu)
1. Create an Ubuntu EC2 instance and allow inbound HTTP (port 80). Restrict SSH (port 22) to your own IP.
2. Connect to the instance and run:

   ```bash
   sudo apt update
   sudo apt install git nginx -y
   sudo systemctl enable --now nginx
   ```

3. Clone your GitHub repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/restaurant-menu.git
   cd restaurant-menu
   ```

4. Copy the website files to Nginx's web directory:

   ```bash
   sudo cp index.html style.css script.js /var/www/html/
   ```

5. Open `http://YOUR_EC2_PUBLIC_IP` in your browser.

## Update deployment
After pushing changes from your computer to GitHub, connect to EC2 and run:

```bash
cd ~/restaurant-menu
git pull origin main
sudo cp index.html style.css script.js /var/www/html/
```

Replace `YOUR_USERNAME` with your GitHub username.
