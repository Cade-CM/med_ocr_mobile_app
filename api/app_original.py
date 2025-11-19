from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import io
import base64
import numpy as np
import cv2
from concurrent.futures import ThreadPoolExecutor, as_completed
from llm_parser import hybrid_parse, is_ollama_available, check_model_available
import time

app = Flask(__name__)
CORS(app)

# Configure Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Production mode: disable debug file writes and verbose logging
PRODUCTION_MODE = True  # Set to False for debugging

# Cache LLM availability check (only check once on startup)
LLM_ENABLED = is_ollama_available() and check_model_available("llama3.2:1b")
if LLM_ENABLED:
    print("✓ Ollama available with llama3.2:1b - LLM parsing enabled")
else:
    print("✗ Ollama not available - Using regex-only parsing")

# Thread pool for parallel OCR processing (reuse threads)
executor = ThreadPoolExecutor(max_workers=3)

def log(msg: str):
    """Conditional logging based on production mode"""
    if not PRODUCTION_MODE:
        print(msg)

def preprocess_and_ocr(img, method_name: str, config: str = r'--oem 3 --psm 6') -> tuple:
    """
    Apply preprocessing method and run OCR
    Returns: (text, confidence, method_name)
    """
    try:
        text = pytesseract.image_to_string(img, config=config)
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=config)
        confidences = [int(c) for c in data['conf'] if int(c) > 0]
        avg_conf = sum(confidences) / len(confidences) if confidences else 0
        
        log(f"  {method_name}: {avg_conf:.1f}% - {repr(text[:50])}")
        return (text, avg_conf, method_name)
    except Exception as e:
        log(f"  {method_name}: Failed - {e}")
        return ("", 0, method_name)

def process_rotation(img_cv, angle: int, name: str) -> tuple:
    """
    Test a single rotation with basic preprocessing
    Returns: (confidence, rotated_image, name)
    """
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY) if len(img_cv.shape) == 3 else img_cv
        
        # Quick denoising test
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        
        # Fast confidence check
        data = pytesseract.image_to_data(denoised, output_type=pytesseract.Output.DICT, config=r'--oem 3 --psm 6')
        conf = [int(c) for c in data['conf'] if int(c) > 0]
        avg_conf = sum(conf) / len(conf) if conf else 0
        
        log(f"  {name}: {avg_conf:.1f}%")
        return (avg_conf, img_cv, name)
    except Exception as e:
        log(f"  {name}: Failed - {e}")
        return (0, img_cv, name)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'OCR API is running',
        'llm_enabled': LLM_ENABLED,
        'production_mode': PRODUCTION_MODE
    })

@app.route('/ocr', methods=['POST'])
def process_ocr():
    """
    Simple OCR endpoint (backwards compatible)
    Expects JSON with base64 encoded image
    """
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        # Perform OCR
        text = pytesseract.image_to_string(image)
        
        if not text or len(text.strip()) == 0:
            return jsonify({
                'success': False,
                'error': 'No text detected in image'
            }), 200
        
        return jsonify({
            'success': True,
            'text': text,
            'length': len(text)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/ocr/detailed', methods=['POST'])
def process_ocr_detailed():
    """
    Optimized OCR with detailed information including confidence scores
    
    OPTIMIZATIONS:
    1. Only test 2 rotations (0° and 180°) - prescription labels are rarely sideways
    2. Early exit if confidence > 90% during rotation testing
    3. Parallel processing of preprocessing methods using ThreadPoolExecutor
    4. Skip debug file writes in production mode
    5. Reduce image upscaling threshold (1500px instead of 2000px)
    6. Only test 3 best preprocessing methods (reduced from 5)
    7. Cache LLM availability check on startup
    """
    start_time = time.time()
    
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        log(f"Processing image: {image.size}, mode: {image.mode}")
        
        # Convert PIL to OpenCV format
        img_array = np.array(image)
        if len(img_array.shape) == 3:
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_cv = img_array
        
        # OPTIMIZATION: Only test 2 rotations (0° and 180°)
        # Prescription labels are rarely rotated 90° or 270°
        rotations = [
            (img_cv, 0, "0°"),
            (cv2.rotate(img_cv, cv2.ROTATE_180), 180, "180°")
        ]
        
        log("\nTesting rotations...")
        best_rotation_conf = 0
        best_rotation_img = img_cv
        best_rotation_name = "0°"
        
        # OPTIMIZATION: Process rotations in parallel
        rotation_futures = {executor.submit(process_rotation, img, angle, name): (img, name) 
                           for img, angle, name in rotations}
        
        for future in as_completed(rotation_futures):
            conf, rot_img, name = future.result()
            if conf > best_rotation_conf:
                best_rotation_conf = conf
                best_rotation_img = rot_img
                best_rotation_name = name
            
            # OPTIMIZATION: Early exit if confidence > 90%
            if best_rotation_conf > 90:
                log(f"Early exit: {name} has {best_rotation_conf:.1f}% confidence")
                break
        
        img_cv = best_rotation_img
        log(f"\nBest rotation: {best_rotation_name} ({best_rotation_conf:.1f}%)")
        
        # OPTIMIZATION: Reduced upscaling threshold (1500px instead of 2000px)
        h, w = img_cv.shape[:2]
        if w < 1500:
            scale_factor = 1500 / w
            width = int(w * scale_factor)
            height = int(h * scale_factor)
            img_cv = cv2.resize(img_cv, (width, height), interpolation=cv2.INTER_CUBIC)
            log(f"Upscaled to: {img_cv.shape}")
        else:
            log(f"Using original size")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY) if len(img_cv.shape) == 3 else img_cv
        
        # OPTIMIZATION: Only test 3 best-performing preprocessing methods
        # Removed: Inverted Otsu (rarely helps), PSM 4 (usually worse than PSM 6)
        
        # Prepare preprocessing methods
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11)
        
        # OPTIMIZATION: Process all methods in parallel
        log("\nProcessing methods in parallel...")
        futures = [
            executor.submit(preprocess_and_ocr, denoised, "Denoised"),
            executor.submit(preprocess_and_ocr, otsu, "Otsu"),
            executor.submit(preprocess_and_ocr, adaptive, "Adaptive")
        ]
        
        results = []
        for future in as_completed(futures):
            text, conf, method = future.result()
            results.append((text, conf, method))
            
            # OPTIMIZATION: Early exit if we hit >92% confidence
            if conf > 92:
                log(f"Early exit: {method} has {conf:.1f}% confidence")
                # Cancel remaining futures
                for f in futures:
                    if not f.done():
                        f.cancel()
                break
        
        # Pick the result with highest confidence
        best_result = max(results, key=lambda x: x[1])
        text, avg_confidence, method = best_result
        
        log(f"\nBest method: {method} ({avg_confidence:.1f}%)")
        log(f"Text length: {len(text)}")
        
        # Create result for hybrid parsing
        regex_result = {
            'text': text,
            'confidence': avg_confidence,
            'word_count': len(text.split()),
            'method': method
        }
        
        # Use hybrid parsing if LLM is available and confidence is low
        if LLM_ENABLED and avg_confidence < 70:
            log(f"Low confidence, attempting LLM enhancement...")
            llm_result = hybrid_parse(text, regex_result, confidence_threshold=0.7)
            
            # If LLM provided structured data, include it
            if 'patientName' in llm_result or 'drugName' in llm_result:
                elapsed = time.time() - start_time
                log(f"⏱️ Total processing time: {elapsed:.2f}s")
                
                return jsonify({
                    'success': True,
                    'text': text,
                    'confidence': llm_result.get('confidence', avg_confidence) * 100,
                    'word_count': len(text.split()),
                    'parsed': llm_result,
                    'method': 'LLM-enhanced',
                    'processing_time': round(elapsed, 2)
                })
        
        elapsed = time.time() - start_time
        log(f"⏱️ Total processing time: {elapsed:.2f}s")
        
        return jsonify({
            'success': True,
            'text': text,
            'confidence': avg_confidence,
            'word_count': len(text.split()),
            'method': method,
            'processing_time': round(elapsed, 2)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Medication OCR API Server (OPTIMIZED)")
    print("=" * 60)
    print("Running on: http://localhost:5000")
    print("Health check: http://localhost:5000/health")
    print("OCR endpoint: POST http://localhost:5000/ocr")
    print("Detailed OCR: POST http://localhost:5000/ocr/detailed")
    print(f"Production mode: {PRODUCTION_MODE}")
    print(f"LLM enabled: {LLM_ENABLED}")
    print("=" * 60)
    print("\nOptimizations applied:")
    print("  ✓ Only 2 rotations (0° and 180°) instead of 4")
    print("  ✓ Parallel processing of preprocessing methods")
    print("  ✓ Early exit on >90% confidence")
    print("  ✓ Reduced upscaling threshold (1500px)")
    print("  ✓ Only 3 preprocessing methods (top performers)")
    print("  ✓ Cached LLM availability check")
    print("  ✓ Removed debug file I/O")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False)
