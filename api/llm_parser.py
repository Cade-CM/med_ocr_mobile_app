"""
LLM-based medication label parser using Ollama
Provides more robust parsing for OCR text with errors
Enhanced with drug database reference for better accuracy
"""
import json
import re
from typing import List, Optional

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    print("Warning: ollama not installed. LLM parsing will be disabled.")

# Load drug database for validation
DRUG_DATABASE = None

def load_drug_database():
    """Load drug names from MedicationDatabase for validation"""
    global DRUG_DATABASE
    if DRUG_DATABASE is None:
        try:
            # Import here to avoid circular dependency
            import sys
            import os
            sys.path.insert(0, os.path.dirname(__file__))
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'services'))
            
            # Try to read the medication database JSON
            db_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'services', 'MedicationDatabase.ts')
            print(f"📂 Looking for drug database at: {db_path}")
            print(f"📂 File exists: {os.path.exists(db_path)}")
            
            if os.path.exists(db_path):
                with open(db_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    print(f"📂 File size: {len(content)} bytes")
                    
                    # Extract drug names from TypeScript array
                    matches = re.findall(r"name:\s*'([^']+)'", content)
                    print(f"📂 Regex found {len(matches)} matches")
                    
                    DRUG_DATABASE = sorted(set(matches))
                    print(f"✓ Loaded {len(DRUG_DATABASE)} drug names from database")
                    
                    if len(DRUG_DATABASE) > 0:
                        print(f"📂 Sample drugs: {DRUG_DATABASE[:5]}")
            else:
                print(f"❌ Drug database file not found at {db_path}")
                DRUG_DATABASE = []
        except Exception as e:
            print(f"❌ Error loading drug database: {e}")
            import traceback
            traceback.print_exc()
            DRUG_DATABASE = []
    return DRUG_DATABASE

def get_relevant_drugs(ocr_text: str, top_n: int = 20) -> List[str]:
    """Get most relevant drug names from database based on OCR text"""
    drugs = load_drug_database()
    if not drugs:
        return []
    
    # Score drugs by how many characters match the OCR text
    ocr_upper = ocr_text.upper()
    scored_drugs = []
    
    for drug in drugs:
        drug_upper = drug.upper()
        # Check if drug name appears in OCR text
        if drug_upper in ocr_upper:
            score = len(drug_upper) * 2  # Exact match gets high score
        else:
            # Count matching characters
            score = sum(1 for char in drug_upper if char in ocr_upper)
        
        if score > 3:  # Only include drugs with some relevance
            scored_drugs.append((drug, score))
    
    # Return top N most relevant drugs
    scored_drugs.sort(key=lambda x: x[1], reverse=True)
    return [drug for drug, score in scored_drugs[:top_n]]


def parse_with_llm(ocr_text: str, model: str = "llama3.2:1b", use_drug_db: bool = True) -> dict:
    """
    Parse medication information using a local LLM via Ollama
    Enhanced with drug database reference for better accuracy
    
    Args:
        ocr_text: Raw OCR text from prescription label
        model: Ollama model to use (default: llama3.2:1b for speed)
        use_drug_db: Whether to include drug database context
    
    Returns:
        Dictionary with extracted medication fields
    """
    if not OLLAMA_AVAILABLE:
        return {"error": "Ollama not available"}
    
    try:
        # Get relevant drugs from database if enabled
        relevant_drugs = get_relevant_drugs(ocr_text, top_n=15) if use_drug_db else []
        
        drug_context = ""
        if relevant_drugs:
            drug_context = f"""
Most likely drug names based on database (use these if you see similar text):
{', '.join(relevant_drugs[:10])}

Additional possibilities:
{', '.join(relevant_drugs[10:15])}
"""
        
        prompt = f"""You are a pharmacy assistant analyzing a prescription label OCR text. The OCR may have errors (e.g., "0" for "O", "1" for "I", missing letters, "!" instead of "I").

{drug_context}

CRITICAL RULES - READ CAREFULLY:
1. ONLY extract information that is ACTUALLY PRESENT in the text
2. DO NOT make up or infer information that is not explicitly stated
3. DO NOT assume standard prescription patterns - extract ONLY what you see
4. If a field is unclear or not present, set it to null - do not guess
5. Patient name is usually on line 2-3 after garbage symbols (format: "FIRSTNAME LASTNAME")
6. Drug name comes after the name - may be truncated or have OCR errors
7. Match truncated drug names to database ONLY if there's a clear partial match
8. Strength is a NUMBER + UNIT like "20MG", "100MCG" - must be explicitly stated
9. Dosage is "X TABLET(S)" or "X CAPSULE(S)" - must be explicitly stated
10. Do NOT extract address parts as pharmacy names
11. Do NOT invent standard durations like "5 DAYS" unless clearly stated

EXAMPLES OF WHAT NOT TO DO:
- "MAGNOWAD" in address → DO NOT extract as pharmacy name
- "4h TABI ET BY joutt" → DO NOT assume "1 TABLET" - this is garbled text
- Missing strength → DO NOT infer "20MG" from nowhere
- Missing duration → DO NOT add "5 DAYS" - set to null

OCR Text (contains errors and may be incomplete):
```
{ocr_text}
```

Extract and return ONLY valid JSON with ONLY information that is clearly present:
{{
  "patientName": "FULL NAME if clearly visible, else null",
  "drugName": "EXACT DRUG NAME or best database match for truncated name, else null",
  "strength": "NUMBER+UNIT like '20MG' if explicitly stated, else null",
  "dosage": "X TABLET/CAPSULE if explicitly stated, else null",
  "frequency": "HOW OFTEN if explicitly stated (e.g., 'ONCE DAILY', 'TWICE DAILY'), else null",
  "duration": "HOW LONG if explicitly stated (e.g., '5 DAYS', '7 DAYS'), else null",
  "instructions": "FULL DIRECTIONS if present, else null",
  "rxNumber": "RX NUMBER if clearly visible, else null",
  "quantity": "NUMBER ONLY if clearly visible, else null",
  "refills": "NUMBER if stated, else null",
  "refillsBeforeDate": "DATE MM/DD/YY if present, else null",
  "pharmacy": "PHARMACY NAME if clearly stated (NOT address parts), else null",
  "pharmacyPhone": "PHONE (XXX) XXX-XXXX if present, else null"
}}

JSON:"""

        response = ollama.generate(
            model=model,
            prompt=prompt,
            options={
                "temperature": 0.1,  # Very low temperature to reduce hallucination
                "num_predict": 400,  # More tokens for complete response
                "top_p": 0.8,  # Lower top_p to reduce creativity
                "repeat_penalty": 1.2,  # Penalize repetition
            }
        )
        
        # Extract JSON from response
        response_text = response['response'].strip()
        print(f"🤖 LLM raw response ({len(response_text)} chars): {response_text[:200]}...")
        
        # Try to find JSON in the response (handle markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', response_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'{.*}', response_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group(1) if '```' in response_text else json_match.group()
            print(f"🤖 Extracted JSON: {json_str[:200]}...")
            
            result = json.loads(json_str)
            print(f"🤖 Parsed {len([v for v in result.values() if v and str(v).lower() != 'null'])} non-null fields")
            
            # VALIDATION: Check if extracted values actually appear in OCR text
            ocr_upper = ocr_text.upper()
            validated_result = {}
            
            for key, value in result.items():
                if value and str(value).lower() != 'null':
                    value_str = str(value).upper()
                    
                    # Special validation rules
                    if key == "patientName":
                        # Name should appear near the top
                        first_200_chars = ocr_text[:200].upper()
                        if any(word in first_200_chars for word in value_str.split() if len(word) > 2):
                            validated_result[key] = value
                        else:
                            print(f"⚠️ Rejected {key}='{value}': not found in first 200 chars")
                            validated_result[key] = None
                    
                    elif key == "drugName":
                        # Drug name should appear in text (allow partial match for truncated names)
                        drug_words = value_str.split()
                        if len(drug_words) > 0:
                            first_word = drug_words[0]
                            # Check if first 5+ chars of drug name appear in text
                            if len(first_word) >= 5 and first_word[:5] in ocr_upper:
                                validated_result[key] = value
                            else:
                                print(f"⚠️ Rejected {key}='{value}': not found in OCR text")
                                validated_result[key] = None
                        else:
                            validated_result[key] = None
                    
                    elif key in ["strength", "dosage", "frequency", "duration", "quantity"]:
                        # These fields must have clear evidence in text
                        # Check if any significant word appears in OCR
                        significant_words = [w for w in value_str.split() if len(w) > 2]
                        if any(word in ocr_upper for word in significant_words):
                            validated_result[key] = value
                        else:
                            print(f"⚠️ Rejected {key}='{value}': no evidence in OCR text")
                            validated_result[key] = None
                    
                    elif key == "pharmacy":
                        # Pharmacy name should NOT be part of address
                        # Reject if it appears in a line with street indicators
                        if any(indicator in ocr_upper for indicator in ["DR,", "DRIVE", "STREET", "ST,", "AVE", "ROAD"]):
                            # Check if the pharmacy name is on same line as address
                            lines = ocr_text.upper().split('\n')
                            pharmacy_on_address_line = any(value_str in line and any(ind in line for ind in ["DR", "STREET", "AVE", "ROAD"]) for line in lines)
                            if pharmacy_on_address_line:
                                print(f"⚠️ Rejected {key}='{value}': appears to be part of address")
                                validated_result[key] = None
                            else:
                                validated_result[key] = value
                        else:
                            validated_result[key] = value
                    
                    else:
                        # Other fields: keep if they appear in text
                        if value_str in ocr_upper or any(word in ocr_upper for word in value_str.split() if len(word) > 3):
                            validated_result[key] = value
                        else:
                            validated_result[key] = None
                else:
                    validated_result[key] = None
            
            result = validated_result
            
            # Validate drug name against database if available
            if use_drug_db and relevant_drugs and result.get("drugName"):
                extracted_drug = result["drugName"].upper()
                # Find best match in database
                best_match = None
                best_score = 0
                for db_drug in relevant_drugs[:10]:
                    # Simple similarity check
                    db_upper = db_drug.upper()
                    if db_upper in extracted_drug or extracted_drug in db_upper:
                        score = min(len(db_upper), len(extracted_drug))
                        if score > best_score:
                            best_score = score
                            best_match = db_drug
                
                if best_match and best_score > 5:
                    print(f"✓ Drug name validated: {result['drugName']} → {best_match}")
                    result["drugName"] = best_match
            
            # Normalize the result
            normalized = {
                "patientName": result.get("patientName"),
                "drugName": result.get("drugName"),
                "strength": result.get("strength"),
                "dosage": result.get("dosage"),
                "frequency": result.get("frequency"),
                "duration": result.get("duration"),
                "instructions": result.get("instructions"),
                "rxNumber": result.get("rxNumber"),
                "quantity": result.get("quantity"),
                "refills": result.get("refills"),
                "refillsBeforeDate": result.get("refillsBeforeDate"),
                "pharmacy": result.get("pharmacy"),
                "pharmacyPhone": result.get("pharmacyPhone"),
                "confidence": 0.85  # LLM results typically have high confidence
            }
            
            # Clean up None values and "null" strings
            cleaned = {}
            for k, v in normalized.items():
                if v is not None and v != "null" and v != "":
                    cleaned[k] = v
            
            return cleaned
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


def hybrid_parse(ocr_text: str, regex_result: dict = None, confidence_threshold: float = 0.7, prefer_llm: bool = True) -> dict:
    """
    Hybrid parsing: Use LLM first if available, fall back to regex
    
    Args:
        ocr_text: Raw OCR text
        regex_result: Result from regex-based parsing (optional fallback)
        confidence_threshold: Minimum confidence to trust any result
        prefer_llm: If True, tries LLM first (recommended)
    
    Returns:
        Best parsing result
    """
    
    # Strategy 1: LLM-first (when available and preferred)
    if prefer_llm and is_ollama_available():
        print("🤖 Using LLM-first parsing strategy...")
        llm_result = parse_with_llm(ocr_text, use_drug_db=True)
        
        if "error" not in llm_result and llm_result:
            # Count how many fields were successfully extracted
            field_count = sum(1 for v in llm_result.values() if v and v != "null")
            
            if field_count >= 3:  # At least 3 fields extracted
                llm_conf = llm_result.get('confidence', 0.85)
                print(f"✓ LLM parsing successful ({field_count} fields extracted, {llm_conf:.1%} confidence)")
                return llm_result
            else:
                print(f"⚠ LLM extracted only {field_count} fields, trying fallback...")
        else:
            print(f"⚠ LLM parsing error: {llm_result.get('error', 'Unknown')}")
    
    # Strategy 2: Regex-first (legacy mode or LLM unavailable)
    if regex_result:
        regex_confidence = regex_result.get('confidence', 0) / 100.0
        
        # If regex parsing is good enough, use it
        if regex_confidence >= confidence_threshold:
            print(f"✓ Using regex parsing (confidence: {regex_confidence:.2%})")
            return regex_result
        
        print(f"⚠ Regex confidence low ({regex_confidence:.2%})")
        
        # Try LLM as fallback for low-confidence regex
        if is_ollama_available() and not prefer_llm:
            print("🤖 Trying LLM as fallback...")
            llm_result = parse_with_llm(ocr_text, use_drug_db=True)
            
            if "error" not in llm_result and llm_result:
                print("✓ LLM fallback successful")
                return llm_result
    
    # Final fallback
    if regex_result:
        print("⚠ Using regex result as final fallback")
        return regex_result
    
    print("❌ No parsing method succeeded")
    return {"error": "All parsing methods failed", "confidence": 0}
