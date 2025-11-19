"""
Add pharmacy and pharmacyPhone fields to all prescriptions
"""
import json

# Read the file
with open('training_labels.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the prescriptions array
new_lines = []
inside_prescription = False
just_added_refills_before_date = False

for i, line in enumerate(lines):
    new_lines.append(line)
    
    # Check if we just added a refillsBeforeDate line
    if '"refillsBeforeDate":' in line:
        just_added_refills_before_date = True
    # If next line is a closing brace and we just saw refillsBeforeDate, add fields
    elif just_added_refills_before_date and line.strip() == '},' or line.strip() == '}':
        # Remove the line we just added (the closing brace)
        new_lines.pop()
        # Add the fields before the closing brace
        new_lines.append('        "pharmacy": None,\n')
        new_lines.append('        "pharmacyPhone": None\n')
        new_lines.append(line)  # Add back the closing brace
        just_added_refills_before_date = False
    else:
        just_added_refills_before_date = False

# Write back
with open('training_labels.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Added pharmacy and pharmacyPhone fields to all prescriptions")

# Verify
with open('training_labels.py', 'r', encoding='utf-8') as f:
    content = f.read()
    
total = content.count('"image":')
has_pharmacy = content.count('"pharmacy":')
has_phone = content.count('"pharmacyPhone":')

print(f"Total entries: {total}")
print(f"With pharmacy: {has_pharmacy}")
print(f"With pharmacyPhone: {has_phone}")

if has_pharmacy == total and has_phone == total:
    print("SUCCESS!")
