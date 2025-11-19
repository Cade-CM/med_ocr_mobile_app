"""Test Ollama connection"""
import ollama

try:
    print("Testing Ollama connection...")
    models = ollama.list()
    print("Response type:", type(models))
    print("Response:", models)
    
    if hasattr(models, 'models'):
        print("\nModels found:", len(models.models))
        for model in models.models:
            print(f"  - {model.model}")
    
    print("\n✓ Ollama is working!")
    
    # Test a simple generation
    print("\nTesting text generation...")
    response = ollama.generate(
        model='llama3.2:1b',
        prompt='Say "Hello" in one word.',
        options={'num_predict': 5}
    )
    print("Response:", response['response'])
    print("\n✓ Text generation working!")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
