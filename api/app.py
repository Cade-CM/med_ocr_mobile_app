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
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Data storage directory
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MEDICATIONS_FILE = os.path.join(DATA_DIR, 'medications.json')
ADHERENCE_FILE = os.path.join(DATA_DIR, 'adherence.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Configure Tesseract path
import os
import sys

# Only set Windows path if running on Windows
if sys.platform == 'win32':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
else:
    # On Linux (Render), tesseract is in PATH
    pytesseract.pytesseract.tesseract_cmd = 'tesseract'

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

def load_json_data(filepath, default=[]):
    """Load JSON data from file"""
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return default
    return default

def save_json_data(filepath, data):
    """Save JSON data to file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'OCR API is running',
        'llm_enabled': LLM_ENABLED,
        'production_mode': PRODUCTION_MODE,
        'data_sync': True
    })

# ============================================================================
# DATA SYNC ENDPOINTS - Share medications between apps
# ============================================================================

@app.route('/api/medications', methods=['GET'])
def get_medications():
    """Get all medications"""
    try:
        medications = load_json_data(MEDICATIONS_FILE, [])
        return jsonify({
            'success': True,
            'medications': medications,
            'count': len(medications)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/medications/<medication_id>', methods=['GET'])
def get_medication(medication_id):
    """Get a single medication by ID"""
    try:
        medications = load_json_data(MEDICATIONS_FILE, [])
        medication = next((m for m in medications if m.get('id') == medication_id), None)
        
        if medication:
            return jsonify({
                'success': True,
                'medication': medication
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Medication not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/medications', methods=['POST'])
def create_or_update_medication():
    """Create or update a medication"""
    try:
        data = request.json
        
        if not data or 'id' not in data:
            return jsonify({
                'success': False,
                'error': 'Medication ID required'
            }), 400
        
        medications = load_json_data(MEDICATIONS_FILE, [])
        
        # Check if medication exists
        existing_index = next((i for i, m in enumerate(medications) if m.get('id') == data['id']), None)
        
        # Add timestamp
        data['updatedAt'] = datetime.now().isoformat()
        if existing_index is None:
            data['createdAt'] = datetime.now().isoformat()
        
        if existing_index is not None:
            # Update existing
            medications[existing_index] = data
            action = 'updated'
        else:
            # Create new
            medications.append(data)
            action = 'created'
        
        save_json_data(MEDICATIONS_FILE, medications)
        
        return jsonify({
            'success': True,
            'medication': data,
            'action': action
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/medications/<medication_id>', methods=['DELETE'])
def delete_medication(medication_id):
    """Delete a medication"""
    try:
        medications = load_json_data(MEDICATIONS_FILE, [])
        
        # Filter out the medication
        filtered = [m for m in medications if m.get('id') != medication_id]
        
        if len(filtered) == len(medications):
            return jsonify({
                'success': False,
                'error': 'Medication not found'
            }), 404
        
        save_json_data(MEDICATIONS_FILE, filtered)
        
        return jsonify({
            'success': True,
            'message': 'Medication deleted'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/adherence', methods=['GET'])
def get_adherence_records():
    """Get all adherence records"""
    try:
        # Optional: filter by medication_id
        medication_id = request.args.get('medication_id')
        
        records = load_json_data(ADHERENCE_FILE, [])
        
        if medication_id:
            records = [r for r in records if r.get('medicationId') == medication_id]
        
        return jsonify({
            'success': True,
            'records': records,
            'count': len(records)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/adherence', methods=['POST'])
def create_adherence_record():
    """Create an adherence record"""
    try:
        data = request.json
        
        if not data or 'id' not in data:
            return jsonify({
                'success': False,
                'error': 'Record ID required'
            }), 400
        
        records = load_json_data(ADHERENCE_FILE, [])
        
        # Add timestamp
        data['createdAt'] = datetime.now().isoformat()
        records.append(data)
        
        save_json_data(ADHERENCE_FILE, records)
        
        return jsonify({
            'success': True,
            'record': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
    print("=" * 60)
    print(f"OCR REQUEST RECEIVED at {datetime.now()}")
    print("=" * 60)
    
    try:
        data = request.json
        print(f"Request data received, has image: {'image' in data if data else False}")
        
        if not data or 'image' not in data:
            print("ERROR: No image data in request!")
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Decode base64 image
        print(f"Decoding base64 image (length: {len(data['image'])} chars)")
        image_data = base64.b64decode(data['image'])
        print(f"Image data decoded: {len(image_data)} bytes")
        image = Image.open(io.BytesIO(image_data))
        print(f"PIL Image opened: {image.size}, mode: {image.mode}")
        
        log(f"Processing image: {image.size}, mode: {image.mode}")
        
        # Convert PIL to OpenCV format
        print("Converting PIL to OpenCV format...")
        img_array = np.array(image)
        if len(img_array.shape) == 3:
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_cv = img_array
        print(f"OpenCV image shape: {img_cv.shape}")
        
        # Test all 4 rotations in parallel (camera orientation varies)
        print("Testing rotations...")
        rotations = [
            (img_cv, 0, "0°"),
            (cv2.rotate(img_cv, cv2.ROTATE_90_COUNTERCLOCKWISE), 90, "90° CCW"),
            (cv2.rotate(img_cv, cv2.ROTATE_180), 180, "180°"),
            (cv2.rotate(img_cv, cv2.ROTATE_90_CLOCKWISE), 270, "270° (90 CW)")
        ]
        
        log("\nTesting rotations...")
        best_rotation_conf = 0
        best_rotation_img = img_cv
        best_rotation_name = "0°"
        
        # OPTIMIZATION: Process rotations in parallel
        print("Starting parallel rotation processing...")
        rotation_futures = {executor.submit(process_rotation, img, angle, name): (img, name) 
                           for img, angle, name in rotations}
        
        print(f"Created {len(rotation_futures)} rotation tasks")
        rotation_scores = []
        for future in as_completed(rotation_futures):
            conf, rot_img, name = future.result()
            rotation_scores.append((name, conf))
            print(f"  {name}: {conf:.1f}% confidence")
            if conf > best_rotation_conf:
                best_rotation_conf = conf
                best_rotation_img = rot_img
                best_rotation_name = name
            
            # OPTIMIZATION: Early exit if confidence > 90%
            if best_rotation_conf > 90:
                log(f"Early exit: {name} has {best_rotation_conf:.1f}% confidence")
                print(f"Early exit at {name} with {best_rotation_conf:.1f}% confidence")
                break
        
        # Print all rotation scores for debugging
        print("\n=== ROTATION SCORES ===")
        for name, score in sorted(rotation_scores, key=lambda x: x[1], reverse=True):
            marker = "✓" if name == best_rotation_name else " "
            print(f"{marker} {name}: {score:.1f}%")
        print("=======================\n")
        
        img_cv = best_rotation_img
        log(f"\nBest rotation: {best_rotation_name} ({best_rotation_conf:.1f}%)")
        print(f"✓ Using rotation: {best_rotation_name} with {best_rotation_conf:.1f}% confidence")
        
        # Save debug image to verify rotation (if not in production mode)
        if not PRODUCTION_MODE:
            debug_path = os.path.join(DATA_DIR, 'debug_rotation.jpg')
            cv2.imwrite(debug_path, best_rotation_img)
            print(f"Debug: Saved rotated image to {debug_path}")
        
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
        
        # Use LLM-first hybrid parsing if available
        if LLM_ENABLED:
            print("\n🤖 Starting LLM-first parsing...")
            llm_result = hybrid_parse(text, regex_result, confidence_threshold=0.7, prefer_llm=True)
            
            # If LLM provided structured data, return it
            if 'patientName' in llm_result or 'drugName' in llm_result:
                elapsed = time.time() - start_time
                print(f"⏱️ Total processing time: {elapsed:.2f}s")
                
                return jsonify({
                    'success': True,
                    'text': text,
                    'confidence': llm_result.get('confidence', avg_confidence) * 100,
                    'word_count': len(text.split()),
                    'parsed': llm_result,
                    'method': 'LLM-enhanced',
                    'processing_time': round(elapsed, 2)
                })
        
        # Fallback to regex-only result if LLM not available
        elapsed = time.time() - start_time
        print(f"⏱️ Total processing time: {elapsed:.2f}s (regex-only)")
        
        return jsonify({
            'success': True,
            'text': text,
            'confidence': avg_confidence,
            'word_count': len(text.split()),
            'method': method,
            'processing_time': round(elapsed, 2)
        })
        
    except Exception as e:
        print("=" * 60)
        print(f"OCR ERROR: {type(e).__name__}: {str(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Medication OCR API Server (OPTIMIZED + DATA SYNC)")
    print("=" * 60)
    print("Running on: http://localhost:5000")
    print("Health check: http://localhost:5000/health")
    print("\nOCR Endpoints:")
    print("  POST http://localhost:5000/ocr")
    print("  POST http://localhost:5000/ocr/detailed")
    print("\nData Sync Endpoints:")
    print("  GET  http://localhost:5000/api/medications")
    print("  POST http://localhost:5000/api/medications")
    print("  GET  http://localhost:5000/api/medications/<id>")
    print("  DEL  http://localhost:5000/api/medications/<id>")
    print("  GET  http://localhost:5000/api/adherence")
    print("  POST http://localhost:5000/api/adherence")
    print("=" * 60)
    print(f"Production mode: {PRODUCTION_MODE}")
    print(f"LLM enabled: {LLM_ENABLED}")
    print(f"Data directory: {DATA_DIR}")
    print("=" * 60)
    print("\nOptimizations applied:")
    print("  ✓ All 4 rotations tested in parallel")
    print("  ✓ Parallel processing of preprocessing methods")
    print("  ✓ Early exit on >90% confidence")
    print("  ✓ Reduced upscaling threshold (1500px)")
    print("  ✓ Only 3 preprocessing methods (top performers)")
    print("  ✓ Cached LLM availability check")
    print("  ✓ Removed debug file I/O")
    print("  ✓ Data sync for multi-device support")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False)
