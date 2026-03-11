# DeerFlow Docker Masterclass

**The Complete Guide to Running DeerFlow 2.0 on Your Own Infrastructure**

Version 2.0 · DeerForge · deerforge.io

---

> **TIP:** This guide is a living document.
> Every buyer receives all future versions automatically — no re-purchase required. When we ship a new version, we'll notify you with what changed and why. You bought the knowledge, not a snapshot.

> **TIP:** Two formats, two audiences.
> This guide is available in two formats — and we shipped both deliberately. The PDF available at deerforge.io is formatted for you. This Markdown version is formatted for your agents. If you are using an AI assistant, a RAG pipeline, or feeding documentation into a coding agent, this .md version will parse cleanly without layout artifacts, page breaks, or formatting noise. We believe the best developer documentation serves both the human and the tools they work with.

## Guide Conventions

This guide uses labeled callout blocks throughout. Here is what each one means:

- **TIP** — Helpful context, best practices, or explanations of why something works a certain way.
- **WARNING** — Something that will silently cause problems if you miss it. Not an error yet, but it will be.
- **DO NOT** — An anti-pattern discovered the hard way. Doing this will break something, often silently.
- **VERIFY** — A confirmation step. Run this to prove the previous step worked.

---

## Table of Contents

- [Chapter 1: Introduction](#chapter-1-introduction)
- [Chapter 2: Before You Start](#chapter-2-before-you-start)
- [Chapter 3: The Architecture](#chapter-3-the-architecture)
- [Chapter 4: Setting Up Your Server](#chapter-4-setting-up-your-server)
- [Chapter 5: Cloning and Configuring DeerFlow](#chapter-5-cloning-and-configuring-deerflow)
- [Chapter 6: The Dockerfile Modifications](#chapter-6-the-dockerfile-modifications)
- [Chapter 7: First Launch](#chapter-7-first-launch)
- [Chapter 8: Configuring GitHub MCP](#chapter-8-configuring-github-mcp)
- [Chapter 9: The Telegram Bot](#chapter-9-the-telegram-bot)
- [Chapter 10: Troubleshooting](#chapter-10-troubleshooting)
- [Chapter 11: What NOT to Do](#chapter-11-what-not-to-do)
- [Chapter 12: Diagnostic Reference](#chapter-12-diagnostic-reference)
- [Chapter 13: Next Steps](#chapter-13-next-steps)

---

## Chapter 1: Introduction

You are here because you want to run DeerFlow 2.0 on your own infrastructure and have it actually work. You have probably already tried the README. If it worked on the first attempt, you would not be reading this — so let's skip the preamble and talk about what happened.

DeerFlow is a multi-agent AI framework built on LangGraph. It can run complex research, coding, and analysis tasks by coordinating multiple specialized AI agents. It is a genuinely impressive system. It is also genuinely difficult to get running in a containerized deployment, for reasons that have nothing to do with your skill level and everything to do with undocumented dependencies, silent failure modes, and configuration decisions that only make sense once someone explains why they were made that way.

This guide is that explanation.

It documents a real, production DeerFlow 2.0 deployment — built, broken, fixed, broken differently, and fixed again across seven sessions of actual infrastructure work on a DigitalOcean droplet. Every gotcha in this guide was encountered firsthand. Every fix was verified to work. Every anti-pattern was discovered by doing it the wrong way first.

None of this is in the official DeerFlow documentation. The specific fixes for GitHub MCP authentication, the missing langchain-anthropic dependency, the Node.js requirement, the client.py subprocess environment patch, the difference between restarting and rebuilding a container — none of it exists in any publicly searchable source.

### What You'll Have When You're Done

By the end of this guide, you will have:

- A fully running DeerFlow 2.0 instance on a DigitalOcean droplet (or equivalent VPS)
- Anthropic's Claude models working as the AI backbone
- GitHub MCP configured and authenticated, giving your agent the ability to create repos, push files, and manage code
- A Telegram bot connected and running via PM2 with systemd startup
- The confidence to rebuild the entire stack from scratch if something breaks
- A clear mental model of why each component exists and what it does

That last point matters more than it sounds. When something breaks at 2am — and something will eventually break at 2am — the difference between fixing it in five minutes and spending three hours is whether you understand the system or just followed the steps.

---

## Chapter 2: Before You Start

### Prerequisites

**A VPS with enough resources.** This guide uses a DigitalOcean droplet: 16GB RAM, 4 vCPUs, Premium AMD, running Ubuntu 24.04 LTS. DeerFlow's container stack is not lightweight — four containers run simultaneously, one of them running a LangGraph server that loads and coordinates multiple AI agents. 8GB of RAM will leave you swapping. 16GB gives you headroom.

**An Anthropic API key.** You need an active key from console.anthropic.com with access to Claude Sonnet 4. The correct model string is `claude-sonnet-4-20250514` — this goes in config.yaml and is covered in Chapter 5.

**A GitHub Personal Access Token (PAT).** Generate one at github.com/settings/tokens with the `repo` scope. You will need it in two different places.

**Optional: a Telegram Bot Token.** Create one via @BotFather on Telegram for mobile access. Everything else works without it.

### Environment Variables Summary

| Variable | Where to Get It | Required? |
|----------|----------------|-----------|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Yes |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | github.com/settings/tokens | Yes (for GitHub MCP) |
| `TAVILY_API_KEY` | tavily.com | Yes (web search) |
| `JINA_API_KEY` | jina.ai | Yes (content extraction) |
| `DEER_FLOW_EXTENSIONS_CONFIG_PATH` | Set to `/app/backend/.deer-flow/extensions_config.json` | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram @BotFather | Optional |
| `TELEGRAM_ALLOWED_USER_ID` | Your Telegram user ID | Optional |

### What the Stack Actually Is

DeerFlow 2.0 runs as four Docker containers coordinated by Docker Compose:

**nginx** — The reverse proxy. The only container with a port exposed to the outside world (port 2026). It receives every incoming HTTP request and routes it to the correct internal service.

**frontend** — A Next.js development server on port 3000 (internal only). Serves the web UI.

**gateway** — A FastAPI application on port 8001 (internal only). Handles API routing and request processing.

**langgraph** — The core. A LangGraph server on port 2024 (internal only). This is where your AI agent lives — it loads the agent definition, manages conversation state, coordinates tool use (including MCP servers like GitHub), and handles communication with the Anthropic API.

---

## Chapter 3: The Architecture

### How Requests Flow

When you open the DeerFlow UI and send a message, your browser connects to `http://your-server-ip:2026`. nginx receives the request and checks the URL path:

| URL Pattern | Routes To | Container |
|-------------|-----------|-----------|
| `/api/langgraph/*` | port 2024 | langgraph |
| `/api/*` | port 8001 | gateway |
| `/*` (everything else) | port 3000 | frontend |

Understanding this routing explains why a 502 Bad Gateway means "nginx cannot reach one of the internal containers," not "the internet is broken."

### The Volume Mount System

Docker containers are ephemeral — anything written inside a container disappears when the container is removed. Volume mounts map a host directory to a container directory. DeerFlow's langgraph container has these mounts:

| Host Path | Container Path | Contents |
|-----------|---------------|----------|
| `/root/.cache/uv` | `/root/.cache/uv` | Build cache (speeds up rebuilds) |
| `../backend/src` | `/app/backend/src` | Python source code |
| `../backend/.deer-flow` | `/app/backend/.deer-flow` | MCP config, memory, threads |
| `../backend/.env` | `/app/backend/.env` | Backend env directory (not a file) |
| `../config.yaml` | `/app/config.yaml` | Model configuration |
| `../skills` | `/app/skills` | Agent skills |
| `../logs` | `/app/logs` | Log files |

> **WARNING:** The host files always win.
> If you edit a volume-mounted file inside a running container, your edit will appear to work immediately. But on the next container restart, the host's version overwrites your change — silently, with no warning. Always edit files on the host, never inside the container.

> **WARNING:** The backend/ root is NOT mounted.
> Only specific subdirectories (`backend/src/` and `backend/.deer-flow/`) are mounted as live volumes. The pyproject.toml file lives in the image layer, not on a volume mount. When you rebuild with `--build`, COPY bakes the host's current pyproject.toml into the new image. Any in-container package installations from a previous run are gone. Always edit the host's pyproject.toml and rebuild.

### The .env File — And the Directory Trap

The environment configuration lives at `/root/deer-flow/.env`. This is the real .env file.

> **DO NOT:** `backend/.env` is a directory, not a file.
> The path `/root/deer-flow/backend/.env` is a directory. If you try to create or edit an .env file there, you will either create a file inside that directory or get a confusing error. The real env file is at the repo root: `/root/deer-flow/.env`

---

## Chapter 4: Setting Up Your Server

If you are using DigitalOcean, create a droplet with Ubuntu 24.04 LTS, 16GB RAM / 4 vCPUs (Premium AMD recommended), SSH key authentication. Any other provider with equivalent specs works.

### Initial Server Setup

```bash
ssh -i ~/.ssh/your_key root@your-server-ip

apt update && apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose-v2

# Verify
docker --version
docker compose version

# Install Git
apt install -y git
```

> **WARNING:** This guide produces a working development deployment, not a hardened production environment.
>
> The setup in this guide runs all services as root, exposes port 2026 over unencrypted HTTP, and stores API keys in a plaintext .env file. These are standard trade-offs for a first deployment where the priority is getting the system running and verifiable.
>
> Before exposing this deployment to the public internet or sharing access with others, you should address:
>
> - **Firewall rules** — UFW or iptables to restrict inbound traffic to ports 22 and 2026 only
> - **TLS termination** — HTTPS via Let's Encrypt or Cloudflare, either on nginx or a reverse proxy in front of it
> - **Authentication** — HTTP basic auth or token-based auth on the nginx proxy so the LangGraph API endpoint is not publicly accessible
> - **Non-root user** — Running Docker and services under a dedicated user, not root
> - **Secrets management** — Moving API keys out of plaintext .env into Docker secrets, HashiCorp Vault, or your cloud provider's secrets manager
>
> Without at least a firewall and authentication layer, anyone who discovers your server IP can send prompts to your agent, consume your API credits, and — if GitHub MCP is configured — execute GitHub operations using your personal access token.
>
> A production hardening guide covering these topics is planned for a future DeerForge release.

---

## Chapter 5: Cloning and Configuring DeerFlow

### Clone the Repository

```bash
cd /root
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
```

### Configure the Environment File

Create and edit the .env at the repo root:

```bash
nano /root/deer-flow/.env
```

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
TAVILY_API_KEY=tvly-your-key-here
JINA_API_KEY=jina_your-key-here

# GitHub - BOTH variables must be set
GITHUB_TOKEN=ghp_your-token-here
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your-token-here

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ALLOWED_USER_ID=your-telegram-user-id

# MCP config path
DEER_FLOW_EXTENSIONS_CONFIG_PATH=/app/backend/.deer-flow/extensions_config.json
```

> **TIP:** Why two GitHub token variables?
> GitHub MCP server v0.6.2 changed its expected environment variable from `GITHUB_TOKEN` to `GITHUB_PERSONAL_ACCESS_TOKEN`. If you only set `GITHUB_TOKEN`, the MCP server silently ignores it and every GitHub operation fails with "Authentication Failed" — even though your token is valid. Set both with the same token value.

### Configure the Model

Edit config.yaml and set the model to `claude-sonnet-4-20250514`.

```bash
nano /root/deer-flow/config.yaml
```

> **DO NOT:** Do NOT use old model strings.
> Do not use `claude-3-5-sonnet-20241022` or `claude-3-5-sonnet-latest`. These return 404 at inference time — not at startup. Everything appears to start correctly, but messages fail. The correct string for current API keys is `claude-sonnet-4-20250514`.

---

## Chapter 6: The Dockerfile Modifications

The stock Dockerfile is built from `python:3.12-slim`, which includes Python and almost nothing else. No Node.js, no npm. This causes GitHub MCP to fail silently. A separate missing dependency — langchain-anthropic — is addressed in the pyproject.toml update that follows.

### The Complete Working Dockerfile

Edit the Dockerfile at `/root/deer-flow/backend/Dockerfile`:

```bash
nano /root/deer-flow/backend/Dockerfile
```

```dockerfile
# Backend Development Dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy backend source code
COPY backend ./backend

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    cd backend && uv sync

# Expose ports (gateway: 8001, langgraph: 2024)
EXPOSE 8001 2024

# Default command
CMD ["sh", "-c", "uv run uvicorn src.gateway.app:app --host 0.0.0.0 --port 8001"]
```

The key addition: `nodejs` and `npm` in apt-get, required for GitHub MCP via npx.

> **TIP:** The CMD line is the default for the gateway container.
> The docker-compose file overrides the startup command for each container separately. The langgraph container runs its own LangGraph dev server command, not this CMD. You do not need to modify CMD.

### Also Update pyproject.toml

Find the dependencies list inside the `[project]` table in `/root/deer-flow/backend/pyproject.toml`. Add `"langchain-anthropic>=0.3.0"` as a new entry. Here is what the surrounding area should look like:

```toml
[project]
name = "deer-flow"
# ... other fields ...
dependencies = [
    "langchain>=1.2.3",
    "langgraph>=0.2.0",
    "langchain-anthropic>=0.3.0",  # <-- add this line
    # ... other existing dependencies ...
]
```

The exact entries above and below yours may differ — what matters is that `"langchain-anthropic>=0.3.0"` appears as an item inside the dependencies list.

> **WARNING:** pyproject.toml must include the dependency.
> pyproject.toml lives in the image layer. The COPY instruction bakes it into the image at build time. If langchain-anthropic is not listed there, `uv sync` will not install it. Adding it to pyproject.toml and rebuilding with `--build` is the correct and only permanent fix.

> **DO NOT:** Do not install packages only via docker exec.
> Running `docker exec deer-flow-langgraph uv add langchain-anthropic` works immediately but disappears on the next rebuild. The host's pyproject.toml always wins at build time.

---

## Chapter 7: First Launch

### The Correct Startup Sequence

> **WARNING:** Always run docker compose from the `docker/` directory.
> The compose file uses relative paths for all volume mounts (`../backend/src`, `../config.yaml`, etc.). Running docker compose from any other directory will silently break file mounting — your containers will start but the host files won't be visible inside them.

```bash
cd /root/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d --build
```

The `--build` flag builds images from Dockerfiles before starting. Mandatory on first run. On subsequent runs, only needed if you changed the Dockerfile or pyproject.toml.

> **TIP:** Wait 60 seconds before testing.
> The frontend container needs time to compile and start the Next.js dev server. If you run the verification commands immediately, you will get connection refused errors that resolve on their own. Give it a full minute.

### Verifying the Startup

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

You should see all four containers (`deer-flow-nginx`, `deer-flow-frontend`, `deer-flow-gateway`, `deer-flow-langgraph`) with status `Up`.

### Verification Checklist

**1. langchain-anthropic installed:**

```bash
docker exec deer-flow-langgraph \
    /app/backend/.venv/bin/python -c "import langchain_anthropic; print('OK')"
```

**2. npx available:**

```bash
docker exec deer-flow-langgraph which npx && \
    docker exec deer-flow-langgraph npx --version
```

**3. GitHub token in container:**

```bash
docker exec deer-flow-langgraph env | grep GITHUB
```

**4. Web UI loads:** Open `http://your-server-ip:2026` in your browser.

**5. Full end-to-end test:**

```bash
curl -s http://localhost:2026/api/langgraph/runs/wait \
    -X POST -H "Content-Type: application/json" \
    -d '{"assistant_id":"YOUR-UUID-HERE",
         "input":{"messages":[{"role":"human","content":"Hello"}]},
         "config":{"configurable":{"thread_id":"test-001"}}}' \
    --max-time 90
```

> **TIP:** Use `'role': 'human'`, not `'role': 'user'`.
> LangGraph uses LangChain message types, not the OpenAI convention. Using `'role': 'user'` fails silently or produces unexpected behavior.

> **TIP:** The assistant_id is a UUID, not a string name.
> Using `'assistant_id': 'lead_agent'` will not work. LangGraph requires the UUID. Look it up with:
> ```bash
> curl -s http://localhost:2026/api/langgraph/assistants/search \
>     -X POST -H 'Content-Type: application/json' -d '{"limit":10}'
> ```

### Checking Logs

```bash
# Langgraph logs (most important -- filter noise)
docker exec deer-flow-langgraph tail -50 /app/logs/langgraph.log \
    | grep -v "changes detected\|Worker stats\|Queue stats"

# Gateway logs
docker exec deer-flow-gateway cat /app/logs/gateway.log | tail -30

# nginx logs (uses stdout)
docker logs deer-flow-nginx 2>&1 | tail -30
```

> **WARNING:** Don't expect `docker logs` to show langgraph errors.
> The LangGraph server redirects output to `/app/logs/langgraph.log` inside the container. `docker logs` shows only the startup banner — not the runtime errors you need.

---

## Chapter 8: Configuring GitHub MCP

This chapter covers the Model Context Protocol integration that gives your agent GitHub access. Getting this working required solving three separate problems, each of which fails silently.

### Step 1: The Extensions Config File

```bash
nano /root/deer-flow/backend/.deer-flow/extensions_config.json
```

```json
{
    "mcpServers": {
        "github": {
            "enabled": true,
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_PERSONAL_ACCESS_TOKEN"
            }
        }
    }
}
```

> **WARNING:** File location is strict.
> This file must live at `backend/.deer-flow/extensions_config.json`. Only `backend/src/` and `backend/.deer-flow/` are volume-mounted into the container. A config file anywhere else will not exist inside the container.

> **DO NOT:** Do not hardcode the token.
> Use `$GITHUB_PERSONAL_ACCESS_TOKEN` (with the dollar sign) to reference the environment variable. DeerFlow's config resolver substitutes it at load time.

See the security warning in Chapter 4 for additional considerations about protecting tokens in transit.

> **DO NOT:** Do not use `GITHUB_TOKEN` as the variable name.
> GitHub MCP v0.6.2 changed its expected variable. Using `GITHUB_TOKEN` causes silent authentication failures with no warning or log message. Use `GITHUB_PERSONAL_ACCESS_TOKEN`.

### Step 2: The client.py Patch

DeerFlow's client.py passes only the env dict from the config to the subprocess, which completely replaces the subprocess's environment — stripping PATH, HOME, and everything npx needs to run. The fix merges with os.environ.

Edit the HOST file (not inside the container):

```bash
nano /root/deer-flow/backend/src/mcp/client.py
```

Find the block that builds the stdio transport parameters. Look for the section that checks `if config.env:` and assigns `params["env"]`. Replace it with the following:

```python
import os  # add at top if not present

# Inside the stdio transport block, replace the env handling:
#
# BEFORE (original):
#   if config.env:
#       params["env"] = config.env
#
# AFTER (patched):
if config.env:
    # Merge with current environment so subprocess has full PATH etc.
    merged_env = dict(os.environ)
    merged_env.update(config.env)
    params["env"] = merged_env
```

The original code passes only the config env vars to the subprocess, which means npx cannot find Node.js on the PATH. The patched version starts with the full system environment and overlays the config values on top.

### Step 3: Cache Refresh and Restart

```bash
# Force cache invalidation
touch /root/deer-flow/backend/.deer-flow/extensions_config.json

# Full restart
cd /root/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

### Verifying GitHub MCP

```bash
docker exec deer-flow-langgraph bash -c \
    "GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your-token-here \
    npx -y @modelcontextprotocol/server-github 2>&1 | head -1"
```

Expected output: `GitHub MCP Server running on stdio`

---

## Chapter 9: The Telegram Bot

Connecting a Telegram bot lets you interact with your agent from your phone. This is optional — the web UI works without it.

### Creating the Bot

Open Telegram and search for @BotFather. Send `/newbot`, follow the prompts, and save the token. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USER_ID` to your .env file.

### The Bot Script

Create the bot script directory and file:

```bash
mkdir -p /root/deer-flow/telegram-bot
nano /root/deer-flow/telegram-bot/telegram-bot.js
```

Here is a minimal working example that polls Telegram and forwards messages to LangGraph:

```javascript
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED = process.env.TELEGRAM_ALLOWED_USER_ID;
const API = "http://localhost:2026/api/langgraph/runs/wait";
const TG = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;

async function poll() {
    const res = await fetch(`${TG}/getUpdates?offset=${offset}&timeout=30`);
    const { result } = await res.json();

    for (const u of result || []) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg?.text || String(msg.from.id) !== ALLOWED) continue;
        const chatId = msg.chat.id;

        try {
            const r = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assistant_id: "YOUR-UUID-HERE",
                    input: { messages: [{ role: "human", content: msg.text }] },
                    config: { configurable: { thread_id: `tg-${chatId}` } }
                })
            });

            const data = await r.json();
            // LangGraph response: { output: { messages: [{ role, content }] } }
            // Extract the last message content as the reply
            const reply = data?.output?.messages?.slice(-1)[0]?.content
                || "No response";

            await fetch(`${TG}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: reply })
            });
        } catch (e) { console.error("Error:", e.message); }
    }
    setTimeout(poll, 500);
}

poll();
```

> **WARNING:** UUID caveat.
> The `assistant_id` value in this example is a placeholder. Your UUID will differ — use the assistants search endpoint from Chapter 7 to confirm yours before running the bot.

This is a bare-minimum polling implementation — enough to verify the connection between Telegram and your DeerFlow agent. It handles auth filtering and basic error recovery, but nothing more.

> **TIP:** Want a production-grade Telegram interface?
> A full-featured private command interface — with inline keyboards, typing indicators, webhook support, mobile-optimized quick actions, and secure multi-user access control — is coming soon to the DeerForge marketplace at deerforge.io. The minimal example above gets you connected; the marketplace product will get you deployed.

### Running with PM2

> **WARNING:** PM2 does not read the Docker .env file.
> The bot script uses `process.env` to read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USER_ID`, but PM2 does not automatically source your .env file. You need to export these variables in your shell before starting PM2, or pass them inline. The simplest approach:

```bash
# Export env vars (add these to ~/.bashrc for persistence)
export TELEGRAM_BOT_TOKEN=your-bot-token
export TELEGRAM_ALLOWED_USER_ID=your-telegram-user-id
```

Then install PM2 and start the bot:

```bash
npm install -g pm2
pm2 start /root/deer-flow/telegram-bot/telegram-bot.js --name telegram-bot

# Survive server reboots
pm2 startup systemd
pm2 save
```

Verify:

```bash
pm2 status
pm2 logs telegram-bot
```

The bot runs outside the Docker container stack — it is a standalone Node.js process managed by PM2 on the host. It survives container restarts and rebuilds.

> **WARNING:** Conversation history resets on container restart.
> DeerFlow uses in-memory storage. Every `docker compose down` wipes all conversation threads. Your thread ID will return a 404 after restart. PostgreSQL persistence is on the roadmap.

---

## Chapter 10: Troubleshooting

Organized by symptom — what you see — not by component.

### "502 Bad Gateway"

nginx is running but one or more internal containers are down or unreachable. Check `docker ps` for Exited/Restarting containers. Fix: full `docker compose down` then `docker compose up -d`. Do NOT just restart nginx — it caches stale DNS.

### "ImportError: langchain_anthropic"

The package is not installed. Verify `/root/deer-flow/backend/pyproject.toml` includes `'langchain-anthropic>=0.3.0'` in its dependencies list. Rebuild: `cd /root/deer-flow/docker && docker compose -f docker-compose-dev.yaml up -d --build langgraph`. Do NOT install only via docker exec — it will not survive a rebuild.

### "Authentication Failed (GitHub MCP)"

Almost certainly the variable name. GitHub MCP v0.6.2 expects `GITHUB_PERSONAL_ACCESS_TOKEN`, not `GITHUB_TOKEN`. Check extensions_config.json and .env. Force cache refresh with touch, then full down/up.

### "GitHub MCP silent failure"

Check in order: (1) npx installed? `docker exec deer-flow-langgraph which npx` (2) client.py patched? (3) extensions_config.json in correct location? (4) MCP cache stale? Touch the config file and full down/up.

### ".env changes not taking effect"

You used `docker compose restart` instead of `down && up`. The `env_file` directive is only read at container creation, not on restart.

### "sed: cannot rename (Device or resource busy)"

You are editing a volume-mounted file inside the container. Edit the host file instead.

### "Model returns 404 at inference time"

The model string in config.yaml is wrong. Use `claude-sonnet-4-20250514`. Do NOT use `claude-3-5-sonnet-20241022` or `claude-3-5-sonnet-latest`.

### "Agent doesn't remember messages"

Conversation history is in-memory only. Every `docker compose down` wipes it. Expected behavior until PostgreSQL persistence is configured.

For security-related deployment issues — firewall configuration, TLS, authentication — see the security warning in Chapter 4.

---

## Chapter 11: What NOT to Do

This is a consolidated reference. You have seen each of these warnings in context throughout the guide — they are gathered here so you can scan them before any major change to your deployment.

> **DO NOT:** Do not use `GITHUB_TOKEN` as the only variable. GitHub MCP v0.6.2 silently ignores it. Use `GITHUB_PERSONAL_ACCESS_TOKEN`.

> **DO NOT:** Do not use `docker compose restart` after .env changes. `env_file` is only read at container creation. Use down then up.

> **DO NOT:** Do not edit volume-mounted files inside the container. Your edits will be silently overwritten on the next container start.

> **DO NOT:** Do not put extensions_config.json in the backend root. It must be in `backend/.deer-flow/`.

> **DO NOT:** Do not install packages inside a running container and expect them to persist. Edit the host's pyproject.toml and rebuild with `--build`.

> **DO NOT:** Do not use `'role': 'user'` in LangGraph API requests. Use `'role': 'human'`.

> **DO NOT:** Do not use `'assistant_id': 'lead_agent'`. LangGraph requires the UUID.

> **DO NOT:** Do not use `claude-3-5-sonnet-latest` or `claude-3-5-sonnet-20241022`. They return 404 at inference time.

> **DO NOT:** Do not try to fix a 502 with just `docker compose restart nginx`. Full down/up is required.

> **DO NOT:** Do not hardcode the token in extensions_config.json. Use the `$VARIABLE_NAME` reference pattern.

> **DO NOT:** Do not add `RUN uv add langchain-anthropic` to the Dockerfile. The pyproject.toml edit is the correct fix. A RUN uv add line in the Dockerfile modifies the image-layer pyproject.toml during build, but at runtime the host's pyproject.toml is what uv sync reads. Add the dependency to the host's pyproject.toml and rebuild with `--build`.

> **DO NOT:** Do not run `uv add` inside a container and expect it to persist. pyproject.toml lives in the image layer, not on a volume mount.

---

## Chapter 12: Diagnostic Reference

Every verification and diagnostic command in one place.

### Container Status

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
docker stats --no-stream
```

### Log Inspection

```bash
# Langgraph (filter noise)
docker exec deer-flow-langgraph tail -50 /app/logs/langgraph.log \
    | grep -v "changes detected\|Worker stats\|Queue stats"

# Errors and MCP
docker exec deer-flow-langgraph tail -50 /app/logs/langgraph.log \
    | grep -i "error\|import\|mcp\|github\|auth"

# Gateway
docker exec deer-flow-gateway cat /app/logs/gateway.log | tail -30

# nginx (stdout)
docker logs deer-flow-nginx 2>&1 | tail -30
```

### Dependency Verification

```bash
# langchain-anthropic
docker exec deer-flow-langgraph \
    /app/backend/.venv/bin/python -c "import langchain_anthropic; print('OK')"

# npx
docker exec deer-flow-langgraph which npx && \
    docker exec deer-flow-langgraph npx --version

# GitHub token
docker exec deer-flow-langgraph env | grep GITHUB
```

### The Restart Decision Tree

| What Changed | Command |
|-------------|---------|
| File in `backend/src/` | `docker compose restart langgraph` |
| `.env` file | `docker compose down && up -d` |
| Dockerfile | `docker compose up -d --build langgraph` |
| pyproject.toml | `docker compose up -d --build langgraph` |
| extensions_config.json (content only) | `touch` file (next request reinitializes) |
| extensions_config.json (env vars changed) | `touch` file, then `down && up -d` |
| config.yaml | `docker compose restart langgraph` |
| Everything is broken | `docker compose down && up -d --build` |

---

## Chapter 13: Next Steps

You now have a running DeerFlow 2.0 instance with Claude as the AI backbone, GitHub MCP for code operations, and a Telegram bot for mobile access.

### PostgreSQL Persistence

The biggest current limitation is that conversation history lives in memory. Every `docker compose down` wipes it. The fix is configuring LangGraph to use PostgreSQL. Future versions of this guide will cover the setup.

### Plan Mode

DeerFlow supports Plan Mode where the agent breaks complex tasks into multi-step plans, executes them sequentially, and tracks progress. Future versions will cover activation.

### Outbound Telegram Notifications

Currently the bot is reactive. With outbound notifications, the agent can proactively message you: task complete, error encountered, build finished.

### Monitoring

For production, set up server monitoring with alerts for CPU and RAM usage at 75% threshold. This warns you before the server runs out of resources during heavy agent workloads.

---

Most people who starred the DeerFlow repo never got this far. You did. Now go build something with it.

If you want to see what other builders are shipping — or share what you build — the DeerForge marketplace and community are at deerforge.io. Skills, agents, workflows, and the tools to connect them. Come say hello.

---

*DeerFlow Docker Masterclass v2.0 · DeerForge · deerforge.io · Where AI builders ship.*
