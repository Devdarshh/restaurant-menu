#!/bin/bash
set -e

# 1. Create /usr/local/bin/menu-logs
sudo tee /usr/local/bin/menu-logs > /dev/null << 'EOF'
#!/bin/bash
clear
echo -e "\033[1;32m╔════════════════════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[1;32m║\033[0m \033[1;33m🌶️   SPICE GARDEN LIVE SERVER LOG MONITOR  •  TERMIUS STREAM            \033[0m\033[1;32m║\033[0m"
echo -e "\033[1;32m╠════════════════════════════════════════════════════════════════════════════╣\033[0m"
echo -e "\033[1;32m║\033[0m  \033[36m• Target Server:\033[0m \033[1;37mhttp://15.207.115.54/\033[0m                                   \033[1;32m║\033[0m"
echo -e "\033[1;32m║\033[0m  \033[36m• Admin Console:\033[0m \033[1;37mhttp://15.207.115.54/admin\033[0m                              \033[1;32m║\033[0m"
echo -e "\033[1;32m║\033[0m  \033[36m• Exit Monitor :\033[0m Press \033[1;33mCtrl + C\033[0m anytime to return to prompt              \033[1;32m║\033[0m"
echo -e "\033[1;32m╚════════════════════════════════════════════════════════════════════════════╝\033[0m"
echo ""

journalctl -u spicegarden -f -o cat -n 40
EOF
sudo chmod +x /usr/local/bin/menu-logs

# 2. Create /usr/local/bin/menu-status
sudo tee /usr/local/bin/menu-status > /dev/null << 'EOF'
#!/bin/bash
echo -e "\033[1;36m=== SPICE GARDEN SYSTEM STATUS ===\033[0m"
echo -e "\033[1m• Node.js Service (spicegarden):\033[0m $(systemctl is-active spicegarden)"
echo -e "\033[1m• Web Proxy (nginx)            :\033[0m $(systemctl is-active nginx)"
echo -e "\033[1m• Memory Usage                 :\033[0m $(free -h | awk '/Mem:/ {print $3 "/" $2}')"
echo -e "\033[1m• Public IP                    :\033[0m 15.207.115.54"
echo -e "\033[1m• Dishes in Database           :\033[0m $(grep -c '"id"' /home/ubuntu/restaurant-menu/data/dishes.json 2>/dev/null || echo '0') items"
echo ""
EOF
sudo chmod +x /usr/local/bin/menu-status

# 3. Add aliases to /home/ubuntu/.bashrc
if ! grep -q "menu-logs" /home/ubuntu/.bashrc; then
  cat >> /home/ubuntu/.bashrc << 'EOF'

# Spice Garden Shortcuts for Termius
alias logs='menu-logs'
alias menu='menu-status'
alias status='menu-status'
alias restart-menu='sudo systemctl restart spicegarden && echo "Server restarted successfully!"'

# Cool welcome greeting on SSH login
echo -e "\033[1;32m"
echo "  🌶️  Welcome to Spice Garden AWS Server!"
echo -e "\033[0m\033[36m  Type \033[1;33mlogs\033[0m\033[36m to watch live requests in real-time."
echo -e "  Type \033[1;33mstatus\033[0m\033[36m to view server health & statistics.\033[0m"
echo ""
EOF
fi

echo "Termius helper scripts installed successfully."
