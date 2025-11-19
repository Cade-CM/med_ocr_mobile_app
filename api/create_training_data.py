"""
Training Data Collection Script
Use this to prepare your 30 prescription images for model fine-tuning
"""
import os
import json
from pathlib import Path

TRAINING_DATA_DIR = "training_data"
OUTPUT_FILE = "prescription_labels.jsonl"

def collect_training_data():
    """
    Interactive script to label prescription images
    Creates JSONL file for fine-tuning
    """
    print("=== Prescription Label Training Data Collection ===\n")
    print(f"Place your prescription images in: {TRAINING_DATA_DIR}/")
    print("Supported formats: .jpg, .jpeg, .png\n")
    
    # Create directory if it doesn't exist
    Path(TRAINING_DATA_DIR).mkdir(exist_ok=True)
    
    # Get all images
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        image_files.extend(Path(TRAINING_DATA_DIR).glob(ext))
    
    if not image_files:
        print(f"No images found in {TRAINING_DATA_DIR}/")
        print("Please add your prescription images and run again.")
        return
    
    print(f"Found {len(image_files)} images\n")
    
    training_examples = []
    
    for i, image_path in enumerate(image_files, 1):
        print(f"\n--- Image {i}/{len(image_files)}: {image_path.name} ---")
        print("Please view the image and enter the information:\n")
        
        # Collect labels
        patient_name = input("Patient Name (or press Enter to skip): ").strip()
        drug_name = input("Drug Name: ").strip()
        strength = input("Strength (e.g., 20MG): ").strip()
        dosage = input("Dosage (e.g., 1 TABLET): ").strip()
        frequency = input("Frequency (e.g., EVERY 12 HOURS): ").strip()
        duration = input("Duration (e.g., 5 DAYS): ").strip()
        
        # Create training example
        example = {
            "image": str(image_path),
            "labels": {
                "patientName": patient_name or None,
                "drugName": drug_name or None,
                "strength": strength or None,
                "dosage": dosage or None,
                "frequency": frequency or None,
                "duration": duration or None
            }
        }
        
        training_examples.append(example)
        
        print(f"✓ Saved data for {image_path.name}")
    
    # Save to JSONL file
    output_path = Path(TRAINING_DATA_DIR) / OUTPUT_FILE
    with open(output_path, 'w') as f:
        for example in training_examples:
            f.write(json.dumps(example) + '\n')
    
    print(f"\n✓ Training data saved to: {output_path}")
    print(f"✓ Total examples: {len(training_examples)}")
    
    # Print statistics
    print("\n=== Statistics ===")
    fields = ["patientName", "drugName", "strength", "dosage", "frequency", "duration"]
    for field in fields:
        count = sum(1 for ex in training_examples if ex["labels"].get(field))
        print(f"{field}: {count}/{len(training_examples)} ({count/len(training_examples)*100:.1f}%)")
    
    print("\nNext steps:")
    print("1. Review the generated file for accuracy")
    print("2. Use this data to create few-shot examples for Ollama")
    print("3. Or use it for fine-tuning a custom model")


def create_few_shot_examples(max_examples=5):
    """
    Create few-shot examples from training data to improve LLM prompts
    """
    jsonl_path = Path(TRAINING_DATA_DIR) / OUTPUT_FILE
    
    if not jsonl_path.exists():
        print(f"Training data file not found: {jsonl_path}")
        print("Run collect_training_data() first.")
        return
    
    examples = []
    with open(jsonl_path, 'r') as f:
        for line in f:
            examples.append(json.loads(line))
    
    # Take first N examples
    few_shot = examples[:max_examples]
    
    output_file = Path(TRAINING_DATA_DIR) / "few_shot_examples.txt"
    with open(output_file, 'w') as f:
        f.write("# Few-Shot Examples for LLM Prompt\n")
        f.write("# Add these to your prompt for better accuracy\n\n")
        
        for i, ex in enumerate(few_shot, 1):
            f.write(f"Example {i}:\n")
            f.write(f"Image: {ex['image']}\n")
            f.write("Labels:\n")
            f.write(json.dumps(ex['labels'], indent=2))
            f.write("\n\n---\n\n")
    
    print(f"✓ Few-shot examples saved to: {output_file}")
    print(f"You can add these examples to llm_parser.py prompt for better results")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "few-shot":
        create_few_shot_examples()
    else:
        collect_training_data()
