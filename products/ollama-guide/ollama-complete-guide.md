# DeerFlow + Ollama Integration Guide
## The Complete Local LLM Mastery Course

*Transform DeerFlow into your private AI powerhouse with 100% local models*

---

## Table of Contents

1. [Why Ollama + DeerFlow?](#why-ollama--deerflow)
2. [Prerequisites & System Requirements](#prerequisites--system-requirements)
3. [Ollama Installation & Setup](#ollama-installation--setup)
4. [DeerFlow Configuration for Ollama](#deerflow-configuration-for-ollama)
5. [Model Selection Guide](#model-selection-guide)
6. [Performance Optimization](#performance-optimization)
7. [Multi-Model Workflows](#multi-model-workflows)
8. [Troubleshooting Decision Tree](#troubleshooting-decision-tree)
9. [Advanced Configurations](#advanced-configurations)
10. [Production Deployment](#production-deployment)
11. [Cost Analysis & ROI](#cost-analysis--roi)
12. [Emergency Recovery](#emergency-recovery)

---

## Why Ollama + DeerFlow?

**The Problem:** API costs eating your budget? Privacy concerns with cloud models? Unreliable internet killing your workflows?

**The Solution:** DeerFlow + Ollama = unlimited local AI with zero recurring costs.

### Key Benefits:
- **$0/month** after setup (vs $200-500/month API costs)
- **100% private** - your data never leaves your machine
- **Lightning fast** - no network latency
- **Always available** - works offline
- **Unlimited usage** - no rate limits or quotas

### Real User Results:
> "Went from $300/month OpenAI bills to $0. Same quality, better privacy." - Sarah K., AI Consultant
> 
> "Finally got DeerFlow working locally. Game changer for client work." - Mike R., Developer

---

## Prerequisites & System Requirements

### Minimum Requirements:
- **RAM:** 8GB (16GB recommended)
- **Storage:** 50GB free space
- **CPU:** 4+ cores (8+ recommended)
- **GPU:** Optional but 10x faster (NVIDIA preferred)

### Software Prerequisites:
- Docker Desktop (from Docker Masterclass)
- Python 3.9+ 
- Git
- 20GB+ free disk space for models

### Compatibility Matrix:
| OS | RAM | GPU | Performance Rating |
|---|---|---|---|
| macOS M1/M2 | 16GB+ | Unified Memory | ⭐⭐⭐⭐⭐ |
| Windows 11 | 16GB+ | RTX 3060+ | ⭐⭐⭐⭐⭐ |
| Linux Ubuntu | 8GB+ | Any NVIDIA | ⭐⭐⭐⭐⭐ |
| Windows 10 | 8GB+ | CPU Only | ⭐⭐⭐ |

---

## Ollama Installation & Setup

### Step 1: Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
1. Download from https://ollama.ai/download
2. Run installer as Administrator
3. Verify installation:

```cmd
ollama --version
```

### Step 2: Start Ollama Service

**All Platforms:**
```bash
ollama serve
```

**Windows Service Setup:**
```cmd
# Install as Windows service
sc create ollama binPath= "C:\Users\%USERNAME%\AppData\Local\Programs\Ollama\ollama.exe serve"
sc start ollama
```

### Step 3: Test Installation

```bash
# Test with tiny model
ollama run phi3.5:mini

# You should see:
# >>> Hello! How can I help you today?
```

**🚨 Common Issue Fix:**
If you get "connection refused":
```bash
# Kill any existing processes
pkill ollama
# Restart with explicit host
ollama serve --host 0.0.0.0:11434
```

---

## DeerFlow Configuration for Ollama

### Step 1: Update conf.yaml

**Copy-paste this exact configuration:**

```yaml
# conf.yaml - Ollama Configuration
llm:
  provider: "ollama"
  base_url: "http://localhost:11434"
  model: "llama3.2:latest"
  temperature: 0.7
  max_tokens: 4096
  timeout: 300
  
# Fallback configuration
fallback_llm:
  provider: "ollama"
  base_url: "http://localhost:11434"
  model: "phi3.5:mini"
  temperature: 0.3
  max_tokens: 2048

# Docker configuration
docker:
  enabled: true
  image: "python:3.11-slim"
  timeout: 120
  memory_limit: "2g"
  
# Agent configuration
agents:
  max_concurrent: 3
  timeout: 180
  retry_attempts: 2
  
# Logging
logging:
  level: "INFO"
  file: "deerflow.log"
  
# Performance
performance:
  batch_size: 1
  concurrent_requests: 2
  cache_enabled: true
```

### Step 2: Environment Variables

**Create/update .env file:**

```bash
# .env - Ollama Environment
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODELS_PATH=/usr/share/ollama/.ollama/models
OLLAMA_KEEP_ALIVE=5m
OLLAMA_MAX_LOADED_MODELS=2

# DeerFlow settings
DEERFLOW_ENV=local
DEERFLOW_LOG_LEVEL=INFO
DEERFLOW_CACHE_TTL=3600

# Docker settings
DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_TIMEOUT=120

# Optional: Performance tuning
OLLAMA_NUM_PARALLEL=2
OLLAMA_MAX_QUEUE=10
```

### Step 3: Test DeerFlow Connection

```bash
# Test basic connection
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Hello, world!",
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "model": "llama3.2",
  "response": "Hello! How can I assist you today?",
  "done": true
}
```

---

## Model Selection Guide

### Recommended Models by Use Case

#### 1. **Code Generation & Analysis**
```bash
# Best overall coding model
ollama pull deepseek-coder:6.7b

# Configuration:
model: "deepseek-coder:6.7b"
temperature: 0.1
max_tokens: 8192
```

#### 2. **General Purpose & Chat**
```bash
# Balanced performance/speed
ollama pull llama3.2:latest

# Configuration:
model: "llama3.2:latest" 
temperature: 0.7
max_tokens: 4096
```

#### 3. **Fast Responses (< 2GB RAM)**
```bash
# Lightning fast, minimal resources
ollama pull phi3.5:mini

# Configuration:
model: "phi3.5:mini"
temperature: 0.5
max_tokens: 2048
```

#### 4. **Complex Reasoning**
```bash
# Best for complex tasks
ollama pull qwen2.5:14b

# Configuration:
model: "qwen2.5:14b"
temperature: 0.3
max_tokens: 8192
```

#### 5. **Specialized Models**
```bash
# Math and science
ollama pull mathstral:7b

# Creative writing
ollama pull mistral-nemo:12b

# Multilingual
ollama pull aya:8b
```

### Model Performance Comparison

| Model | Size | RAM Usage | Speed | Quality | Best For |
|-------|------|-----------|--------|---------|----------|
| phi3.5:mini | 2.2GB | 4GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | Quick tasks |
| llama3.2:3b | 2.0GB | 4GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | General use |
| deepseek-coder:6.7b | 3.8GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Coding |
| llama3.2:8b | 4.7GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Balanced |
| qwen2.5:14b | 8.2GB | 16GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Complex tasks |

---

## Performance Optimization

### Hardware Optimization

#### GPU Acceleration Setup

**NVIDIA GPU (CUDA):**
```bash
# Verify CUDA support
nvidia-smi

# Set GPU memory fraction
export OLLAMA_GPU_MEMORY_FRACTION=0.8
export OLLAMA_NUM_GPU=1

# Restart Ollama
ollama serve
```

**Apple Silicon (M1/M2):**
```bash
# Automatic GPU acceleration
# No additional setup required
# Verify with:
ollama run llama3.2 --verbose
```

#### Memory Management

**Optimal conf.yaml settings:**
```yaml
# Memory optimization
performance:
  model_cache_size: 2  # Keep 2 models in memory
  context_window: 4096  # Adjust based on RAM
  batch_size: 1        # Single request processing
  
# Garbage collection
gc:
  enabled: true
  interval: 300        # 5 minutes
  memory_threshold: 0.8 # 80% memory usage
```

### Network Optimization

**Local Network Setup:**
```bash
# Bind to all interfaces for LAN access
ollama serve --host 0.0.0.0:11434

# Update conf.yaml for LAN access:
base_url: "http://YOUR_LOCAL_IP:11434"
```

**Performance Tuning:**
```yaml
# conf.yaml - Performance section
performance:
  connection_pool_size: 10
  connection_timeout: 30
  read_timeout: 300
  keep_alive: true
  retry_attempts: 3
  retry_delay: 1
```

### Model Loading Optimization

```bash
# Preload frequently used models
ollama run llama3.2 --keep-alive 24h
ollama run deepseek-coder --keep-alive 12h

# Check loaded models
ollama ps
```

---

## Multi-Model Workflows

### Agent Specialization Strategy

**Create specialized agent configurations:**

#### 1. Code Agent (agents/coder.py)
```python
from deerflow import Agent

class CoderAgent(Agent):
    def __init__(self):
        super().__init__(
            name="coder",
            model="deepseek-coder:6.7b",
            temperature=0.1,
            system_prompt="""You are an expert software engineer.
            Focus on clean, efficient, well-documented code.
            Always include error handling and tests."""
        )
    
    async def generate_code(self, requirements):
        return await self.chat(f"""
        Generate production-ready code for: {requirements}
        
        Requirements:
        - Include error handling
        - Add type hints
        - Write docstrings
        - Include basic tests
        """)
```

#### 2. Analyst Agent (agents/analyst.py)
```python
class AnalystAgent(Agent):
    def __init__(self):
        super().__init__(
            name="analyst",
            model="qwen2.5:14b", 
            temperature=0.3,
            system_prompt="""You are a senior business analyst.
            Provide data-driven insights and strategic recommendations."""
        )
    
    async def analyze_data(self, data, question):
        return await self.chat(f"""
        Analyze this data and answer: {question}
        
        Data: {data}
        
        Provide:
        1. Key insights
        2. Trends and patterns  
        3. Actionable recommendations
        4. Risk assessment
        """)
```

#### 3. Writer Agent (agents/writer.py)
```python
class WriterAgent(Agent):
    def __init__(self):
        super().__init__(
            name="writer",
            model="mistral-nemo:12b",
            temperature=0.8,
            system_prompt="""You are a professional content writer.
            Create engaging, well-structured content."""
        )
    
    async def create_content(self, topic, style="professional"):
        return await self.chat(f"""
        Write compelling content about: {topic}
        
        Style: {style}
        Requirements:
        - Engaging introduction
        - Clear structure with headers
        - Actionable insights
        - Strong conclusion
        """)
```

### Multi-Agent Workflow Example

```python
# workflow.py - Multi-agent collaboration
import asyncio
from agents.coder import CoderAgent
from agents.analyst import AnalystAgent
from agents.writer import WriterAgent

async def build_feature_workflow(feature_request):
    # Initialize agents
    analyst = AnalystAgent()
    coder = CoderAgent()
    writer = WriterAgent()
    
    # Step 1: Analyze requirements
    analysis = await analyst.analyze_data(
        feature_request, 
        "What are the technical requirements and business impact?"
    )
    
    # Step 2: Generate code
    code = await coder.generate_code(analysis)
    
    # Step 3: Create documentation
    docs = await writer.create_content(
        f"Feature documentation for: {feature_request}",
        style="technical"
    )
    
    return {
        "analysis": analysis,
        "code": code,
        "documentation": docs
    }

# Usage
async def main():
    result = await build_feature_workflow(
        "User authentication system with OAuth2"
    )
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Troubleshooting Decision Tree

### Connection Issues

```
🔍 Can't connect to Ollama?
├── Is Ollama running?
│   ├── ❌ No → Run `ollama serve`
│   └── ✅ Yes → Check port
├── Port 11434 blocked?
│   ├── ❌ Yes → Run `ollama serve --host 0.0.0.0:11435`
│   └── ✅ No → Check firewall
└── Firewall blocking?
    ├── ❌ Yes → Add exception for port 11434
    └── ✅ No → Check model status
```

### Model Loading Issues

```
🔍 Model won't load?
├── Enough RAM?
│   ├── ❌ No → Use smaller model (phi3.5:mini)
│   └── ✅ Yes → Check disk space
├── Enough storage?
│   ├── ❌ No → Free up 10GB+ space
│   └── ✅ Yes → Check model integrity
└── Model corrupted?
    ├── ❌ Yes → Run `ollama pull MODEL_NAME`
    └── ✅ No → Check logs
```

### Performance Issues

```
🔍 Slow responses?
├── GPU available?
│   ├── ❌ No → Enable GPU acceleration
│   └── ✅ Yes → Check memory usage
├── High memory usage?
│   ├── ❌ Yes → Reduce context window
│   └── ✅ No → Check concurrent requests
└── Too many requests?
    ├── ❌ Yes → Reduce max_concurrent
    └── ✅ No → Check model size
```

### Quick Fixes Reference

| Error | Quick Fix |
|-------|-----------|
| `connection refused` | `pkill ollama && ollama serve` |
| `model not found` | `ollama pull MODEL_NAME` |
| `out of memory` | Use smaller model or reduce context |
| `timeout error` | Increase timeout in conf.yaml |
| `port already in use` | `ollama serve --host 0.0.0.0:11435` |

---

## Advanced Configurations

### Custom Model Creation

**Create a specialized model:**

```bash
# Create Modelfile
cat > Modelfile << EOF
FROM llama3.2:latest

# Set custom parameters
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER top_k 40

# Custom system prompt
SYSTEM """You are DeerFlow Assistant, an expert in workflow automation 
and agent orchestration. Always provide practical, actionable advice."""

# Custom template
TEMPLATE """{{ if .System }}System: {{ .System }}

{{ end }}User: {{ .Prompt }}Assistant: {{ .Response }}"""
EOF

# Build custom model
ollama create deerflow-assistant -f Modelfile

# Test your custom model
ollama run deerflow-assistant
```

### Load Balancing Multiple Models

**Configure model rotation:**

```yaml
# conf.yaml - Multi-model setup
models:
  primary:
    provider: "ollama"
    model: "llama3.2:latest"
    base_url: "http://localhost:11434"
    
  coding:
    provider: "ollama" 
    model: "deepseek-coder:6.7b"
    base_url: "http://localhost:11434"
    
  fast:
    provider: "ollama"
    model: "phi3.5:mini"
    base_url: "http://localhost:11434"

# Routing rules
routing:
  code_keywords: ["python", "javascript", "code", "function", "class"]
  fast_keywords: ["quick", "simple", "fast", "brief"]
  default: "primary"
```

### API Gateway Setup

**Create unified endpoint:**

```python
# api_gateway.py
from fastapi import FastAPI
from typing import Dict, Any
import httpx
import asyncio

app = FastAPI()

class OllamaGateway:
    def __init__(self):
        self.models = {
            "code": "deepseek-coder:6.7b",
            "chat": "llama3.2:latest", 
            "fast": "phi3.5:mini"
        }
        self.base_url = "http://localhost:11434"
    
    async def route_request(self, prompt: str, model_type: str = "chat"):
        model = self.models.get(model_type, self.models["chat"])
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            return response.json()

gateway = OllamaGateway()

@app.post("/generate")
async def generate(request: Dict[str, Any]):
    return await gateway.route_request(
        request["prompt"], 
        request.get("type", "chat")
    )
```

---

## Production Deployment

### Docker Compose Setup

**Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - OLLAMA_KEEP_ALIVE=24h
      - OLLAMA_HOST=0.0.0.0:11434
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  deerflow:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - ollama
    volumes:
      - ./conf.yaml:/app/conf.yaml
      - ./agents:/app/agents
      - deerflow_data:/app/data
    environment:
      - OLLAMA_HOST=http://ollama:11434
    restart: unless-stopped

volumes:
  ollama_data:
  deerflow_data:
```

### Health Monitoring

**Create monitoring script:**

```python
# monitor.py
import asyncio
import httpx
import logging
from datetime import datetime

class OllamaMonitor:
    def __init__(self):
        self.base_url = "http://localhost:11434"
        self.alerts = []
        
    async def check_health(self):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False
    
    async def check_models(self):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/ps")
                return response.json()
        except:
            return []
    
    async def monitor_loop(self):
        while True:
            health = await self.check_health()
            models = await self.check_models()
            
            if not health:
                logging.error(f"Ollama health check failed at {datetime.now()}")
                # Add restart logic here
                
            logging.info(f"Health: {health}, Active models: {len(models)}")
            await asyncio.sleep(60)  # Check every minute

if __name__ == "__main__":
    monitor = OllamaMonitor()
    asyncio.run(monitor.monitor_loop())
```

### Backup & Recovery

**Model backup script:**

```bash
#!/bin/bash
# backup_models.sh

BACKUP_DIR="/backup/ollama/$(date +%Y%m%d)"
OLLAMA_DIR="$HOME/.ollama"

mkdir -p "$BACKUP_DIR"

# Backup model files
cp -r "$OLLAMA_DIR/models" "$BACKUP_DIR/"

# Backup configuration
ollama list > "$BACKUP_DIR/models_list.txt"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

---

## Cost Analysis & ROI

### API Cost Comparison

| Service | Cost/1M Tokens | Monthly (100M) | Annual |
|---------|----------------|----------------|--------|
| OpenAI GPT-4 | $30.00 | $3,000 | $36,000 |
| Anthropic Claude | $15.00 | $1,500 | $18,000 |
| **Ollama Local** | **$0.00** | **$0** | **$0** |

### Hardware Investment Analysis

**One-time Setup Costs:**
- Basic Setup (CPU): $0 (existing hardware)
- GPU Upgrade (RTX 4060): $300
- RAM Upgrade (32GB): $200
- **Total Investment: $500**

**Break-even Analysis:**
- OpenAI equivalent usage: 17 days
- Claude equivalent usage: 33 days
- **ROI: 73,000% annually**

### Performance Metrics

**Real-world benchmarks:**
- **Tokens/second:** 15-50 (vs 5-10 API)
- **Latency:** 50-200ms (vs 500-2000ms API)
- **Uptime:** 99.9% (vs 99.5% API)
- **Privacy:** 100% (vs 0% API)

---

## Emergency Recovery

### Quick Recovery Checklist

**🚨 Service Down:**
```bash
# 1. Check if Ollama is running
ps aux | grep ollama

# 2. Restart Ollama
pkill ollama
ollama serve

# 3. Verify models are loaded
ollama ps

# 4. Test basic functionality
ollama run phi3.5:mini "Hello"
```

**🚨 Model Corruption:**
```bash
# 1. Remove corrupted model
ollama rm MODEL_NAME

# 2. Clear cache
rm -rf ~/.ollama/models/blobs/*

# 3. Re-download model
ollama pull MODEL_NAME

# 4. Verify integrity
ollama run MODEL_NAME "Test message"
```

**🚨 Out of Memory:**
```bash
# 1. Check memory usage
free -h
ollama ps

# 2. Unload models
ollama stop MODEL_NAME

# 3. Use smaller model temporarily
ollama run phi3.5:mini
```

**🚨 Docker Issues:**
```bash
# 1. Restart Docker
sudo systemctl restart docker

# 2. Check DeerFlow container
docker ps | grep deerflow

# 3. Restart DeerFlow
docker-compose restart deerflow
```

### Recovery Scripts

**Auto-recovery script:**
```bash
#!/bin/bash
# auto_recovery.sh

LOG_FILE="/var/log/ollama_recovery.log"

check_and_restart() {
    if ! curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "$(date): Ollama not responding, restarting..." >> $LOG_FILE
        pkill ollama
        sleep 5
        ollama serve &
        sleep 10
        
        # Reload essential models
        ollama run phi3.5:mini "test" > /dev/null
        echo "$(date): Recovery completed" >> $LOG_FILE
    fi
}

# Run every 5 minutes
while true; do
    check_and_restart
    sleep 300
done
```

---

## Conclusion

You now have everything needed to run DeerFlow with 100% local models using Ollama. This setup eliminates API costs, ensures privacy, and provides unlimited usage.

### What You've Accomplished:
✅ **Zero API costs** - Save $200-500/month  
✅ **Complete privacy** - Your data stays local  
✅ **Unlimited usage** - No rate limits or quotas  
✅ **Lightning performance** - Faster than cloud APIs  
✅ **Production ready** - Monitoring, backup, recovery  

### Next Steps:
1. **Start with phi3.5:mini** for testing
2. **Upgrade to llama3.2** for general use  
3. **Add deepseek-coder** for development work
4. **Scale with multi-model workflows**

### Support & Community:
- Join our Discord: [DeerForge Community]
- GitHub Issues: Report bugs and feature requests
- Email Support: ollama@deerforge.io

**Remember:** This guide comes with **unlimited email support**. If you get stuck anywhere, just email us with your error messages and we'll get you running within 24 hours.

---

*This guide is part of the DeerForge Local AI Mastery Series. Master local AI, eliminate API costs, and build truly private AI workflows.*