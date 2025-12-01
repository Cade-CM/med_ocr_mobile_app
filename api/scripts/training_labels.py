"""
Simple training data creator - Edit this file to add your prescription labels
"""
import json
from pathlib import Path

# ============================================
# EDIT YOUR PRESCRIPTION DATA BELOW
# ============================================

prescriptions = [
    {
        "image": "HYDROXYZINE_HCL.jpg",
        "patientName": "CADE MONTES",
        "drugName": "HYDROXYZINE HCL",
        "strength": "10MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 TO 8 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "3570300-03233",
        "quantity": "60",
        "refills": "3",
        "refillsBeforeDate": "12/08/20",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(281)357-0024"
    },
    {
        "image": "IMG_4509.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "CLINDAMYCIN",
        "strength": "300MG",
        "dosage": "1 CAPSULE",
        "frequency": "THREE TIMES DAILY",
        "duration": "10 DAYS",
        "rxNumber": "1363881-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4510.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "SULFAMETH/TRIMETHOPRIM",
        "strength": None,
        "dosage": "1 TABLET",
        "frequency": "TWICE A DAY",
        "duration": "10 DAYS",
        "rxNumber": "1302675-10613",
        "quantity": "20",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4511.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "HYDROXYZINE HCL",
        "strength": "10MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 12 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1319383-10613",
        "quantity": "60",
        "refills": "3",
        "refillsBeforeDate": "02/22/24",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4512.jpg",
        "patientName": "KALI MONTES",
        "drugName": "CEFDINIR",
        "strength": "300MG",
        "dosage": "1 CAPSULE",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "1390349-10613",
        "quantity": "20",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4513.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "HYDROCODONE/ACETAMINOPHEN",
        "strength": None,
        "dosage": "1 TABLET",
        "frequency": "EVERY 4 TO 6 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1354660-10613",
        "quantity": "20",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4514.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "ONDANSETRON ODT",
        "strength": "4MG",
        "dosage": "1 TABLET",
        "frequency": "THREE TIMES DAILY",
        "duration": "AS NEEDED",
        "rxNumber": "0698778-10613",
        "quantity": "10",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4522.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "ONDANSETRON ODT",
        "strength": "4MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1302788-10613",
        "quantity": "15",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4523.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "IBUPROFEN",
        "strength": "600MG",
        "dosage": "1 TABLET",
        "frequency": "THREE TIMES DAILY",
        "duration": None,
        "rxNumber": "1016929-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4525.jpg",
        "patientName": "CADE MONTES",
        "drugName": "PREDNISONE",
        "strength": "20MG",
        "dosage": "2 TABLETS",
        "frequency": "DAILY",
        "duration": "3 DAYS",
        "rxNumber": "1469348-10613",
        "quantity": "6",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4526.jpg",
        "patientName": "CHRISTOPHER MONTES",
        "drugName": "BROMPHEN/PSEUDO",
        "strength": None,
        "dosage": "10 ML",
        "frequency": "EVERY 4 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "3532990-075",
        "quantity": "240",
        "refills": "NO REFILLS",
        "refillsBeforeDate": "08/18/22",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": None
    },
    {
        "image": "IMG_4527.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "OFLOXACIN",
        "strength": "0.3%",
        "dosage": "2-3 DROPS",
        "frequency": "THREE TIMES DAILY",
        "duration": "7 DAYS",
        "rxNumber": "1132457-10613",
        "quantity": "5",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": None
    },
    {
        "image": "IMG_4528.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "PROMETHAZINE DM SYRUP",
        "strength": None,
        "dosage": "5 ML",
        "frequency": "FOUR TIMES DAILY",
        "duration": "UP TO 7 DAYS",
        "rxNumber": "1276504-10613",
        "quantity": "118",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4529.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "BROMPHEN/PSEUDO/DEXTRO",
        "strength": None,
        "dosage": "5 ML",
        "frequency": "FOUR TIMES DAILY",
        "duration": "UP TO 10 DAYS",
        "rxNumber": "1401984-10613",
        "quantity": "118",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4530.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "CARBAMAZEPINE",
        "strength": "300MG",
        "dosage": "2 CAPSULES",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "0972900-10613",
        "quantity": "120",
        "refills": "5",
        "refillsBeforeDate": "08/21/20",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4531.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "BACLOFEN",
        "strength": "10MG",
        "dosage": "2 TABLETS",
        "frequency": "MORNING 1 TABLET NOON 1 TABLET EVENING",
        "duration": None,
        "rxNumber": "0987609-10613",
        "quantity": "120",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4532.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "CARBAMAZEPINE",
        "strength": "200MG",
        "dosage": "2 CAPSULES",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "0868945-10613",
        "quantity": "100",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4533.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "NITROFURANTOIN MONO",
        "strength": None,
        "dosage": "1 CAPSULE",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "0784682-10613",
        "quantity": "14",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": None
    },
    {
        "image": "IMG_4535.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "METHOCARBAMOL",
        "strength": "500MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "0745753-10613",
        "quantity": "120",
        "refills": "2",
        "refillsBeforeDate": "10/21/17",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": None
    },
    {
        "image": "IMG_4536.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "PREGABALIN",
        "strength": "50MG",
        "dosage": "1 CAPSULE",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "0969518-10613",
        "quantity": "60",
        "refills": "1",
        "refillsBeforeDate": "02/04/20",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4537.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "THYROID NP 1GR",
        "strength": "60MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY DAY IN THE MORNING",
        "duration": None,
        "rxNumber": "0875768-10613",
        "quantity": "30",
        "refills": "1",
        "refillsBeforeDate": "07/05/19",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4539.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "BACLOFEN",
        "strength": "10MG",
        "dosage": "2 TABLETS",
        "frequency": "MORNING 1 TABLET NOON 1 TABLET EVENING",
        "duration": None,
        "rxNumber": "0987609-10613",
        "quantity": "120",
        "refills": "1",
        "refillsBeforeDate": "10/16/20",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4540.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "CITALOPRAM",
        "strength": "20MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY DAY",
        "duration": None,
        "rxNumber": "0986448-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4541.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "CARBAMAZEPINE",
        "strength": "300MG",
        "dosage": "2 CAPSULES",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "0972900-10613",
        "quantity": "120",
        "refills": "4",
        "refillsBeforeDate": "08/21/20",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4542.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "DESMOPRESSIN",
        "strength": "0.2MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY NIGHT AT BEDTIME",
        "duration": None,
        "rxNumber": "1126760-10613",
        "quantity": "30",
        "refills": "PARTIAL REFILL",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4543.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "TRAMADOL",
        "strength": "50MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1017084-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4544.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "CEFDINIR",
        "strength": "300MG",
        "dosage": "1 CAPSULE",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "1467472-10613",
        "quantity": "20",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4545.jpg",
        "patientName": "CADE MONTES",
        "drugName": "PROMETHAZINE",
        "strength": "25MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 TO 8 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1155144-10613",
        "quantity": "8",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4546.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "IBUPROFEN",
        "strength": "600MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 HOURS",
        "duration": "AS NEEDED",
        "rxNumber": "1425717-10613",
        "quantity": "28",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4547.jpg",
        "patientName": "KYAH MONTES",
        "drugName": "IBUPROFEN",
        "strength": "600MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 6 TO 8 HOURS WITH FOOD",
        "duration": "AS NEEDED",
        "rxNumber": "1302669-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "IMG_4548.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "CITALOPRAM",
        "strength": "20MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY DAY",
        "duration": None,
        "rxNumber": "1029129-10613",
        "quantity": "30",
        "refills": "3",
        "refillsBeforeDate": "03/23/21",
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "PREDNISONE.jpg",
        "patientName": "SHERRY MONTES",
        "drugName": "PREDNISONE",
        "strength": "20MG",
        "dosage": "1 TABLET",
        "frequency": "EVERY 12 HOURS WITH MEALS",
        "duration": "5 DAYS",
        "rxNumber": "1015000-10613",
        "quantity": "10",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "AMOXICILLIN.jpg",
        "patientName": "CAMERON MONTES",
        "drugName": "AMOXICILLIN",
        "strength": "500MG",
        "dosage": "1 CAPSULE",
        "frequency": "TWICE DAILY",
        "duration": None,
        "rxNumber": "1378169-10613",
        "quantity": "20",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "BENZONATATE(1).jpg",
        "patientName": "CADE MONTES",
        "drugName": "BENZONATATE",
        "strength": "100MG",
        "dosage": "2 CAPSULES",
        "frequency": "THREE TIMES DAILY",
        "duration": None,
        "rxNumber": "1448991-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": None
    },
    {
        "image": "BENZONATATE(2).jpg",
        "patientName": "CADE MONTES",
        "drugName": "BENZONATATE",
        "strength": "100MG",
        "dosage": "1 CAPSULE",
        "frequency": "THREE TIMES DAILY",
        "duration": "AS NEEDED",
        "rxNumber": "1463033-10613",
        "quantity": "30",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
    {
        "image": "DOXYCYCLINE_MONOHYDRATE.jpg",
        "patientName": "CADE MONTES",
        "drugName": "DOXYCYCLINE MONOHYDRATE",
        "strength": None,
        "dosage": "1 TABLET",
        "frequency": "TWICE DAILY",
        "duration": "7 DAYS",
        "rxNumber": "1399830-09574",
        "quantity": "14",
        "refills": "NO REFILLS",
        "refillsBeforeDate": None,
        "pharmacy": "WALGREENS",
        "pharmacyPhone": "(832)934-0415"
    },
]

# ============================================
# Don't edit below this line
# ============================================

def save_training_data():
    """Save the prescriptions to JSONL format"""
    output_dir = Path("C:\\Users\\cadem\\Desktop\\med_ocr_expo\\training_data")
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / "prescription_labels.jsonl"
    
    with open(output_file, 'w') as f:
        for rx in prescriptions:
            # Convert to training format
            training_example = {
                "image": str(output_dir / rx["image"]),
                "labels": {
                    "patientName": rx.get("patientName"),
                    "drugName": rx.get("drugName"),
                    "strength": rx.get("strength"),
                    "dosage": rx.get("dosage"),
                    "frequency": rx.get("frequency"),
                    "duration": rx.get("duration")
                }
            }
            f.write(json.dumps(training_example) + '\n')
    
    print(f"✓ Saved {len(prescriptions)} prescriptions to {output_file}")
    
    # Print statistics
    print("\n=== Statistics ===")
    fields = ["patientName", "drugName", "strength", "dosage", "frequency", "duration"]
    for field in fields:
        count = sum(1 for rx in prescriptions if rx.get(field))
        print(f"{field}: {count}/{len(prescriptions)} ({count/len(prescriptions)*100:.1f}%)")
    
    return output_file


def create_few_shot_prompt():
    """Create few-shot examples for the LLM prompt"""
    if len(prescriptions) == 0:
        print("No prescriptions to create examples from")
        return
    
    # Take first 3-5 examples
    examples = prescriptions[:min(5, len(prescriptions))]
    
    prompt_text = "Here are example prescription labels:\n\n"
    
    for i, rx in enumerate(examples, 1):
        prompt_text += f"Example {i}:\n"
        prompt_text += f"Patient: {rx.get('patientName', 'N/A')}\n"
        prompt_text += f"Drug: {rx.get('drugName', 'N/A')}\n"
        prompt_text += f"Strength: {rx.get('strength', 'N/A')}\n"
        prompt_text += f"Dosage: {rx.get('dosage', 'N/A')}\n"
        prompt_text += f"Frequency: {rx.get('frequency', 'N/A')}\n"
        prompt_text += f"Duration: {rx.get('duration', 'N/A')}\n\n"
    
    output_file = Path("C:\\Users\\cadem\\Desktop\\med_ocr_expo\\training_data") / "few_shot_prompt.txt"
    with open(output_file, 'w') as f:
        f.write(prompt_text)
    
    print(f"\n✓ Few-shot prompt saved to {output_file}")
    print("You can add this to llm_parser.py for better accuracy")
    
    return output_file


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "prompt":
        create_few_shot_prompt()
    else:
        save_training_data()
        print("\nRun with 'python training_labels.py prompt' to generate few-shot examples")
