# Setup Instructions

## Prerequisites

- Node.js 18+ 
- npm 9+
- Git

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ManabBiswas/EkagraFocus.git
   cd EkagraFocus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables (Optional but Recommended)**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to configure optional settings for AI features:
   - **LLM_MODEL_PATH**: Path to a local GGUF model file
   - **OLLAMA_HOST**: Ollama server endpoint
   
   **Note:** EkagraFocus works offline by default, but to enable full AI features, you should set up a local LLM model.

### Setting Up Local LLM (For AI Chat Features)

EkagraFocus can use local LLM models for completely offline AI features. There are two options:

#### Option A: Embedded LLM (Recommended - Fastest)

1. Download a GGUF model (e.g., from [HuggingFace](https://huggingface.co/models?search=gguf))
   - Popular choices: 
     - Mistral-7B-Instruct
     - Neural-Chat-7B
     - OpenHermes-2.5-Mistral-7B
     
   Example:
   ```bash
   # Download a model (replace with actual URL)
   curl -L -o model.gguf https://huggingface.co/TheBloke/Neural-Chat-7B-v3-1-GGUF/resolve/main/neural-chat-7b-v3-1.Q4_K_M.gguf
   ```

2. Place the model file in one of these locations:
   ```
   # Default locations (checked in order):
   assets/models/model.gguf
   %APPDATA%/EkagraFocus/models/model.gguf  (Windows)
   ~/.config/EkagraFocus/models/model.gguf  (Linux)
   ~/Library/Application Support/EkagraFocus/models/model.gguf (macOS)
   ```

3. Or set in `.env`:
   ```bash
   LLM_MODEL_PATH=/path/to/your/model.gguf
   ```

4. Restart the app - AI features will be automatically enabled!

#### Option B: Ollama (Alternative - More Control)

1. Install Ollama from [ollama.ai](https://ollama.ai/)

2. Start Ollama server:
   ```bash
   ollama serve
   ```

3. In a new terminal, pull a model:
   ```bash
   ollama pull mistral
   # or other models like: neural-chat, openchat, etc.
   ```

4. Set in `.env`:
   ```bash
   OLLAMA_HOST=http://localhost:11434
   ```

5. Restart the app - it will auto-detect Ollama

### Understanding the Console Messages

When you see messages like:
```
[Agent] No AI available, using enhanced fallback
[Agent] Using pattern matching for: ...
```

This means:
- ✅ **App is working normally** - Pattern matching provides intelligent fallback responses
- ❌ **LLM not initialized** - No model file found or LLM initialization failed
- 🔧 **To enable AI**: Follow the setup steps above

The app will automatically try to:
1. Load embedded LLM (if model file provided)
2. Connect to Ollama (if OLLAMA_HOST is set)
3. Fall back to pattern matching (always available)

4. **Run development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run make
   ```

## Troubleshooting

### Port already in use
- The default dev server port may be in use. Check `.webpack` folder and clean if needed.

### Dependencies not installing
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -r node_modules` (or `Remove-Item node_modules -Recurse` on Windows)
- Reinstall: `npm install`

### Build fails
- Ensure you're using Node 18 or higher: `node --version`
- Check that all required environment variables are set
- Try: `npm run lint` to check for code issues

## Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes and test locally: `npm start`
3. Lint and format: `npm run lint`
4. Commit: `git commit -m "feat: description"`
5. Push and create a pull request

## Available Scripts

- `npm start` - Start development server
- `npm run lint` - Run ESLint checks
- `npm run package` - Create application package
- `npm run make` - Build distributable packages
