# DeerFlow Security Hardening Guide
### Lock Down Your DeerFlow Deployment for Production

**By DeerForge — Where AI builders ship.**

---

## Who This Guide Is For

You've got DeerFlow running. Maybe it's on a DigitalOcean droplet, a VPS, or a home server. It works. Io is responding. You're building.

But right now, anyone who finds your IP address can:

- Send unlimited prompts to your AI agent
- Run up your Anthropic API bill without your knowledge
- Execute GitHub operations using your Personal Access Token
- Access your entire DeerFlow interface with no credentials

This guide fixes that. **Every step was executed on a live DeerFlow 2.0 deployment on Ubuntu 24.04 LTS.** The commands are exact. The gotchas are real.

**What you'll have when you're done:**

- UFW firewall blocking all ports except SSH and your DeerFlow UI
- nginx basic authentication requiring credentials to access the UI
- Internal Docker ports confirmed isolated from the public internet
- Telegram bot (if you use one) authenticated through nginx
- External verification that everything actually works

**Time required:** 45–60 minutes. Budget extra time for the nginx auth debugging steps — that's where most deployments need iteration.

---

## How the Security Layers Work Together

This guide adds two independent security layers in front of your DeerFlow services. All external traffic must pass through both before reaching Io.

```
Internet → UFW Firewall (port 2026 only) → nginx Container (Basic Auth) → DeerFlow Services
```

---

## Before You Start

### Prerequisites

- DeerFlow 2.0 running on Ubuntu 24.04 LTS
- **You are logged in as root.** All commands in this guide are written for root. If you are on a different user, prepend `sudo` where needed or switch to root with `su -`.
- SSH access to your server
- A password manager (you will be creating credentials)
- An SFTP editor — WinSCP, VS Code with Remote SSH, or similar. Terminal paste breaks on large nginx configs.

### Critical: Open Two SSH Terminals

> ⚠️ **Do not skip this.** One wrong firewall command can lock you out permanently. Terminal 2 is your recovery path.

Open **two separate SSH sessions** to your server and keep both open throughout this entire guide.

```bash
ssh -i /path/to/your/key root@YOUR_SERVER_IP
```

Do this twice. Confirm both terminals show the server prompt before proceeding.

### The Recovery Plan

If SSH breaks: log into your hosting provider's dashboard and use the browser-based console. For DigitalOcean: Droplets → your droplet → Console. This console bypasses SSH entirely and gives you direct terminal access.

---

## Step 1: UFW Firewall

### What We're Doing

Enabling a firewall that blocks all inbound traffic except SSH (port 22) and your DeerFlow UI (port 2026). Everything else — including any ports that might accidentally be exposed — gets blocked by default.

### Check Current Status

```bash
ufw status
```

Expected output on a fresh deployment:
```
Status: inactive
```

### Allow SSH First — This Order Matters

> ⚠️ **Do not enable the firewall before allowing SSH. If you do, you will lock yourself out of the server.**

```bash
ufw allow 22/tcp
```

Expected output:
```
Rules updated
Rules updated (v6)
```

### Allow Your DeerFlow Port

```bash
ufw allow 2026/tcp
```

### Enable the Firewall

```bash
ufw enable
```

You'll see a warning about disrupting SSH connections. Type `y` and press enter.

**Immediately switch to terminal 2 and confirm you're still connected:**

```bash
echo "still connected"
```

If terminal 2 responds, you're good. If not, use the browser console.

### Verify Clean Ruleset

```bash
ufw status verbose
```

Expected output:
```
Status: active
Default: deny (incoming), allow (outgoing), deny (routed)

To                   Action      From
--                   ------      ----
22/tcp               ALLOW IN    Anywhere
2026/tcp             ALLOW IN    Anywhere
22/tcp (v6)          ALLOW IN    Anywhere (v6)
2026/tcp (v6)        ALLOW IN    Anywhere (v6)
```

**If you see duplicate entries** (e.g., both `2026` and `2026/tcp`), remove the non-specific one:

```bash
ufw delete allow 2026
```

### The Docker/UFW Reality Check

Most firewall guides skip this: **Docker bypasses UFW by manipulating iptables directly.** On a properly configured DeerFlow deployment this isn't a problem — because the nginx container is the only one bound to a public IP. Verify this now:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

What you want to see:
```
NAMES                 PORTS
deer-flow-nginx       0.0.0.0:2026->2026/tcp
deer-flow-frontend    3000/tcp
deer-flow-langgraph   2024/tcp, 8001/tcp
deer-flow-gateway     2024/tcp, 8001/tcp
```

Only `deer-flow-nginx` should show `0.0.0.0:` bindings. The other containers have no public binding — they're on Docker's internal network only. This is correct and expected.

**Verify the internal ports are actually blocked from outside. Run from your local machine, not the server:**

```bash
curl http://YOUR_SERVER_IP:3000
curl http://YOUR_SERVER_IP:8001
```

Expected output:
```
curl: (7) Failed to connect to YOUR_SERVER_IP port 3000 after 0 ms: Couldn't connect to server
```

If either command returns content instead of a connection error, your Docker network configuration needs attention before proceeding.

### Verify Docker Containers Restart After Reboot

Before proceeding, confirm your Docker Compose file has a restart policy so containers survive a server reboot:

```bash
grep -A2 "restart" /root/deer-flow/docker/docker-compose-dev.yaml
```

Each service should include `restart: unless-stopped`. If missing, add it to each service block in the compose file before continuing. Without this, your containers won't come back after a reboot regardless of anything else in this guide.

---

## Step 2: nginx Basic Authentication

### What We're Doing

Adding a username/password prompt to your DeerFlow UI. DeerFlow already runs nginx inside a Docker container — we're adding auth to that existing nginx config, **not installing a separate nginx.** Anyone hitting your IP from the internet gets a login prompt. Internal services (Docker containers, your Telegram bot) bypass auth automatically based on their network IP.

### DeerFlow's nginx Architecture

DeerFlow ships with nginx running inside the `deer-flow-nginx` container. The config file is mounted from the host at `/root/deer-flow/docker/nginx/nginx.conf`. We edit it on the host and restart the container — no image rebuilds needed.

Confirm the mount location (single command):

```bash
docker inspect deer-flow-nginx \
  --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\\n"}}{{end}}'
```

Expected output:
```
/root/deer-flow/docker/nginx/nginx.conf -> /etc/nginx/nginx.conf
```

### Install htpasswd

```bash
apt-get install -y apache2-utils
```

### Create Your Password File

```bash
htpasswd -c /etc/nginx/.htpasswd YOUR_USERNAME
```

You'll be prompted to enter and confirm a password. **Save these credentials in your password manager now.** Label the entry: *DeerFlow Server - nginx Auth*.

Verify the password was set correctly:

```bash
htpasswd -v /etc/nginx/.htpasswd YOUR_USERNAME
```

Expected: `Password for user YOUR_USERNAME correct.`

> **Note:** If you see `invalid option -- 'v'`, your apache2-utils version doesn't support the verify flag. This is fine — the password was still set correctly by the previous command.

### Back Up Your nginx Config

```bash
cp /root/deer-flow/docker/nginx/nginx.conf \
   /root/deer-flow/docker/nginx/nginx.conf.backup
```

### Copy the Password File to the nginx Directory

```bash
cp /etc/nginx/.htpasswd /root/deer-flow/docker/nginx/.htpasswd
```

### Edit the nginx Config and docker-compose File

> ⚠️ **Use an SFTP editor (WinSCP, VS Code Remote SSH) for this step — not terminal paste.** Large config blocks get mangled by terminal paste buffers. We learned this the hard way.

You need to make changes to **two files**. Complete both before restarting anything.

**File 1:** Open `/root/deer-flow/docker/nginx/nginx.conf`

Add inside the `http {}` block, after the upstream blocks:

```nginx
geo $exempt_from_auth {
    default 1;
    127.0.0.1 0;
    172.16.0.0/12 0;
    10.0.0.0/8 0;
    192.168.0.0/16 0;
}

map $exempt_from_auth $auth_realm {
    0 off;
    1 "DeerForge";
}
```

Add inside the `server {}` block, near the top:

```nginx
auth_basic $auth_realm;
auth_basic_user_file /etc/nginx/.htpasswd;
```

**How the exemption works:** The `geo` block assigns `$exempt_from_auth = 0` to internal IPs (localhost, Docker bridge networks). The `map` block translates `0` to `off` — disabling auth for those requests. External IPs get `1` → `"DeerForge"` → auth required.

**About the Docker bridge IP ranges:** Docker typically assigns bridge networks in the `172.x.x.x` range (covered by `172.16.0.0/12`). The `192.168.0.0/16` entry is a safety net for custom Docker network configurations. To find your specific Docker bridge subnet:

```bash
docker network inspect $(docker network ls -q) | grep Subnet
```

Confirm your subnet falls within one of the exempt ranges above. If it doesn't, add it to the `geo` block.

---

**File 2:** Open `/root/deer-flow/docker/docker-compose-dev.yaml`

Find the nginx volumes section:

```yaml
volumes:
  - ./nginx/${NGINX_CONF:-nginx.conf}:/etc/nginx/nginx.conf:ro
```

Add the password file mount:

```yaml
volumes:
  - ./nginx/${NGINX_CONF:-nginx.conf}:/etc/nginx/nginx.conf:ro
  - ./nginx/.htpasswd:/etc/nginx/.htpasswd:ro
```

### Apply the Changes

Volume mount changes require a full down/up — a simple restart won't pick them up:

```bash
cd /root/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

Then verify the nginx config is valid:

```bash
docker exec deer-flow-nginx nginx -t
```

Expected:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 3: Verify Auth Is Working

### Test From a Browser

Open `http://YOUR_SERVER_IP:2026` in a fresh browser window (or incognito). You should see a username/password prompt. Enter your credentials — the DeerFlow UI should load normally.

**Note on browser behavior:** Once you log in successfully, your browser caches the credentials for the session — you won't be prompted on every page load. This is normal. To test auth again, use an incognito window or a different browser.

**If you see a 403 immediately without a prompt:** the `.htpasswd` file isn't being found inside the container. Check that the volume mount was added to docker-compose and that you ran a full `down && up` — not just restart.

### Test That Internal Services Are Exempt

If you have a Telegram bot or other service making API calls to your DeerFlow instance, test it now. It should work without credentials. If it gets 401 errors, check the nginx access log to see what IP it's connecting from:

```bash
docker logs deer-flow-nginx --tail 20
```

Find the 401 entry and note the client IP. If it falls outside the exempt ranges in your `geo` block, add the subnet and restart nginx:

```bash
docker compose -f /root/deer-flow/docker/docker-compose-dev.yaml restart nginx
```

> **Note:** Internal container-to-container API calls (e.g., the DeerFlow frontend calling the LangGraph API) travel through the Docker internal network and are already exempt via the geo block. If your UI loads but AI responses stop working, check the nginx logs for any unexpected 401s from Docker bridge IPs.

### Verify Blocked Ports From Outside

**Run these from your local machine, not the server:**

```bash
# Should fail to connect — internal ports are blocked
curl -s http://YOUR_SERVER_IP:3000
curl -s http://YOUR_SERVER_IP:8001

# Should return 401 — auth is active
curl -s http://YOUR_SERVER_IP:2026

# Should return 200 with health status — auth works with credentials
curl -s -u "YOUR_USERNAME:YOUR_PASSWORD" http://YOUR_SERVER_IP:2026/health
```

Expected outputs:
```
# Blocked ports:
curl: (7) Failed to connect to YOUR_SERVER_IP port 3000: Couldn't connect to server

# Unauthenticated request:
<html><head><title>401 Authorization Required</title></head>...

# Authenticated health check:
{"status":"healthy","service":"deer-flow-gateway"}
```

---

## Step 4: Authenticating Your Telegram Bot

If you're running a Telegram bot that calls the DeerFlow LangGraph API, it needs to send credentials with its requests. The bot runs on the host and hits `http://localhost:2026/api/langgraph/runs/wait` — which goes through nginx and hits the auth layer.

### Add Credentials to Your Bot (axios)

```javascript
const response = await axios.post(deerflowEndpoint, payload, {
  headers: {
    'Content-Type': 'application/json'
  },
  auth: {
    username: 'YOUR_USERNAME',
    password: process.env.NGINX_AUTH_PASSWORD
  },
  timeout: 60000
});
```

### Store the Password Securely

Add the password to your PM2 ecosystem config as an environment variable. **Do not hardcode it in your bot source file.**

```javascript
module.exports = {
  apps: [{
    name: 'telegram-bot',
    script: '/path/to/your/bot.js',
    restart_delay: 10000,
    max_restarts: 50,
    env: {
      NODE_ENV: 'development',
      NGINX_AUTH_PASSWORD: 'your_password_here',
      // ... other env vars
    }
  }]
}
```

> ⚠️ **Do not commit `ecosystem.config.js` to version control** — it contains your nginx password. Add it to `.gitignore` immediately:
> ```bash
> echo "ecosystem.config.js" >> .gitignore
> ```

### PM2 Stability Notes

If your bot crashes repeatedly under PM2 after adding auth, check three things:

- **Environment variables are loaded:** Run `pm2 env 0 | grep NGINX` to confirm the variable is present. If missing, PM2 isn't loading your ecosystem config.
- **Remove `min_uptime` from your ecosystem config:** This causes PM2 to count fast restarts as crashes even during normal startup. Remove it.
- **Polling conflicts:** If your bot uses Telegram's polling mode and PM2 restarts it quickly, the new instance conflicts with the old polling session. Fix: `restart_delay: 10000` gives the old session time to expire.

Start fresh after any config changes:

```bash
pm2 delete telegram-bot
sleep 10
pm2 start /path/to/ecosystem.config.js
pm2 save
```

### Ensure the Bot Survives Server Reboots

By default, PM2 processes don't survive a server reboot unless you configure the systemd service. Run these two commands once after your bot is stable:

```bash
# Generates a systemd command — copy and run the output exactly as shown
pm2 startup

# Saves current process list so it restores on boot
pm2 save
```

`pm2 startup` prints a command starting with `sudo env PATH=...` — copy and run that exact output. After this, your bot starts automatically on every server reboot.

---

## Step 5: Final Verification Checklist

Run through these checks before calling the hardening complete.

**From the server:**

```bash
# Firewall active with correct rules
ufw status verbose

# Only nginx shows 0.0.0.0: binding
docker ps --format "table {{.Names}}\t{{.Ports}}"

# All containers running
docker ps

# nginx config valid
docker exec deer-flow-nginx nginx -t
```

**From your local machine:**

```bash
# Should return 401
curl -s http://YOUR_SERVER_IP:2026

# Should return health status JSON
curl -s -u "USERNAME:PASSWORD" http://YOUR_SERVER_IP:2026/health

# Should fail to connect
curl -s http://YOUR_SERVER_IP:3000
curl -s http://YOUR_SERVER_IP:8001
```

**Functional checks:**

- [ ] DeerFlow UI loads in browser after entering credentials
- [ ] AI responds normally after login (internal API calls are exempt from auth)
- [ ] Telegram bot responds to messages (if applicable)
- [ ] SSH access still works from both terminals
- [ ] `pm2 list` restart count stays stable after sending a message

### Final Step: Reboot and Verify Persistence

> ⚠️ **This is the most important check most guides skip.** Active firewall rules and running containers mean nothing if they don't survive a reboot.

```bash
reboot
```

Wait 60 seconds, then SSH back in and run:

```bash
# Firewall should still be active
ufw status

# All four containers should be running
docker ps

# Bot should be online with 0 new restarts
pm2 list
```

**If UFW shows inactive:** re-run `ufw enable`.  
**If containers are down:** run `docker compose up -d` and add `restart: unless-stopped` to your compose file.  
**If the bot is missing:** run `pm2 startup` and `pm2 save` (see Step 4).

Once all three checks pass after a cold reboot, your hardening is confirmed persistent. **The deployment is production-ready.**

---

## Troubleshooting Reference

**403 Forbidden immediately (no auth prompt)**  
nginx can't find the `.htpasswd` file inside the container. Check that the volume mount is in docker-compose and that you ran a full `down && up` — not just `restart`.

**401 on internal requests after adding auth**  
Your internal service's IP isn't in the `geo` exempt list. Check nginx logs for the actual client IP:
```bash
docker logs deer-flow-nginx --tail 10
```
Find the failing request, note the IP, and add its subnet to the `geo` block. Then restart nginx.

**nginx config test fails**  
Common causes: missing semicolons, wrong quote characters (straight quotes only — no curly/smart quotes), mismatched braces. The error includes the line number — go there first.
```bash
docker exec deer-flow-nginx nginx -t
```

**SSH locked out after enabling UFW**  
Use your hosting provider's browser console (bypasses SSH entirely). Run:
```bash
ufw allow 22/tcp
ufw reload
```

**Docker ports still showing 0.0.0.0: after UFW enabled**  
Docker is bypassing UFW via iptables — this is expected behavior. What matters is that only the nginx container shows a `0.0.0.0:` binding. Internal containers (frontend, langgraph, gateway) should show no public binding. Verify with `docker ps`.

**PM2 bot crashes in a loop after restart**  
Check env vars are loaded: `pm2 env 0`. Check error logs: `pm2 logs telegram-bot --err`. Most common causes: missing env vars, Telegram polling conflicts (add `restart_delay: 10000`), or `min_uptime` in the ecosystem config.

**Containers don't come back after reboot**  
Your Docker Compose file is missing a restart policy. Add `restart: unless-stopped` to each service in your compose file, then run `docker compose up -d` to apply it.

---

## Commands Reference

**UFW**
```bash
ufw status verbose              # View all rules and status
ufw allow 22/tcp                # Allow SSH
ufw allow 2026/tcp              # Allow DeerFlow UI
ufw enable                      # Enable firewall
ufw delete allow 2026           # Remove non-specific duplicate rule
```

**Docker**
```bash
# Check which ports are publicly bound
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Confirm nginx config mount location (single command)
docker inspect deer-flow-nginx \
  --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\\n"}}{{end}}'

# Find Docker bridge subnets
docker network inspect $(docker network ls -q) | grep Subnet
```

**htpasswd**
```bash
htpasswd -c /etc/nginx/.htpasswd USERNAME    # Create new file with user
htpasswd -v /etc/nginx/.htpasswd USERNAME    # Verify password (apache2-utils 2.4+)
```

**nginx (containerized)**
```bash
docker exec deer-flow-nginx nginx -t                    # Test config syntax
docker exec deer-flow-nginx cat /etc/nginx/nginx.conf   # View running config
docker logs deer-flow-nginx --tail 20                   # View access/error logs
```

**Container Management**
```bash
cd /root/deer-flow/docker

# Full restart — required after docker-compose.yaml changes
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d

# nginx only — use after nginx.conf changes only
docker compose -f docker-compose-dev.yaml restart nginx
```

**PM2**
```bash
pm2 list                             # View all processes and restart counts
pm2 env 0                            # Check env vars loaded by process 0
pm2 logs telegram-bot --err          # View error log
pm2 flush                            # Clear all logs
pm2 delete telegram-bot              # Remove process
pm2 start ecosystem.config.js        # Start from ecosystem config
pm2 save                             # Save process list for reboot persistence
pm2 startup                          # Generate systemd service (run printed command)
```

---

## What We Didn't Cover (And Why)

This guide addresses the most critical attack vectors for a DeerFlow deployment. Three areas are intentionally out of scope:

**TLS/HTTPS (~20 minutes with Let's Encrypt)**  
Your traffic between browser and server is currently unencrypted. This matters if you're accessing DeerFlow from public WiFi or sharing access. Requires a domain name and either Let's Encrypt (free) or a self-signed certificate.

**Non-root User (~30 minutes)**  
Running everything as root means a compromised process gets full system access. The fix is creating a dedicated user and adjusting Docker permissions. Deferred because it doesn't address the immediate "anyone can talk to your agent" problem — the firewall and auth do.

**Secrets Management (~1 hour)**  
API keys in plaintext `.env` files are a known risk. Moving them to Docker secrets or a secrets manager is the right long-term approach. The firewall and auth reduce the attack surface significantly in the meantime.

---

## What's Next

Your DeerFlow deployment is now protected against the most common attack vectors. The front door is locked.

- TLS/HTTPS — encrypt traffic between you and your server
- Non-root user — limit blast radius if something is compromised
- Secrets management — move API keys out of plaintext .env files
- Monitoring — set up CPU/RAM alerts so you know if something unexpected is consuming resources

All of these are documented in the DeerForge community. Join us at **discord.gg/GPhj8W4J**.

---

*DeerForge — Where AI builders ship.*  
*Built by builders who've run these exact commands on live deployments.*

