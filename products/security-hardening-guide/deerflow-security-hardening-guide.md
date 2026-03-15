# DeerFlow Security Hardening Guide
### Lock Down Your Deployment for Production

**By DeerForge — Where AI builders ship.**

---

## Who This Guide Is For

You've got DeerFlow running. Maybe it's on a DigitalOcean droplet, a VPS, or a home server. It works. Io is responding. You're building.

But right now, anyone who finds your IP address can:

- Send unlimited prompts to your AI agent
- Run up your Anthropic API bill without your knowledge
- Execute GitHub operations using your Personal Access Token
- Access your entire DeerFlow interface with no credentials

This guide fixes that. Every step in this guide was executed on a live DeerFlow 2.0 deployment on Ubuntu 24.04 LTS. The commands are exact. The gotchas are real.

**What you'll have when you're done:**

- UFW firewall blocking all ports except SSH and your DeerFlow UI
- nginx basic authentication requiring credentials to access the UI
- Internal Docker ports confirmed isolated from the public internet
- Telegram bot (if you use one) authenticated through nginx
- External verification that everything actually works

**Time required:** 45–60 minutes. Budget extra time if you hit the Docker/UFW gotcha or the nginx auth debugging steps — those are the two places most likely to need iteration.

---

## Before You Start

### Prerequisites

- DeerFlow 2.0 running on Ubuntu 24.04 LTS
- SSH access to your server
- A password manager (you'll be creating credentials)
- WinSCP or another SFTP client (needed for one file edit — terminal paste breaks on large configs)

### Critical: Open Two SSH Terminals

Before touching anything, open **two separate SSH sessions** to your server. Keep both open throughout this entire guide.

If you accidentally lock yourself out of SSH, terminal 2 saves you. If terminal 2 is also broken, you need your hosting provider's browser console. Know where that is before you start.

```bash
ssh -i /path/to/your/key root@YOUR_SERVER_IP
```

Do this twice. Confirm both terminals show the server prompt before proceeding.

### The Recovery Plan

If SSH breaks: log into your hosting provider's dashboard and use the browser-based console to access your server. For DigitalOcean, this is Droplets → your droplet → Console.

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

**Do not enable the firewall before allowing SSH.** If you do, you will lock yourself out.

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

Expected output:
```
Rules updated
Rules updated (v6)
```

### Enable the Firewall

```bash
ufw enable
```

You'll see a warning about disrupting SSH connections. Type `y` and press enter.

```
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
```

**Immediately switch to terminal 2 and confirm you're still connected:**

```bash
echo "still connected"
```

If terminal 2 responds, you're good. If not, use the browser console to fix it.

### Verify Clean Ruleset

```bash
ufw status verbose
```

Expected output:
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
2026/tcp                   ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere (v6)
2026/tcp (v6)              ALLOW IN    Anywhere (v6)
```

If you see duplicate entries (e.g., `2026` and `2026/tcp` both listed), clean them up:

```bash
ufw delete allow 2026
```

This removes the non-specific entry, keeping only the explicit `2026/tcp` rule.

### The Docker/UFW Reality Check

Here's something most firewall guides don't tell you: **Docker bypasses UFW by manipulating iptables directly.** A standard UFW setup will block traffic at the firewall level, but Docker can still expose container ports around it.

On a properly configured DeerFlow deployment, this isn't a problem — because the nginx container is the only one bound to a public IP. Verify this now:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

What you want to see:

```
NAMES                 PORTS
deer-flow-nginx       80/tcp, 0.0.0.0:2026->2026/tcp, [::]:2026->2026/tcp
deer-flow-frontend    3000/tcp
deer-flow-langgraph   2024/tcp, 8001/tcp
deer-flow-gateway     2024/tcp, 8001/tcp
```

The critical column is `PORTS`. Only `deer-flow-nginx` should show `0.0.0.0:` bindings. The other containers should show ports without any `0.0.0.0:` prefix — that means they're on Docker's internal network only.

**Verify the internal ports are actually blocked from outside:**

From your local machine (not the server), run:

```bash
curl http://YOUR_SERVER_IP:3000
curl http://YOUR_SERVER_IP:8001
```

Both should return:
```
curl: (7) Failed to connect to YOUR_SERVER_IP port 3000 after 0 ms: Couldn't connect to server
```

If they connect, you have a Docker/iptables conflict that needs additional configuration. In our deployment, the internal ports were already properly isolated — the nginx container architecture handles this correctly by default.

**Step 1 complete.** Firewall is active, internal ports are isolated.

---

## Step 2: nginx Basic Authentication

### What We're Doing

Adding a username/password prompt to your DeerFlow UI. Anyone hitting your IP from the internet gets a login prompt. Internal services (Docker containers, your Telegram bot) bypass auth automatically based on their network IP.

### Find Your nginx Config

First, confirm where your nginx config lives:

```bash
docker inspect deer-flow-nginx --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

On a standard DeerFlow deployment, you'll see:
```
/root/deer-flow/docker/nginx/nginx.conf -> /etc/nginx/nginx.conf
```

This means the config is mounted from the host — you edit it on the host and restart the container. No image rebuilds needed.

### Install htpasswd

```bash
apt-get install -y apache2-utils
```

This installs the `htpasswd` tool for generating password files.

### Create Your Password File

```bash
htpasswd -c /etc/nginx/.htpasswd YOUR_USERNAME
```

Replace `YOUR_USERNAME` with whatever username you want. You'll be prompted to enter and confirm a password.

**Save these credentials in your password manager now.** Label the entry something like `DeerFlow Server - nginx Auth`.

Verify the password was set correctly:

```bash
htpasswd -v /etc/nginx/.htpasswd YOUR_USERNAME
```

Enter your password when prompted. You should see:
```
Password for user YOUR_USERNAME correct.
```

### Back Up Your nginx Config

Before editing anything:

```bash
cp /root/deer-flow/docker/nginx/nginx.conf /root/deer-flow/docker/nginx/nginx.conf.backup
```

### Copy the Password File to the nginx Directory

The nginx container needs access to the password file. Copy it into the mounted nginx directory:

```bash
cp /etc/nginx/.htpasswd /root/deer-flow/docker/nginx/.htpasswd
```

### Edit the nginx Config

**Use WinSCP or another SFTP client for this step.** Do not attempt to paste large nginx configs into a terminal — the paste buffer will mangle the file.

Open `/root/deer-flow/docker/nginx/nginx.conf` in your SFTP client's editor.

You need to add two blocks to your existing config. Here's what to add and where:

**Inside the `http {}` block, after any existing `upstream` blocks, add:**

```nginx
geo $exempt_from_auth {
    default 1;
    127.0.0.1 0;
    172.16.0.0/12 0;
    10.0.0.0/8 0;
    192.168.0.0/16 0;
}

map $exempt_from_auth $auth_realm {
    0   "off";
    1   "DeerForge";
}
```

**Inside the `server {}` block, near the top, add:**

```nginx
auth_basic $auth_realm;
auth_basic_user_file /etc/nginx/.htpasswd;
```

**What this does:** The `geo` block checks the client IP. Requests from localhost and all private network ranges (Docker bridge networks, internal subnets) get `$exempt_from_auth = 0`. External requests get `$exempt_from_auth = 1`. The `map` block translates those values: `0` means auth is `"off"`, `1` means auth is required with realm name `"DeerForge"`.

**Why `192.168.0.0/16` matters:** Docker's bridge network uses IPs in the `192.168.x.x` range. In our deployment, the Telegram bot running on the host appeared to nginx as `192.168.200.1`. Without this range in the exempt list, internal services get a 401 even though they're local. Discover your actual bridge IP by checking nginx logs after a failed internal request:

```bash
docker logs deer-flow-nginx --tail 10
```

Look for the IP address in failed requests and make sure it falls within one of your exempt ranges.

### Mount the Password File

Add the password file as a volume mount in your docker-compose file. Open `/root/deer-flow/docker/docker-compose-dev.yaml` and find the nginx volumes section:

```yaml
volumes:
  - ./nginx/${NGINX_CONF:-nginx.conf}:/etc/nginx/nginx.conf:ro
```

Add one line:

```yaml
volumes:
  - ./nginx/${NGINX_CONF:-nginx.conf}:/etc/nginx/nginx.conf:ro
  - ./nginx/.htpasswd:/etc/nginx/.htpasswd:ro
```

### Test the Config Before Restarting

```bash
docker exec deer-flow-nginx nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If you get errors, check your config edits. Common mistakes: missing semicolons, mismatched braces, wrong quote style.

### Apply the Changes

Volume mount changes require a full down/up — a simple restart won't pick them up:

```bash
cd /root/deer-flow/docker && docker compose -f docker-compose-dev.yaml down && docker compose -f docker-compose-dev.yaml up -d
```

**Step 2 complete.** nginx auth is configured.

---

## Step 3: Verify Auth Is Working

### Test From a Browser

Open `http://YOUR_SERVER_IP:2026` in a fresh browser window (or incognito). You should see a username/password prompt. Enter your credentials — the DeerFlow UI should load.

If you see a 403 immediately without a prompt, the password file isn't being found. Check that the volume mount was added correctly and that you ran a full down/up (not just restart).

### Test That Internal Services Are Exempt

If you have a Telegram bot or other service making API calls to your DeerFlow instance, test it now. It should work without credentials.

If your Telegram bot gets 401 errors after adding auth, check the nginx access log to see what IP it's connecting from:

```bash
docker logs deer-flow-nginx --tail 20
```

Find the 401 entry and note the client IP. Add that IP range to the `geo` block in your nginx config if it's not already covered.

### Verify Blocked Ports From Outside

From your local machine:

```bash
curl -s http://YOUR_SERVER_IP:3000
curl -s http://YOUR_SERVER_IP:8001
```

Both should fail to connect — these internal ports should be unreachable from outside.

```bash
curl -s http://YOUR_SERVER_IP:2026
```

This should return a 401 (unauthorized) without credentials, confirming auth is active.

**Step 3 complete.** Auth is verified working.

---

## Step 4: Authenticating Your Telegram Bot

If you're running a Telegram bot that calls the DeerFlow LangGraph API, it needs to send credentials with its requests. The bot runs on the host and hits `http://localhost:2026/api/langgraph/runs/wait` — which goes through nginx and therefore hits the auth layer.

### Add Credentials to Your Bot

If your bot uses axios, add an `auth` field to the request:

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

Add the password to your PM2 ecosystem config rather than hardcoding it:

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

**Do not put the password directly in the bot source code.** Use environment variables.

### PM2 Stability Note

If your Telegram bot crashes repeatedly under PM2 after adding auth, check two things:

1. **Environment variables are actually loaded:** Run `pm2 env 0 | grep NGINX` to confirm the variable is present. If it's missing, PM2 isn't loading your ecosystem config correctly.

2. **Avoid `min_uptime` in your ecosystem config:** This setting causes PM2 to count fast restarts as crashes even when the bot is starting normally. Remove it if you have it.

3. **Polling conflicts:** If your bot uses Telegram's polling mode and PM2 restarts it quickly, the new instance conflicts with the old polling session. The fix: add `restart_delay: 10000` to give the old session time to expire before the new one starts.

---

## Step 5: Final Verification Checklist

Run through these checks before calling the hardening complete:

**From the server:**
```bash
# Firewall status
ufw status verbose

# Container port bindings
docker ps --format "table {{.Names}}\t{{.Ports}}"

# All containers running
docker ps

# nginx config is valid
docker exec deer-flow-nginx nginx -t
```

**From your local machine:**
```bash
# DeerFlow UI requires auth
curl -s http://YOUR_SERVER_IP:2026
# Expected: 401 Unauthorized

# With credentials, it works
curl -s -u "YOUR_USERNAME:YOUR_PASSWORD" http://YOUR_SERVER_IP:2026
# Expected: HTML response (the UI)

# Internal ports are blocked
curl -s http://YOUR_SERVER_IP:3000
curl -s http://YOUR_SERVER_IP:8001
# Expected: connection refused/timeout
```

**Functional tests:**
- [ ] DeerFlow UI loads in browser after entering credentials
- [ ] Telegram bot responds to messages (if applicable)
- [ ] SSH access still works from both terminals

---

## What We Didn't Cover (And Why)

**TLS/HTTPS:** Your traffic between browser and server is currently unencrypted. This matters if you're accessing DeerFlow from public WiFi or sharing access with others. It's the next hardening step — but it requires a domain name and either Let's Encrypt or a self-signed certificate. Out of scope for this guide.

**Non-root user:** Running everything as root is bad practice. A compromised process gets full system access. The fix is creating a dedicated user and adjusting Docker permissions. Deferred because it doesn't address the immediate "anyone can talk to your agent" problem — the firewall and auth do.

**Secrets management:** API keys in plaintext `.env` files are a known risk. Moving them to Docker secrets or a secrets manager is the right long-term approach. The firewall and auth reduce the attack surface significantly in the meantime.

---

## Troubleshooting Reference

**UFW enabled but ports still open:**
Docker is bypassing UFW via iptables. Verify that your container port bindings don't include `0.0.0.0:` for any port you want blocked. The fix is in the docker-compose configuration, not UFW.

**403 Forbidden immediately without auth prompt:**
nginx can't find the `.htpasswd` file inside the container. Check that the volume mount is in docker-compose and that you ran a full `down && up` (not just restart).

**401 on internal requests after adding auth:**
Your internal service's IP isn't in the `geo` exempt list. Check nginx logs for the actual client IP, add its range to the geo block, and restart the nginx container.

**nginx config test fails:**
Common causes: missing semicolons, wrong quote characters (use straight quotes, not curly), mismatched braces. The error message will include the line number — go there first.

**SSH locked out after enabling UFW:**
Use your hosting provider's browser console. Run `ufw allow 22/tcp` then `ufw reload`. The browser console bypasses SSH entirely.

**PM2 bot crashes repeatedly:**
Check `pm2 env 0` to verify environment variables are loaded. Check `pm2 logs your-bot --err` for the actual error. The most common causes: missing env vars, polling conflicts (add `restart_delay`), or `min_uptime` misconfiguration.

---

## Commands Reference

```bash
# UFW
ufw status verbose
ufw allow 22/tcp
ufw allow 2026/tcp
ufw enable
ufw delete allow 2026

# Docker port inspection
docker ps --format "table {{.Names}}\t{{.Ports}}"
docker inspect deer-flow-nginx --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# htpasswd
htpasswd -c /etc/nginx/.htpasswd USERNAME     # Create new file
htpasswd -v /etc/nginx/.htpasswd USERNAME     # Verify password

# nginx
docker exec deer-flow-nginx nginx -t          # Test config
docker exec deer-flow-nginx cat /etc/nginx/nginx.conf  # View config

# Container management
cd /root/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
docker compose -f docker-compose-dev.yaml restart nginx

# nginx logs
docker logs deer-flow-nginx --tail 20

# PM2
pm2 list
pm2 logs telegram-bot --lines 20
pm2 env 0
pm2 flush
pm2 delete telegram-bot
pm2 start ecosystem.config.js
pm2 save
```

---

## What's Next

Your DeerFlow deployment is now protected against the most common attack vectors. The front door is locked.

The next steps when you're ready:

1. **TLS/HTTPS** — encrypt traffic between you and your server
2. **Non-root user** — limit blast radius if something is compromised  
3. **Secrets management** — move API keys out of plaintext `.env` files
4. **Monitoring** — set up CPU/RAM alerts so you know if something unexpected is consuming resources

All of these are documented in the DeerForge community. Join us at **discord.gg/GPhj8W4J**.

---

*DeerForge — Where AI builders ship.*  
*Built by builders who've run these exact commands on live deployments.*

