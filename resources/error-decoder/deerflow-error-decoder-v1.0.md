# DeerFlow 2.0 Error Decoder v1.0

**15 Real Failures. Root Causes. Working Fixes.**

*Updated as new errors are discovered. Get the latest version at deerforge.io.*

From the team that deployed DeerFlow to production.

DeerForge · v1.0 · March 2026 · deerforge.io

---

> This is the guide we wish existed when we deployed DeerFlow 2.0 to production. Over three days and seven sessions on a DigitalOcean droplet, we hit every one of these errors. Each entry gives you the exact error string, the real root cause, and the fix that worked. No theory. No "it depends." If you're staring at a broken deploy at 11pm, start here.
>
> **For AI-assisted debugging:** Drop this file into your AI assistant and paste your error log. Ask it to match your error against the 15 entries below. The structured format is designed for both human scanning and agent pattern-matching.

---

## Quick Reference

| # | Error |
|---|-------|
| [#01](#01-the-api_key-client-option-must-be-set) | The api_key client option must be set |
| [#02](#02-502-bad-gateway) | 502 Bad Gateway |
| [#03](#03-502-persists--upstream-connection-refused) | 502 persists — upstream Connection refused |
| [#04](#04-pool-overlaps-with-other-one-on-this-address-space) | Pool overlaps with other one on this address space |
| [#05](#05-importerror-langchain_anthropic) | ImportError: langchain_anthropic |
| [#06](#06-notfounderror-model-not-found) | NotFoundError: model not found |
| [#07](#07-configyaml-changes-not-taking-effect) | config.yaml changes not taking effect |
| [#08](#08-npx-not-found-mcp-fails-silently) | npx not found (MCP fails silently) |
| [#09](#09-mcp-config-not-found-inside-container) | MCP config not found inside container |
| [#10](#10-env-changes-ignored-after-docker-compose-restart) | .env changes ignored after docker compose restart |
| [#11](#11-github-mcp-authentication-failed) | GitHub MCP: Authentication Failed |
| [#12](#12-container-patches-disappear-after-restart) | Container patches disappear after restart |
| [#13](#13-mcp-tools-stale-after-fixing-auth) | MCP tools stale after fixing auth |
| [#14](#14-nonetype-object-has-no-attribute-get) | 'NoneType' object has no attribute 'get' |
| [#15](#15-dockerfile-run-uv-add-didnt-persist) | Dockerfile RUN uv add didn't persist |

---

## #01 The api_key client option must be set

**SEARCH STRING**
```
openai.OpenAIError: The api_key client option must be set either by passing api_key to the client or by setting the OPENAI_API_KEY environment variable
```

**WHAT YOU SEE**

Container starts, frontend loads, but every query crashes immediately. The error floods `langgraph.log` on the first request. Confusingly mentions OpenAI even if you're using Anthropic or DeepSeek.

**REAL CAUSE**

Your `.env` file is either missing, in the wrong location, or corrupted. The #1 cause: manual edits introduced garbled lines (like pasting a model name into an API key field). DeerFlow's LangChain layer wraps all providers in the OpenAI client interface, which is why the error says "OpenAI" regardless of your actual provider.

**THE FIX**

Rewrite your `.env` from scratch. Don't edit the old one — replace it entirely. Make sure the file lives at the repo root (`~/deer-flow/.env`), not inside `backend/`.

```bash
cat > ~/deer-flow/.env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
TAVILY_API_KEY=tvly-dev-YOUR_KEY_HERE
EOF

# Then: full restart (not just 'restart')
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** The path `backend/.env` is actually a directory on some installs, not a file. If you accidentally put your keys there, the container will never see them. Always use `~/deer-flow/.env`.

---

## #02 502 Bad Gateway

**SEARCH STRING**
```
502 Bad Gateway nginx/1.29.5
```

**WHAT YOU SEE**

Browser shows a plain nginx error page. The DeerFlow UI never loads. Feels like everything is broken.

**REAL CAUSE**

The nginx container started with the default nginx config (static HTML, no proxy rules) instead of DeerFlow's custom config. This happens when nginx launched before the other containers were ready, or when a previous `docker compose up` left a stale container running with an old config.

**THE FIX**

First check what config nginx is actually running:

```bash
docker exec deer-flow-nginx cat /etc/nginx/conf.d/default.conf

# If it shows a stock config with no proxy_pass rules:
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml restart nginx

# If that doesn't fix it, do a full reset:
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** If the 502 persists after restarting nginx alone, the problem is likely DNS caching (see Error [#03](#03-502-persists--upstream-connection-refused)).

---

## #03 502 persists — upstream Connection refused

**SEARCH STRING**
```
connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://192.168.200.4:3000/"
```

**WHAT YOU SEE**

You restarted nginx but the 502 won't go away. The nginx error log shows it's trying to connect to an IP that doesn't match any running container.

**REAL CAUSE**

Docker's internal DNS cached a stale IP mapping. When containers were created in a different order (or recreated after a crash), the frontend got a new IP — but nginx resolved the hostname `frontend` to the old one. A simple restart doesn't flush this cache.

**THE FIX**

Nuclear reset. Stop all containers, destroy the network, and bring everything up fresh so nginx gets clean DNS:

```bash
docker stop deer-flow-frontend deer-flow-langgraph deer-flow-gateway deer-flow-nginx
docker rm deer-flow-frontend deer-flow-langgraph deer-flow-gateway deer-flow-nginx
docker network rm deer-flow-dev_deer-flow-dev 2>/dev/null
docker network prune -f
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** This is the fix for any "containers can see each other but nginx can't route to them" situation. When in doubt, nuke the network.

---

## #04 Pool overlaps with other one on this address space

**SEARCH STRING**
```
failed to create network docker_deer-flow-dev: Error response from daemon: invalid pool request: Pool overlaps with other one on this address space
```

**WHAT YOU SEE**

`docker compose up` fails before any containers even start. Docker can't create the bridge network.

**REAL CAUSE**

A previous `docker compose down` didn't fully remove the bridge network — usually because containers were still attached to it, or another compose project claimed the same subnet range.

**THE FIX**

Manually remove the orphaned network, then start clean:

```bash
docker stop deer-flow-frontend deer-flow-langgraph deer-flow-gateway deer-flow-nginx
docker rm deer-flow-frontend deer-flow-langgraph deer-flow-gateway deer-flow-nginx
docker network rm deer-flow-dev_deer-flow-dev
docker network prune -f
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** If you run multiple Docker Compose projects on the same machine, subnet collisions become common. Consider adding a custom subnet in your compose file's network config.

---

## #05 ImportError: langchain_anthropic

**SEARCH STRING**
```
ImportError: Could not import module langchain_anthropic. Missing dependency 'langchain_anthropic'. Install it with `uv add langchain-anthropic`
```

**WHAT YOU SEE**

The frontend shows a vague "internal error" on every query. Logs reveal the real problem: `langchain-anthropic` isn't installed.

**REAL CAUSE**

`langchain-anthropic` is not included in DeerFlow's stock `pyproject.toml`. If you're using Claude as your model, this is a required dependency that you have to add yourself. And here's the trap: running `uv add` inside the container works temporarily, but the next `docker compose down && up` wipes it because the host's `pyproject.toml` (without the dependency) gets mounted over the container's version.

**THE FIX**

Add it to the host's `pyproject.toml`, then rebuild:

```bash
# On the host (not inside the container)
cd ~/deer-flow/backend
sed -i 's/"langchain-openai>=1.1.7",/"langchain-anthropic>=0.3.0",\n    "langchain-openai>=1.1.7",/' pyproject.toml

# Verify it's there
grep langchain-anthropic pyproject.toml

# Rebuild (required for pyproject.toml changes)
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d --build langgraph
```

> **PRO TIP:** Don't try to solve this with a `RUN uv add` line in the Dockerfile either. The bind mount of the host's `pyproject.toml` at runtime overwrites whatever the build step installed. The only permanent fix is editing the host file.

---

## #06 NotFoundError: model not found

**SEARCH STRING**
```
anthropic.NotFoundError: Error code: 404 - {'type': 'error', 'error': {'type': 'not_found_error', 'message': 'model: claude-3-5-sonnet-20241022'}}
```

**WHAT YOU SEE**

Container starts fine. Frontend loads. But the moment you send a message, you get a 404 error buried in the logs. The UI shows a generic "internal error."

**REAL CAUSE**

Your `config.yaml` has a model string your API key doesn't have access to. This doesn't fail at startup — it fails at inference time, which makes it easy to think the setup is fine until you actually use it. Common culprits: `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-latest`, or any model from a generation your key wasn't provisioned for.

**THE FIX**

Update `config.yaml` to a model your key can access, then restart:

```bash
# Fix the model string
sed -i 's/claude-3-5-sonnet-20241022/claude-sonnet-4-20250514/' ~/deer-flow/config.yaml
sed -i 's/claude-3-5-sonnet-latest/claude-sonnet-4-20250514/' ~/deer-flow/config.yaml

# Restart langgraph (config.yaml is volume-mounted, so no rebuild needed)
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml restart langgraph
```

> **PRO TIP:** Check which models your key actually has access to: `curl https://api.anthropic.com/v1/models -H "x-api-key: YOUR_KEY"`. Don't guess — verify.

---

## #07 config.yaml changes not taking effect

**SEARCH STRING**
```
Changed model in config.yaml but container still uses the old model
```

**WHAT YOU SEE**

You edited `config.yaml` on the host but the container keeps using the old model. Or worse, `sed -i` throws "Device or resource busy."

**REAL CAUSE**

Two things can go wrong. First: `config.yaml` is volume-mounted but the container needs a restart to re-read it. Second: `sed -i` creates a temp file then renames it, which fails on active bind mounts because Docker holds a file descriptor to the original.

**THE FIX**

Edit the host file directly (not inside the container), then restart langgraph:

```bash
# Edit on host
nano ~/deer-flow/config.yaml

# Restart to pick up changes
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml restart langgraph
```

> **PRO TIP:** Volume-mounted files are live — but "live" means the container can see changes, not that it automatically reloads them. Most services need a restart to re-read config.

---

## #08 npx not found (MCP fails silently)

**SEARCH STRING**
```
npx: not found
(often masked as: ImportError: Could not import module langchain_anthropic)
```

**WHAT YOU SEE**

Your MCP integration (GitHub, or any npx-based MCP server) just doesn't work. No tools show up. The error log might show a completely unrelated `ImportError` that sends you on a wild goose chase.

**REAL CAUSE**

The langgraph container is built from `python:3.12-slim` — a minimal Python image with no Node.js. Any MCP server that runs via `npx` (like `@modelcontextprotocol/server-github`) silently fails because `npx` doesn't exist. The error cascade makes it look like a Python dependency issue.

**THE FIX**

Add Node.js and npm to the Dockerfile, then rebuild:

```dockerfile
# In ~/deer-flow/backend/Dockerfile, find the apt-get install line and add nodejs and npm:
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*
```

```bash
# Rebuild
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d --build langgraph

# Verify
docker exec deer-flow-langgraph which npx
```

> **PRO TIP:** The apt-get version of Node.js is old but it works fine for running MCP servers via npx. Don't over-engineer this with nvm unless you hit an actual version conflict.

---

## #09 MCP config not found inside container

**SEARCH STRING**
```
cat: /app/backend/extensions_config.json: No such file or directory
(Symptom: "I don't have GitHub tools in my function list")
```

**WHAT YOU SEE**

The agent says it has no tools, or MCP tools simply don't appear in the function list. You know the config file exists on the host, but the container can't find it.

**REAL CAUSE**

You put `extensions_config.json` in `~/deer-flow/backend/` — but that directory is baked into the Docker image at build time, not mounted at runtime. Only two subdirectories are volume-mounted: `backend/src/` and `backend/.deer-flow/`. Anything in the root of `backend/` is invisible to the running container.

**THE FIX**

Move the config into the `.deer-flow/` directory (which IS mounted), and set the env var pointing to it:

```bash
mkdir -p ~/deer-flow/backend/.deer-flow
mv ~/deer-flow/backend/extensions_config.json ~/deer-flow/backend/.deer-flow/

# Add the path to your .env
echo 'DEER_FLOW_EXTENSIONS_CONFIG_PATH=/app/backend/.deer-flow/extensions_config.json' >> ~/deer-flow/.env

# Full down+up (new env var requires container recreation)
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** Think of it this way: the Dockerfile `COPY` bakes a snapshot of `backend/` into the image. Volume mounts then overlay specific subdirectories on top. Files outside those overlays are frozen in the image.

---

## #10 .env changes ignored after docker compose restart

**SEARCH STRING**
```
docker exec deer-flow-langgraph env | grep MY_NEW_VAR
(returns nothing)
```

**WHAT YOU SEE**

You added a new variable to `.env`, ran `docker compose restart`, and the container doesn't see it. The variable simply isn't there.

**REAL CAUSE**

This is the single most important operational fact about Docker Compose: `restart` re-starts the container process, but it does not re-read `env_file`. Environment variables are loaded once — at container creation time. A restart reuses the existing container (and its original env). Only `down + up` destroys and recreates the container, which forces a fresh env load.

**THE FIX**

Always use `down && up` for environment variable changes. Never `restart`.

```bash
# WRONG — .env changes are NOT picked up
docker compose -f docker-compose-dev.yaml restart langgraph

# RIGHT — .env is re-read at container creation
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d

# Verify
docker exec deer-flow-langgraph env | grep MY_NEW_VAR
```

> **PRO TIP:** Tattoo this on your brain: `restart` = same container, same env. `down + up` = new container, fresh env. Every Docker Compose user learns this the hard way at least once.

---

## #11 GitHub MCP: Authentication Failed

**SEARCH STRING**
```
mcp.shared.exceptions.McpError: Authentication Failed: Requires authentication
```

**WHAT YOU SEE**

The GitHub MCP server starts without error, the token is valid (you tested it with curl), but every tool call returns "Requires authentication." Everything looks correct and nothing makes sense.

**REAL CAUSE**

This is the most painful undocumented change in the entire DeerFlow ecosystem. GitHub MCP server v0.6.2 renamed the auth variable from `GITHUB_TOKEN` to `GITHUB_PERSONAL_ACCESS_TOKEN`. The server starts fine with either variable name — but with the old name, it silently rejects all tool calls. There is no error message telling you the variable name is wrong.

**THE FIX**

Use `GITHUB_PERSONAL_ACCESS_TOKEN` in both your `.env` and `extensions_config.json`:

```bash
# In ~/deer-flow/.env — set BOTH for safety:
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_YOUR_TOKEN
GITHUB_TOKEN=ghp_YOUR_TOKEN
```

```json
// In extensions_config.json:
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_PERSONAL_ACCESS_TOKEN"
}
```

```bash
# Full down+up to reload env
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** You can verify the token works directly: `curl -s -H "Authorization: token ghp_..." https://api.github.com/user | grep login`. If that returns your username, the token is fine — the problem is the variable name.

---

## #12 Container patches disappear after restart

**SEARCH STRING**
```
Edited /app/backend/src/mcp/client.py inside container — changes gone after restart
```

**WHAT YOU SEE**

You SSH into the container, carefully patch a Python file, test it, confirm it works — and then after a restart, your changes vanish. Back to the broken version.

**REAL CAUSE**

`backend/src/` is a volume mount. The host's files are projected into the container at `/app/backend/src/`. Any edit you make inside the container is actually writing to the host — but if you `docker exec` and edit the container's copy, the host file hasn't changed. On next mount, the host's (unpatched) version takes over.

**THE FIX**

Always edit the host file, never the container file. Changes to volume-mounted `src/` files don't require a rebuild — just a restart:

```bash
# Edit on the HOST
nano ~/deer-flow/backend/src/mcp/client.py

# Restart (no rebuild needed — src/ is volume-mounted)
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml restart langgraph
```

> **PRO TIP:** Quick rule: if the file is in `src/` or `.deer-flow/`, edit on host, restart. If the file is `pyproject.toml` or `Dockerfile`, edit on host, rebuild.

---

## #13 MCP tools stale after fixing auth

**SEARCH STRING**
```
Using 26 cached MCP tool(s)
(Still getting "Authentication Failed" even after fixing the config)
```

**WHAT YOU SEE**

You fixed the GitHub MCP auth (Error [#11](#11-github-mcp-authentication-failed)) but it's still failing. The log shows "Using 26 cached MCP tool(s)" — it's loading tools from before your fix.

**REAL CAUSE**

DeerFlow caches MCP tools in-memory, keyed on the `extensions_config.json` file's modification timestamp. If you fixed the env var but didn't change the config file itself, the cache thinks nothing changed and serves stale tool sessions with the old (broken) credentials.

**THE FIX**

Touch the config file to bust the cache. If you also changed env vars, do a full `down + up`:

```bash
# Bust the MCP tool cache
touch ~/deer-flow/backend/.deer-flow/extensions_config.json

# If you also changed .env (new token, new var name), you need:
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml up -d
```

> **PRO TIP:** The cache is in-memory only, so a full `down + up` always clears it. The `touch` trick is for when you want to bust the cache without restarting the whole stack.

---

## #14 'NoneType' object has no attribute 'get'

**SEARCH STRING**
```
{"__error__":{"error":"AttributeError","message":"'NoneType' object has no attribute 'get'"}}
```

**WHAT YOU SEE**

Your API call to `/api/langgraph/runs/wait` returns this cryptic `AttributeError`. The JSON payload looks fine to you.

**REAL CAUSE**

Two common causes, often both at once. First: you're missing `thread_id` in `config.configurable` — the middleware requires it. Second: you're using `"role": "user"` instead of `"role": "human"`. LangGraph uses LangChain message types, not the OpenAI convention. The `"user"` role is silently ignored, which means the message array is effectively empty, which causes the NoneType error downstream.

**THE FIX**

Use the correct payload structure — UUID for `assistant_id`, `"human"` for role, and include `thread_id`:

```bash
curl -s http://localhost:2026/api/langgraph/runs/wait \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "YOUR-ASSISTANT-UUID-HERE",
    "input": {
      "messages": [{"role": "human", "content": "Hello"}]
    },
    "config": {
      "configurable": {"thread_id": "my-thread-001"}
    }
  }' --max-time 90
```

> **PRO TIP:** Get the real assistant UUID with: `curl -s http://localhost:2026/api/langgraph/assistants/search -X POST -H "Content-Type: application/json" -d '{"limit":10}'`. The string name (like `"lead_agent"`) doesn't work as an ID.

---

## #15 Dockerfile RUN uv add didn't persist

**SEARCH STRING**
```
Added RUN cd backend && uv add langchain-anthropic to Dockerfile — package still missing after down+up
```

**WHAT YOU SEE**

You tried to fix the missing `langchain-anthropic` dependency (Error [#05](#05-importerror-langchain_anthropic)) by adding a `RUN` step to the Dockerfile. It builds successfully. But after `down + up`, the package is still missing.

**REAL CAUSE**

This is the bind mount trap. `uv add` inside the Dockerfile modifies `pyproject.toml` in the image layer. But at runtime, `docker-compose-dev.yaml` mounts the host's `backend/` directory over the image's copy. The host's `pyproject.toml` (without your addition) silently replaces the image's version. The `RUN` step executed correctly at build time — it just gets overwritten at runtime.

**THE FIX**

The only permanent fix is editing the host's `pyproject.toml`. Dockerfile-only fixes won't survive the volume mount. See Error [#05](#05-importerror-langchain_anthropic) for the exact steps.

```bash
# The fix lives in the host file, not the Dockerfile
cd ~/deer-flow/backend
sed -i 's/"langchain-openai>=1.1.7",/"langchain-anthropic>=0.3.0",\n    "langchain-openai>=1.1.7",/' pyproject.toml

# Then rebuild
cd ~/deer-flow/docker
docker compose -f docker-compose-dev.yaml up -d --build langgraph
```

> **PRO TIP:** This is the same class of problem as Error [#12](#12-container-patches-disappear-after-restart) (patches vanishing). The mental model: anything the Dockerfile writes into a directory that gets volume-mounted is overwritten at runtime. Image layers lose to bind mounts.

---

## Quick Diagnostic Cheatsheet

When something breaks, start here. Run these in order — they cover 90% of issues.

```bash
# Are all containers running?
docker ps --format "table {{.Names}}\t{{.Status}}"

# What do the logs say?
docker exec deer-flow-langgraph tail -50 /app/logs/langgraph.log | grep -i error

# Are env vars loaded?
docker exec deer-flow-langgraph env | grep YOUR_VAR_NAME

# Is the config mounted?
docker exec deer-flow-langgraph cat /app/backend/.deer-flow/extensions_config.json

# Is npx available?
docker exec deer-flow-langgraph which npx

# Is langchain-anthropic installed?
docker exec deer-flow-langgraph /app/backend/.venv/bin/python -c "import langchain_anthropic; print('OK')"
```

---

## The Restart Decision Tree

| What changed? | What to run |
|---------------|-------------|
| Files in `src/` or `.deer-flow/` | `docker compose restart langgraph` |
| `.env` variables | `docker compose down && up -d` |
| `pyproject.toml` or `Dockerfile` | `docker compose up -d --build langgraph` |
| `extensions_config.json` | `touch` the file, then `down && up -d` |
| Everything is broken | Nuclear reset (stop, rm, network prune, up) |

---

## This decoder covers the errors. The Masterclass covers everything else.

The **DeerFlow Docker Masterclass** is our complete deployment guide — covering initial setup, multi-container architecture, environment configuration, MCP integration, Telegram bots, and the operational playbook we use to run DeerForge in production every day.

Get the full guide at [deerforge.io](https://deerforge.io)

---

*This document is versioned and updated as the DeerFlow ecosystem evolves.*
*You're reading v1.0 — March 2026.*

*Built by the DeerForge team — from real production failures, not hypotheticals.*

*[deerforge.io](https://deerforge.io) · Where AI builders ship.*
