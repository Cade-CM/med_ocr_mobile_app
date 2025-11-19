"""
Test script for backend API endpoints
Run this to verify your backend is working correctly
"""

import requests
import json
from datetime import datetime

# Update this to your backend URL
BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print("❌ Health check failed")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_create_medication():
    """Test creating a medication"""
    print("\n" + "="*60)
    print("Testing Create Medication")
    print("="*60)
    
    medication = {
        "id": "test_med_001",
        "drugName": "AMOXICILLIN",
        "strength": "500MG",
        "dosage": "1 CAPSULE",
        "frequency": "THREE TIMES DAILY",
        "patientName": "TEST PATIENT",
        "rxNumber": "TEST-12345",
        "pharmacy": "TEST PHARMACY",
        "startDate": datetime.now().isoformat(),
        "reminderTimes": [
            datetime.now().isoformat(),
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/medications",
            json=medication,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Medication created successfully")
            return True
        else:
            print("❌ Failed to create medication")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_medications():
    """Test getting all medications"""
    print("\n" + "="*60)
    print("Testing Get All Medications")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/medications")
        print(f"Status Code: {response.status_code}")
        
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Count: {data.get('count')}")
        
        if data.get('medications'):
            print(f"\nMedications:")
            for med in data['medications']:
                print(f"  - {med.get('drugName')} ({med.get('id')})")
        
        if response.status_code == 200:
            print("✅ Retrieved medications successfully")
            return True
        else:
            print("❌ Failed to retrieve medications")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_single_medication():
    """Test getting a single medication"""
    print("\n" + "="*60)
    print("Testing Get Single Medication")
    print("="*60)
    
    med_id = "test_med_001"
    
    try:
        response = requests.get(f"{BASE_URL}/api/medications/{med_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            print("✅ Retrieved medication successfully")
            return True
        elif response.status_code == 404:
            print("⚠️ Medication not found (this is OK if you haven't created it yet)")
            return True
        else:
            print("❌ Failed to retrieve medication")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_update_medication():
    """Test updating a medication"""
    print("\n" + "="*60)
    print("Testing Update Medication")
    print("="*60)
    
    medication = {
        "id": "test_med_001",
        "drugName": "AMOXICILLIN",
        "strength": "500MG",
        "dosage": "2 CAPSULES",  # Changed from 1 to 2
        "frequency": "THREE TIMES DAILY",
        "patientName": "TEST PATIENT",
        "rxNumber": "TEST-12345",
        "pharmacy": "TEST PHARMACY",
        "startDate": datetime.now().isoformat(),
        "reminderTimes": [
            datetime.now().isoformat(),
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/medications",
            json=medication,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Action: {data.get('action')}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get('action') == 'updated':
            print("✅ Medication updated successfully")
            return True
        else:
            print("❌ Failed to update medication")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_delete_medication():
    """Test deleting a medication"""
    print("\n" + "="*60)
    print("Testing Delete Medication")
    print("="*60)
    
    med_id = "test_med_001"
    
    try:
        response = requests.delete(f"{BASE_URL}/api/medications/{med_id}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Medication deleted successfully")
            return True
        else:
            print("❌ Failed to delete medication")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_adherence():
    """Test adherence endpoints"""
    print("\n" + "="*60)
    print("Testing Adherence Endpoints")
    print("="*60)
    
    record = {
        "id": "test_adherence_001",
        "medicationId": "test_med_001",
        "scheduledTime": datetime.now().isoformat(),
        "status": "taken",
        "takenTime": datetime.now().isoformat()
    }
    
    try:
        # Create adherence record
        response = requests.post(
            f"{BASE_URL}/api/adherence",
            json=record,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Create - Status Code: {response.status_code}")
        
        # Get adherence records
        response = requests.get(f"{BASE_URL}/api/adherence")
        print(f"Get - Status Code: {response.status_code}")
        
        data = response.json()
        print(f"Count: {data.get('count')}")
        
        if response.status_code == 200:
            print("✅ Adherence endpoints working")
            return True
        else:
            print("❌ Adherence endpoints failed")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("Backend API Test Suite")
    print(f"Base URL: {BASE_URL}")
    print("="*60)
    
    results = {
        "Health Check": test_health(),
        "Create Medication": test_create_medication(),
        "Get All Medications": test_get_medications(),
        "Get Single Medication": test_get_single_medication(),
        "Update Medication": test_update_medication(),
        "Adherence": test_adherence(),
        "Delete Medication": test_delete_medication(),
    }
    
    print("\n" + "="*60)
    print("Test Results Summary")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print("\n" + "="*60)
    print(f"Total: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    print("="*60)

if __name__ == "__main__":
    run_all_tests()
