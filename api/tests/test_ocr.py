import pytesseract
from PIL import Image, ImageDraw, ImageFont

# Create a simple test image with text
img = Image.new('RGB', (400, 100), color='white')
d = ImageDraw.Draw(img)

# Draw some text
d.text((10, 30), "PREDNISONE 20MG TAB", fill='black')
d.text((10, 50), "TAKE 1 TABLET DAILY", fill='black')

# Save it
img.save('test_image.png')
print("Created test_image.png")

# Try to OCR it
text = pytesseract.image_to_string(img)
print(f"\nExtracted text:\n{text}")
print(f"\nText length: {len(text)}")

if "PREDNISONE" in text or "TAKE" in text:
    print("\n✓ Tesseract is working!")
else:
    print("\n✗ Tesseract couldn't read the text")
