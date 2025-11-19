# Medication OCR API

Local OCR API using Flask and Tesseract for processing prescription label images.

## Prerequisites

### 1. Install Tesseract OCR

**Windows:**
1. Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (use default path: `C:\Program Files\Tesseract-OCR`)
3. Add Tesseract to PATH or update the path in `app.py`

**Verify installation:**
```powershell
tesseract --version
```

### 2. Install Python Dependencies

```powershell
cd api
pip install -r requirements.txt
```

## Running the API

```powershell
cd api
python app.py
```

The API will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "message": "OCR API is running"
}
```

### OCR Processing
```
POST /ocr
```

Request body:
```json
{
  "image": "base64_encoded_image_string"
}
```

Response:
```json
{
  "success": true,
  "text": "extracted text from image",
  "length": 123
}
```

### Detailed OCR
```
POST /ocr/detailed
```

Request body:
```json
{
  "image": "base64_encoded_image_string"
}
```

Response:
```json
{
  "success": true,
  "text": "extracted text",
  "confidence": 85.5,
  "word_count": 15
}
```

## Testing

Test the API with curl:

```powershell
# Health check
curl http://localhost:5000/health

# OCR (with base64 image)
curl -X POST http://localhost:5000/ocr -H "Content-Type: application/json" -d "{\"image\": \"your_base64_image\"}"
```

## Configuration

Update the Tesseract path in `app.py` if installed in a different location:

```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Your\Custom\Path\tesseract.exe'
```

## Troubleshooting

**Error: "tesseract is not installed or it's not in your PATH"**
- Ensure Tesseract is installed and accessible from command line
- Update the `tesseract_cmd` path in `app.py`

**Error: "No text detected in image"**
- Check image quality and lighting
- Ensure prescription label is clearly visible
- Try with higher resolution images

**Connection refused errors:**
- Check if API is running: `http://localhost:5000/health`
- Verify firewall isn't blocking port 5000
