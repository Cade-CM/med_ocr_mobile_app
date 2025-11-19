"""
LLM-based medication label parser using Ollama
Provides more robust parsing for OCR text with errors
"""
import json
import re

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    print("Warning: ollama not installed. LLM parsing will be disabled.")


def parse_with_llm(ocr_text: str, model: str = "llama3.2:1b") -> dict:
    """
    Parse medication information using a local LLM via Ollama
    
    Args:
        ocr_text: Raw OCR text from prescription label
        model: Ollama model to use (default: llama3.2:1b for speed)
    
    Returns:
        Dictionary with extracted medication fields
    """
    if not OLLAMA_AVAILABLE:
        return {"error": "Ollama not available"}
    
    try:
        prompt = f"""You are a pharmacy assistant analyzing a prescription label. Extract the medication information from the OCR text below.

Here are examples of correctly parsed prescription labels:

Example 1:
Patient: CADE MONTES
Drug: HYDROXYZINE HCL
Strength: 10MG
Dosage: 1 TABLET
Frequency: EVERY 6 TO 8 HOURS
Duration: AS NEEDED

Example 2:
Patient: KYAH MONTES
Drug: CLINDAMYCIN
Strength: 300MG
Dosage: 1 CAPSULE
Frequency: THREE TIMES DAILY
Duration: 10 DAYS

Example 3:
Patient: CAMERON MONTES
Drug: DOXYCYCLINE MONOHYDRATE
Strength: 100MG
Dosage: 1 TABLET
Frequency: TWICE DAILY
Duration: 7 DAYS

Now extract from this OCR text:

OCR Text:
{ocr_text}

Extract these fields (set to null if not found):
- patientName: Patient's full name (usually first line, format: "FIRSTNAME LASTNAME")
- drugName: Medication name only (e.g., "PREDNISONE", "DOXYCYCLINE")
- strength: Medication strength with unit (e.g., "20MG", "500MCG")
- dosage: Amount to take (e.g., "1 TABLET", "2 CAPSULES")
- frequency: How often to take (e.g., "EVERY 12 HOURS", "TWICE DAILY")
- duration: How long to take (e.g., "5 DAYS", "7 DAYS")
- rxNumber: Prescription/RX number (e.g., "1234567-10613", "3570300-03233")
- quantity: Number of pills/capsules dispensed (e.g., "30", "60")
- refills: Number of refills allowed (e.g., "0", "1", "3", or "NO REFILLS")
- refillsBeforeDate: Date before which refills must be filled (e.g., "12/25/2025", "01/15/2026")
- pharmacy: Pharmacy name (e.g., "CVS PHARMACY", "WALGREENS")
- pharmacyPhone: Pharmacy phone number (e.g., "(555) 123-4567")

Return ONLY valid JSON with these fields. No explanation.

JSON:"""

        response = ollama.generate(
            model=model,
            prompt=prompt,
            options={
                "temperature": 0.1,  # Low temperature for consistent output
                "num_predict": 200,  # Limit response length
            }
        )
        
        # Extract JSON from response
        response_text = response['response'].strip()
        
        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            
            # Normalize the result
            normalized = {
                "patientName": result.get("patientName"),
                "drugName": result.get("drugName"),
                "strength": result.get("strength"),
                "dosage": result.get("dosage"),
                "frequency": result.get("frequency"),
                "duration": result.get("duration"),
                "rxNumber": result.get("rxNumber"),
                "quantity": result.get("quantity"),
                "refills": result.get("refills"),
                "refillsBeforeDate": result.get("refillsBeforeDate"),
                "pharmacy": result.get("pharmacy"),
                "pharmacyPhone": result.get("pharmacyPhone"),
                "confidence": 0.85  # LLM results typically have high confidence
            }
            
            # Clean up None values
            return {k: v for k, v in normalized.items() if v is not None}
        else:
            return {"error": "Failed to parse LLM response"}
            
    except Exception as e:
        print(f"LLM parsing error: {e}")
        return {"error": str(e)}


def is_ollama_available() -> bool:
    """Check if Ollama is installed and running"""
    if not OLLAMA_AVAILABLE:
        return False
    
    try:
        # Try to list models
        ollama.list()
        return True
    except Exception:
        return False


def check_model_available(model: str = "llama3.2:1b") -> bool:
    """Check if a specific model is available in Ollama"""
    if not OLLAMA_AVAILABLE:
        return False
    
    try:
        models_response = ollama.list()
        if hasattr(models_response, 'models'):
            model_names = [m.model for m in models_response.models]
            return any(model in name for name in model_names)
        return False
    except Exception:
        return False


def hybrid_parse(ocr_text: str, regex_result: dict, confidence_threshold: float = 0.7) -> dict:
    """
    Hybrid parsing: Use regex first, fall back to LLM if confidence is low
    
    Args:
        ocr_text: Raw OCR text
        regex_result: Result from regex-based parsing
        confidence_threshold: Minimum confidence to trust regex result
    
    Returns:
        Best parsing result
    """
    regex_confidence = regex_result.get('confidence', 0) / 100.0
    
    # If regex parsing is good enough, use it
    if regex_confidence >= confidence_threshold:
        print(f"Using regex parsing (confidence: {regex_confidence:.2%})")
        return regex_result
    
    # Otherwise, try LLM parsing
    if is_ollama_available():
        print(f"Regex confidence low ({regex_confidence:.2%}), trying LLM parsing...")
        llm_result = parse_with_llm(ocr_text)
        
        if "error" not in llm_result:
            print("LLM parsing successful")
            return llm_result
        else:
            print(f"LLM parsing failed: {llm_result['error']}")
    
    # Fall back to regex result
    print("Using regex result as fallback")
    return regex_result
