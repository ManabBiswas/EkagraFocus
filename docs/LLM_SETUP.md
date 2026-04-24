# LLM Setup Guide

## Quick Start: 

### Fastest Setup - Phi-2 Recommended ⭐

**Step 1: Download (1 minute)**
```bash
mkdir ~/models
cd ~/models

# Download Phi-2 (1.4GB)
curl -L -o phi2.gguf "https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf"
```

**Step 2: Configure (1 minute)**
```bash
cd ~/EkagraFocus
cp .env.example .env
```

Edit `.env`:
```bash
# Windows
LLM_MODEL_PATH=C:\Users\YourName\models\phi2.gguf

# macOS/Linux
LLM_MODEL_PATH=/home/yourname/models/phi2.gguf
```

**Step 3: Run (1 second)**
```bash
npm start
```

**Done!** AI features are now active. Total: ~2 minutes ⚡

### Why Phi-2 for EkagraFocus?

✅ **Perfect size** (1.4GB) - Fast download & loads
✅ **Good quality** - Trained on quality data
✅ **Study-focused** - Works well for planning advice
✅ **Fast responses** - Completes in 2-5 seconds
✅ **Low resources** - Works with 4GB RAM

---

## Important Note

**You don't need to set up LLM to use EkagraFocus!** The app works perfectly fine without it:
- ✅ Timer and session logging work without AI
- ✅ Goal tracking works without AI
- ✅ Analytics dashboard works without AI
- ✅ Notes and planning features work without AI

The LLM enables the **Chat Assistant** to provide more intelligent responses instead of pattern matching.

## Understanding the Fallback System

EkagraFocus has a smart fallback system:

```
1. Try Embedded LLM (if model file provided)
   ↓ [If available]
2. Try Ollama (if OLLAMA_HOST configured)
   ↓ [If available]
3. Use Pattern Matching (always available)
```

If you see messages like:
```
[Agent] No AI available, using enhanced fallback
[Agent] Using pattern matching for: ...
```

This is **normal and expected** if you haven't set up an LLM model. The app is working correctly!

## Quick Start: Enable AI

### Option 1: Use Ollama (Easiest for Beginners)

**1. Install Ollama**
- Visit [ollama.ai](https://ollama.ai/) and download
- Run the installer and follow instructions

**2. Download a Lightweight Model**

Choose one of these lightweight Ollama models (1-2GB):

```bash
# Lightweight options (1-2GB) recommended for most users
ollama pull phi              # ~1.6GB - best balance of quality and speed
ollama pull orca-mini        # ~1.3GB - good alternative
ollama pull tinyllama        # ~600MB  - smallest option

# If you have more space (3-4GB+)
ollama pull neural-chat      # ~3.8GB - study-focused
ollama pull mistral          # ~4.4GB - most capable
```

**Recommended default for EkagraFocus:** `ollama pull phi`
- Balanced response quality and speed
- Good fit for study planning and short assistant prompts
- Smaller and faster than Mistral-class models
- Suitable for typical laptop hardware

**3. Configure in EkagraFocus**
```bash
# Copy environment template
cp .env.example .env
```

Edit `.env`:
```bash
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi
OLLAMA_TIMEOUT_MS=30000
```

**Done!** AI features will be active with the model you pulled.

If the first request is slow, keep Ollama running in a separate terminal. The app now waits longer before falling back so model warm-up does not get misclassified as failure.

---

### Ollama Lightweight Models Comparison

If you want to use **Ollama** with minimal download size, here are your options:

| Model | Size | Speed | Quality | Download Time | Best For |
|-------|------|-------|---------|----------------|----------|
| **phi** ⭐ | ~1.6GB | ⚡⚡⚡ | ⭐⭐⭐ | 5-10 min | Study planning (recommended) |
| tinyllama | ~600MB | ⚡⚡⚡⚡ | ⭐⭐ | 3-5 min | Fastest responses |
| orca-mini | ~1.3GB | ⚡⚡⚡ | ⭐⭐⭐ | 5-10 min | Good alternative |
| neural-chat | ~3.8GB | ⚡⚡ | ⭐⭐⭐⭐ | 15-30 min | Best education-focused |
| mistral | ~4.4GB | ⚡⚡ | ⭐⭐⭐⭐ | 20-40 min | Most capable |

**Quick Commands:**
```bash
# Smallest (600MB)
ollama pull tinyllama

# Best balance (~1.6GB) recommended
ollama pull phi

# Education-focused (3.8GB)
ollama pull neural-chat
```

---

**1. Download a Model**

Popular GGUF models:
- [Mistral-7B-Instruct](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF)
- [Neural-Chat-7B](https://huggingface.co/TheBloke/neural-chat-7B-v3-1-GGUF)
- [OpenHermes-2.5](https://huggingface.co/TheBloke/OpenHermes-2.5-Mistral-7B-GGUF)

Choose a quantized version (e.g., `Q4_K_M`, `Q5_K_M`) for better speed/quality balance.

Example download:
```bash
# Download to a folder
mkdir ~/models
cd ~/models

# Download (choose one)
# Mistral (4.3GB - recommended)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/Mistral-7B-Instruct-v0.1.Q4_K_M.gguf

# Or use curl
curl -L -o mistral.gguf "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/Mistral-7B-Instruct-v0.1.Q4_K_M.gguf"
```

**2. Configure in EkagraFocus**
```bash
cp .env.example .env
```

Edit `.env`:
```
# Windows
LLM_MODEL_PATH=C:\Users\YourName\models\mistral.gguf

# macOS/Linux
LLM_MODEL_PATH=/home/yourname/models/mistral.gguf
```

**3. Restart EkagraFocus**
```bash
npm start
```

The AI features will now be active!

## Recommended Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **TinyLlama-1.1B** ⭐ | **600MB** | ⭐⭐⭐⭐ | ⭐⭐ | **Lightweight, fast** |
| **Phi-2 (2.7B)** ⭐ | **1.4GB** | ⭐⭐⭐⭐ | ⭐⭐⭐ | **Best small model** |
| Mistral-7B Q3 | 3.3GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | Balanced |
| Mistral-7B Q4 | 4.3GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | Overall best |
| Neural-Chat-7B | 4GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | Study planning |
| Dolphin-Mixtral | 8GB | ⭐⭐ | ⭐⭐⭐⭐⭐ | Complex queries |

### 🚀 Lightweight Models (1-2GB) - Recommended for Most Users

These work great for study planning with minimal resources:

#### TinyLlama-1.1B (600MB) - Smallest & Fastest ⭐

```bash
# Download (600MB)
cd ~/models
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v0.3-GGUF/resolve/main/tinyllama-1.1b-chat-v0.3.Q4_K_M.gguf

# Or curl
curl -L -o tinyllama.gguf "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v0.3-GGUF/resolve/main/tinyllama-1.1b-chat-v0.3.Q4_K_M.gguf"
```

**Pros:**
- Instant responses (very fast)
- Only 600MB - runs on any device
- Good for quick study tips

**Cons:**
- Limited knowledge
- Shorter context window
- May give generic answers

---

#### Phi-2 (2.7GB) - Best 1-2GB Model ⭐⭐ **RECOMMENDED**

```bash
# Download (1.4GB quantized)
cd ~/models
wget https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf

# Or curl
curl -L -o phi2.gguf "https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf"
```

**Pros:**
- Surprisingly capable (trained on quality data)
- 1.4GB quantized version fits budget
- Good for study planning & advice
- Faster than Mistral-7B

**Cons:**
- Smaller knowledge base than 7B models
- May occasionally hallucinate

---

#### Mistral-7B Q3 (3.3GB) - Light Large Model

```bash
# Download (3.3GB)
cd ~/models
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/Mistral-7B-Instruct-v0.1.Q3_K_M.gguf

# Or curl
curl -L -o mistral-light.gguf "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/Mistral-7B-Instruct-v0.1.Q3_K_M.gguf"
```

**Pros:**
- Better than Phi-2 for complex questions
- Still relatively light at Q3 quantization
- Good general knowledge

**Cons:**
- 3.3GB (above 2GB target but still reasonable)
- Slower than TinyLlama

---

### 📊 Comparison for Study Planning

```
Task: "Help me plan my week"

TinyLlama:     Generic week structure (quick)
Phi-2:         Decent plan with tips (balanced)
Mistral-7B:    Detailed plan with reasoning (best)
```

### 💾 Storage Requirements

| Model | Download | Loaded in RAM | Needs |
|-------|----------|---------------|-------|
| TinyLlama | 600MB | 1GB | 4GB RAM |
| Phi-2 | 1.4GB | 1.5GB | 4GB RAM |
| Mistral-7B Q3 | 3.3GB | 3.5GB | 8GB RAM |
| Mistral-7B Q4 | 4.3GB | 4.5GB | 8GB RAM |

## Troubleshooting

### AI Chat Not Working

**Check Console**
- Open DevTools: `Ctrl+Shift+I`
- Look for `[LLMService]` or `[Agent]` messages
- Should show what LLM is being used

**Common Issues:**

1. **Model file not found**
   ```
   [LLMService] Model file not found
   ```
   - Verify file path in `.env`
   - Ensure file exists and has `.gguf` extension
   - Use absolute path (not relative)

2. **Ollama not responding**
   ```
   [Agent] Ollama connection failed
   ```
   - Ensure Ollama is running: `ollama serve`
   - Check OLLAMA_HOST is correct: `http://localhost:11434`
   - Try `curl http://localhost:11434` to test

3. **Out of memory**
   ```
   [LLMService] Allocation failed
   ```
   - Model is too large for your RAM
   - Close other applications
   - Use a smaller quantization (e.g., Q4 instead of Q5)

### Performance Issues

**Slow Responses**
- Use a smaller model (e.g., Mistral-7B instead of Mixtral)
- Use lower quantization (Q3 or Q4 instead of Q5)
- Close other applications
- Ensure sufficient RAM (8GB+ recommended)

**High CPU Usage**
- Normal for LLM inference
- Model will use all available cores
- Reduce model size if needed

## System Requirements

**For Embedded LLM:**
- CPU: Modern multi-core processor (4+ cores recommended)
- RAM: 8GB minimum (16GB+ recommended)
- Disk: 5-10GB free (depends on model size)

**For Ollama:**
- Same as above, Ollama runs separately
- Can use GPU if installed (automatic in Ollama)

## Advanced Configuration

### Custom Model Paths

EkagraFocus checks these locations (in order):
```
1. LLM_MODEL_PATH from .env
2. /assets/models/model.gguf (relative to app)
3. %APPDATA%/EkagraFocus/models/model.gguf (Windows)
4. ~/.config/EkagraFocus/models/model.gguf (Linux)
5. ~/Library/Application Support/EkagraFocus/models/model.gguf (macOS)
```

### Environment Variables

```bash
# Use embedded model
LLM_MODEL_PATH=/path/to/model.gguf

# Use Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi
OLLAMA_TIMEOUT_MS=30000

# Or both (embedded tried first, then Ollama)
```

## FAQ

**Q: Is my data sent to an external server?**
A: No. All LLM inference happens locally on your device. No data leaves your computer.

**Q: Which model should I choose?**
A: For Ollama, start with **phi**. It offers the best balance of speed and quality for this app. If you need faster but simpler responses, use **tinyllama**.

**Q: Can I use a different LLM engine?**
A: Currently we support embedded (node-llama-cpp) and Ollama. Other engines can be added via contribution.

**Q: What if I don't set up a model?**
A: The app works fine with pattern matching. Chat responses will be less sophisticated but still useful.

**Q: Can I switch models?**
A: Yes, change `LLM_MODEL_PATH` in `.env` and restart the app.

**Q: Does LLM use my GPU?**
A: Embedded LLM uses CPU by default. Ollama can use GPU if installed.

## Getting Help

- Check console logs: `Ctrl+Shift+I` → Console
- Read [Architecture Guide](Architecture.md)
- Open an issue on GitHub with:
  - Console output
  - Model you're using
  - Your system specs
  - Error messages

## Resources

- [GGUF Model Collections](https://huggingface.co/collections/TheBloke/gguf-models-latest-releases-620a109e1208fa7c9c00e6ba)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp)
- [Quantization Explained](https://huggingface.co/docs/transformers/quantization)
