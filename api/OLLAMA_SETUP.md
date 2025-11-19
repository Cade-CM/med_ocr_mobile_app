# Ollama Setup for LLM-Enhanced OCR Parsing

This guide will help you set up local LLM parsing to improve OCR accuracy.

## Step 1: Install Ollama

### Windows
1. Download Ollama from: https://ollama.ai/download
2. Run the installer
3. Ollama will run as a background service

### Verify Installation
Open PowerShell and run:
```powershell
ollama --version
```

## Step 2: Pull the Model

We'll use Llama 3.2 1B (small, fast model - only ~1GB):

```powershell
ollama pull llama3.2:1b
```

This takes 2-5 minutes depending on your internet speed.

### Alternative Models
If you have more RAM/GPU, you can use larger models:
- `llama3.2:3b` - Better accuracy, ~2GB, slightly slower
- `llama3.1:8b` - Best accuracy, ~4.7GB, slower

## Step 3: Install Python Package

```powershell
cd c:\Users\cadem\Desktop\med_ocr_expo\api
pip install ollama
```

## Step 4: Test Ollama

```powershell
ollama run llama3.2:1b
```

Try a test prompt:
```
Extract medication info from: "JOHN DOE, ASPIRIN 81MG, TAKE 1 TABLET DAILY"
```

Type `/bye` to exit.

## Step 5: Restart Flask API

```powershell
cd c:\Users\cadem\Desktop\med_ocr_expo\api
python app.py
```

You should see:
```
✓ Ollama available with llama3.2:1b - LLM parsing enabled
```

## How It Works

The hybrid parser:
1. **First**: Uses regex-based parsing (fast, free)
2. **If confidence < 70%**: Falls back to LLM parsing
3. **Returns**: Best result with highest confidence

## Performance

- **Regex only**: ~50ms, good for clean OCR
- **LLM fallback**: ~200-500ms, handles OCR errors better
- **Typical usage**: 80% regex, 20% LLM fallback

## Benefits

✅ Handles OCR errors like "VERY" → "EVERY"
✅ Better drug name extraction with trailing garbage
✅ More accurate patient name detection
✅ 100% local - no cloud API needed
✅ No per-request costs
✅ Privacy-friendly

## Creating Training Data (Optional)

If you want to improve the model further:

1. Capture your 30 prescription images
2. Run `python create_training_data.py`
3. Label each extraction manually
4. Fine-tune the model with your data

See `create_training_data.py` for the data collection script.

## Troubleshooting

### "Ollama not available"
- Make sure Ollama is running: check system tray for Ollama icon
- Restart Ollama: Right-click icon → Restart

### "Model not found"
```powershell
ollama pull llama3.2:1b
```

### "Connection refused"
- Ollama might not be running
- Check: `ollama list` should show installed models

### Slow responses
- Use smaller model: `ollama pull llama3.2:1b`
- Close other applications to free up RAM
