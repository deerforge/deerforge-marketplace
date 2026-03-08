# DeerFlow Quick Start Kit
## 3-File Setup for Instant Success

*Get DeerFlow running in under 5 minutes with these copy-paste configurations*

---

## What's Included

This Quick Start Kit contains three essential files to get DeerFlow working immediately with the most popular AI providers:

1. **conf.yaml** - Main configuration file
2. **.env** - Environment variables and API keys
3. **agents.py** - Sample agent implementations

Simply copy these files into your DeerFlow directory and you're ready to go!

---

## File 1: conf.yaml

**Copy this entire configuration:**

```yaml
# DeerFlow Quick Start Configuration
# Works with OpenAI, Anthropic, DeepSeek, Groq, and Ollama

# Primary LLM Configuration
llm:
  provider: "openai"  # Change to: anthropic, deepseek, groq, or ollama
  model: "gpt-4o-mini"  # Fast and cost-effective
  temperature: 0.7
  max_tokens: 4096
  timeout: 300

# Fallback LLM (for when primary fails)
fallback_llm:
  provider: "groq"
  model: "llama-3.1-8b-instant"
  temperature: 0.5
  max_tokens: 2048

# Docker Configuration
docker:
  enabled: true
  image: "python:3.11-slim"
  timeout: 120
  memory_limit: "2g"
  cpu_limit: "1.0"

# Agent Settings
agents:
  max_concurrent: 3
  timeout: 180
  retry_attempts: 2
  default_model: "gpt-4o-mini"

# Logging
logging:
  level: "INFO"
  file: "deerflow.log"
  max_size: "10MB"
  backup_count: 5

# Performance Settings
performance:
  batch_size: 1
  concurrent_requests: 2
  cache_enabled: true
  cache_ttl: 3600

# Security
security:
  sandbox_enabled: true
  allowed_imports: ["os", "sys", "json", "requests", "pandas", "numpy"]
  max_execution_time: 300

# Provider-Specific Configurations
providers:
  openai:
    base_url: "https://api.openai.com/v1"
    models:
      fast: "gpt-4o-mini"
      balanced: "gpt-4o"
      powerful: "gpt-4"
  
  anthropic:
    base_url: "https://api.anthropic.com"
    models:
      fast: "claude-3-haiku-20240307"
      balanced: "claude-3-5-sonnet-20241022"
      powerful: "claude-3-opus-20240229"
  
  deepseek:
    base_url: "https://api.deepseek.com/v1"
    models:
      fast: "deepseek-chat"
      code: "deepseek-coder"
  
  groq:
    base_url: "https://api.groq.com/openai/v1"
    models:
      fast: "llama-3.1-8b-instant"
      balanced: "llama-3.1-70b-versatile"
      mixtral: "mixtral-8x7b-32768"
  
  ollama:
    base_url: "http://localhost:11434"
    models:
      fast: "phi3.5:mini"
      balanced: "llama3.2:latest"
      code: "deepseek-coder:6.7b"
```

---

## File 2: .env

**Copy and update with your API keys:**

```bash
# DeerFlow Environment Variables
# Copy this file as .env in your DeerFlow directory

# ===================
# API KEYS
# ===================

# OpenAI (Get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic (Get from: https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# DeepSeek (Get from: https://platform.deepseek.com/api_keys)
DEEPSEEK_API_KEY=sk-your-deepseek-key-here

# Groq (Get from: https://console.groq.com/keys)
GROQ_API_KEY=gsk_your-groq-key-here

# ===================
# DEERFLOW SETTINGS
# ===================

# Environment
DEERFLOW_ENV=development
DEERFLOW_LOG_LEVEL=INFO
DEERFLOW_DEBUG=false

# Cache settings
DEERFLOW_CACHE_TTL=3600
DEERFLOW_CACHE_SIZE=1000

# Security
DEERFLOW_SANDBOX_ENABLED=true
DEERFLOW_MAX_EXECUTION_TIME=300

# ===================
# DOCKER SETTINGS
# ===================

# Docker configuration
DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_TIMEOUT=120
DOCKER_MEMORY_LIMIT=2g

# ===================
# OLLAMA SETTINGS (if using local models)
# ===================

# Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODELS_PATH=/usr/share/ollama/.ollama/models
OLLAMA_KEEP_ALIVE=5m
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=1

# ===================
# PERFORMANCE TUNING
# ===================

# Request limits
MAX_CONCURRENT_REQUESTS=3
REQUEST_TIMEOUT=300
RETRY_ATTEMPTS=2

# Memory management
PYTHON_MEMORY_LIMIT=1g
CLEANUP_INTERVAL=300

# ===================
# OPTIONAL: WEBHOOK ENDPOINTS
# ===================

# Slack webhook (for notifications)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Discord webhook (for notifications)  
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# ===================
# DEVELOPMENT HELPERS
# ===================

# Set to true to see detailed API request/response logs
VERBOSE_LOGGING=false

# Set to true to enable auto-reload on code changes
AUTO_RELOAD=true

# Set to true to save all conversations to files
SAVE_CONVERSATIONS=false
```

---

## File 3: agents.py

**Copy this sample agent implementation:**

```python
"""
DeerFlow Quick Start Agents
Sample implementations for common use cases
"""

from deerflow import Agent, Workflow
import asyncio
from typing import Dict, List, Any
import json
import os

class QuickStartAgent(Agent):
    """Base agent with common functionality"""
    
    def __init__(self, name: str, model: str = None, temperature: float = 0.7):
        super().__init__(
            name=name,
            model=model or "gpt-4o-mini",
            temperature=temperature
        )
    
    async def think_and_respond(self, prompt: str, context: str = "") -> str:
        """Enhanced response with context awareness"""
        full_prompt = f"""
        Context: {context}
        
        Request: {prompt}
        
        Please provide a helpful, accurate response.
        """
        return await self.chat(full_prompt)

class CodeAgent(QuickStartAgent):
    """Specialized agent for code generation and analysis"""
    
    def __init__(self):
        super().__init__(
            name="coder",
            model="gpt-4o",  # Better for code
            temperature=0.1   # Lower temperature for consistency
        )
        self.system_prompt = """You are an expert software engineer.
        Always write clean, well-documented, production-ready code.
        Include error handling and follow best practices."""
    
    async def generate_code(self, requirements: str, language: str = "python") -> str:
        """Generate code based on requirements"""
        prompt = f"""
        Generate {language} code for the following requirements:
        {requirements}
        
        Requirements:
        - Include proper error handling
        - Add type hints (if applicable)
        - Write clear docstrings
        - Follow language best practices
        - Include usage examples
        """
        return await self.chat(prompt)
    
    async def review_code(self, code: str) -> str:
        """Review code for issues and improvements"""
        prompt = f"""
        Review this code for:
        - Bugs and potential issues
        - Performance improvements
        - Security vulnerabilities
        - Code style and best practices
        
        Code to review:
        ```
        {code}
        ```
        
        Provide specific, actionable feedback.
        """
        return await self.chat(prompt)

class AnalystAgent(QuickStartAgent):
    """Specialized agent for data analysis and insights"""
    
    def __init__(self):
        super().__init__(
            name="analyst", 
            model="gpt-4o",
            temperature=0.3
        )
        self.system_prompt = """You are a senior data analyst.
        Provide data-driven insights with clear recommendations."""
    
    async def analyze_data(self, data: Any, question: str) -> Dict[str, Any]:
        """Analyze data and provide insights"""
        # Convert data to string representation
        data_str = json.dumps(data, indent=2) if isinstance(data, (dict, list)) else str(data)
        
        prompt = f"""
        Analyze this data to answer: {question}
        
        Data:
        {data_str}
        
        Provide:
        1. Key findings
        2. Trends and patterns
        3. Actionable recommendations
        4. Potential risks or concerns
        
        Format as structured analysis with clear sections.
        """
        
        response = await self.chat(prompt)
        
        return {
            "question": question,
            "analysis": response,
            "data_summary": f"Analyzed {len(str(data))} characters of data"
        }

class WriterAgent(QuickStartAgent):
    """Specialized agent for content creation"""
    
    def __init__(self):
        super().__init__(
            name="writer",
            model="gpt-4o",
            temperature=0.8  # Higher creativity for writing
        )
        self.system_prompt = """You are a professional content writer.
        Create engaging, well-structured content for various audiences."""
    
    async def create_content(self, topic: str, style: str = "professional", 
                           length: str = "medium") -> str:
        """Create content on a given topic"""
        length_guide = {
            "short": "2-3 paragraphs",
            "medium": "5-7 paragraphs", 
            "long": "10+ paragraphs with sections"
        }
        
        prompt = f"""
        Write {length_guide.get(length, "medium length")} content about: {topic}
        
        Style: {style}
        
        Requirements:
        - Engaging introduction that hooks the reader
        - Clear structure with logical flow
        - Actionable insights where relevant
        - Strong conclusion
        - Use appropriate tone for {style} style
        """
        return await self.chat(prompt)

class MultiAgentWorkflow(Workflow):
    """Sample workflow using multiple agents"""
    
    def __init__(self):
        super().__init__(name="multi_agent_demo")
        self.coder = CodeAgent()
        self.analyst = AnalystAgent()
        self.writer = WriterAgent()
    
    async def build_feature_workflow(self, feature_description: str) -> Dict[str, Any]:
        """Complete workflow: analyze → code → document"""
        
        # Step 1: Analyze requirements
        print("🔍 Analyzing requirements...")
        analysis = await self.analyst.analyze_data(
            {"feature": feature_description},
            "What are the technical requirements and potential challenges?"
        )
        
        # Step 2: Generate code
        print("💻 Generating code...")
        code = await self.coder.generate_code(
            f"Based on this analysis: {analysis['analysis']}\n\nImplement: {feature_description}"
        )
        
        # Step 3: Create documentation
        print("📝 Creating documentation...")
        docs = await self.writer.create_content(
            f"Technical documentation for: {feature_description}",
            style="technical"
        )
        
        return {
            "feature": feature_description,
            "analysis": analysis,
            "code": code,
            "documentation": docs,
            "status": "completed"
        }

# ===================
# USAGE EXAMPLES
# ===================

async def demo_single_agent():
    """Demonstrate single agent usage"""
    print("=== Single Agent Demo ===")
    
    coder = CodeAgent()
    result = await coder.generate_code(
        "Create a function to validate email addresses with regex"
    )
    print(f"Generated code:\n{result}")

async def demo_multi_agent():
    """Demonstrate multi-agent workflow"""
    print("=== Multi-Agent Demo ===")
    
    workflow = MultiAgentWorkflow()
    result = await workflow.build_feature_workflow(
        "User authentication system with JWT tokens"
    )
    
    print(f"Workflow completed:")
    print(f"- Analysis: {len(result['analysis']['analysis'])} characters")
    print(f"- Code: {len(result['code'])} characters") 
    print(f"- Docs: {len(result['documentation'])} characters")

async def demo_quick_tasks():
    """Demonstrate quick common tasks"""
    print("=== Quick Tasks Demo ===")
    
    # Quick analysis
    analyst = AnalystAgent()
    sales_data = {"jan": 1000, "feb": 1200, "mar": 1500, "apr": 1300}
    analysis = await analyst.analyze_data(sales_data, "What's the trend?")
    print(f"Sales trend analysis: {analysis['analysis'][:100]}...")
    
    # Quick content
    writer = WriterAgent()
    blog_post = await writer.create_content(
        "Benefits of local AI models",
        style="conversational",
        length="short"
    )
    print(f"Blog post preview: {blog_post[:100]}...")

# ===================
# MAIN EXECUTION
# ===================

async def main():
    """Run all demos"""
    print("🚀 DeerFlow Quick Start Kit Demo")
    print("=" * 50)
    
    try:
        await demo_single_agent()
        print("\n" + "=" * 50 + "\n")
        
        await demo_multi_agent()
        print("\n" + "=" * 50 + "\n")
        
        await demo_quick_tasks()
        
        print("\n✅ All demos completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check your configuration and API keys in .env file")

if __name__ == "__main__":
    # Run the demo
    asyncio.run(main())
```

---

## Quick Setup Instructions

### 1. **Download Files**
Save all three files in your DeerFlow directory:
- `conf.yaml`
- `.env` 
- `agents.py`

### 2. **Add Your API Keys**
Edit the `.env` file and add your API keys from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- DeepSeek: https://platform.deepseek.com/api_keys
- Groq: https://console.groq.com/keys

### 3. **Test Your Setup**
```bash
# Run the demo agents
python agents.py

# Or test individual components
python -c "from agents import CodeAgent; import asyncio; asyncio.run(CodeAgent().generate_code('Hello world function'))"
```

### 4. **Customize for Your Needs**
- Change the primary provider in `conf.yaml`
- Adjust temperature and model settings
- Add your own agents to `agents.py`

---

## Provider Quick Reference

### **OpenAI (Recommended for beginners)**
- **Fast:** `gpt-4o-mini` ($0.15/1M tokens)
- **Balanced:** `gpt-4o` ($2.50/1M tokens)
- **Best:** `gpt-4` ($30/1M tokens)

### **Anthropic (Best for analysis)**
- **Fast:** `claude-3-haiku` ($0.25/1M tokens)
- **Balanced:** `claude-3-5-sonnet` ($3/1M tokens)
- **Best:** `claude-3-opus` ($15/1M tokens)

### **DeepSeek (Best value)**
- **Chat:** `deepseek-chat` ($0.14/1M tokens)
- **Code:** `deepseek-coder` ($0.14/1M tokens)

### **Groq (Fastest responses)**
- **Fast:** `llama-3.1-8b-instant` (Free tier available)
- **Balanced:** `llama-3.1-70b-versatile` ($0.59/1M tokens)

### **Ollama (Free local models)**
- **Fast:** `phi3.5:mini` (2GB RAM)
- **Balanced:** `llama3.2:latest` (4GB RAM)
- **Code:** `deepseek-coder:6.7b` (8GB RAM)

---

## Next Steps

### **Ready to Go Deeper?**

This Quick Start Kit gets you running immediately, but there's so much more you can do with DeerFlow:

🔥 **Want to eliminate API costs completely?** Check out our [DeerFlow + Ollama Integration Guide](https://deerforge.io/ollama) - run unlimited AI workflows for $0/month

🚀 **Need production-ready deployments?** Our [Docker Masterclass](https://deerforge.io/docker) covers containerization, scaling, and monitoring

💡 **Building complex workflows?** Join our community Discord for advanced tutorials and peer support

---

## Support

**Questions? Issues? Need help?**

- 📧 Email: support@deerforge.io
- 💬 Discord: [DeerForge Community](https://discord.gg/deerforge)
- 📖 Documentation: [docs.deerforge.io](https://docs.deerforge.io)

---

*This Quick Start Kit is brought to you by [DeerForge](https://deerforge.io) - the premier marketplace for DeerFlow skills, workflows, and resources.*

**Happy building! 🦌⚡**