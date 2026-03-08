Assistant: {{ .Response }}"""
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