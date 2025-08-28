import requests
import json
from datetime import datetime

class FamilyMemberDebugTester:
    def __init__(self, base_url="https://family-budget-18.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.master_token = None
        self.master_user_id = None
        self.family_member_email = None
        self.family_member_token = None

    def make_request(self, method, endpoint, data=None, token=None):
        """Make API request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            return response.status_code, response.json() if response.content else {}
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None, {}

    def setup_master_account(self):
        """Create and setup master account with family profile"""
        print("🔧 Setting up master account...")
        
        # Create master user
        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "email": f"debug_master_{timestamp}@example.com",
            "password": "MasterPass123!",
            "first_name": "Debug",
            "last_name": "Master"
        }
        
        status, response = self.make_request('POST', 'signup', signup_data)
        if status != 200:
            print(f"❌ Master signup failed: {response}")
            return False
        
        self.master_token = response['access_token']
        self.master_user_id = response['user']['id']
        print(f"✅ Master account created: {signup_data['email']}")
        
        # Create family profile
        profile_data = {
            "first_name": "Debug",
            "last_name": "Master",
            "currency": "USD",
            "country": "USA",
            "account_type": "family",
            "monthly_income": 5000.0
        }
        
        status, response = self.make_request('POST', 'profile', profile_data, self.master_token)
        if status != 200:
            print(f"❌ Profile creation failed: {response}")
            return False
        
        print(f"✅ Family profile created with ID: {response['id']}")
        return True

    def test_family_member_creation_detailed(self):
        """Test family member creation with detailed verification"""
        print("\n🔍 Testing family member creation endpoint directly...")
        
        timestamp = datetime.now().strftime('%H%M%S')
        self.family_member_email = f"debug_family_{timestamp}@example.com"
        
        family_member_data = {
            "email": self.family_member_email,
            "first_name": "Debug",
            "last_name": "Family",
            "relation": "spouse"
        }
        
        # Create family member
        status, response = self.make_request('POST', 'family-members', family_member_data, self.master_token)
        
        if status != 200:
            print(f"❌ Family member creation failed: {response}")
            return False
        
        print(f"✅ Family member creation response: {json.dumps(response, indent=2)}")
        
        # Verify the response contains expected fields
        expected_fields = ['message', 'family_member', 'credentials']
        missing_fields = [field for field in expected_fields if field not in response]
        
        if missing_fields:
            print(f"❌ Missing fields in response: {missing_fields}")
            return False
        
        # Check family member details
        family_member = response['family_member']
        if not family_member.get('user_id'):
            print("❌ Family member missing user_id - account not created!")
            return False
        
        print(f"✅ Family member user_id: {family_member['user_id']}")
        print(f"✅ Family member is_registered: {family_member['is_registered']}")
        
        # Check credentials
        credentials = response['credentials']
        if credentials.get('default_password') != 'Artheeti1':
            print(f"❌ Wrong default password: {credentials.get('default_password')}")
            return False
        
        if not credentials.get('must_change_password'):
            print("❌ must_change_password not set to True")
            return False
        
        print("✅ Credentials are correct")
        return True

    def test_family_member_login_verification(self):
        """Test family member login with default credentials"""
        print("\n🔍 Testing family member login with default credentials...")
        
        if not self.family_member_email:
            print("❌ No family member email available")
            return False
        
        login_data = {
            "email": self.family_member_email,
            "password": "Artheeti1"
        }
        
        status, response = self.make_request('POST', 'login', login_data)
        
        if status != 200:
            print(f"❌ Family member login failed: {response}")
            return False
        
        print(f"✅ Family member login successful")
        
        # Verify login response
        user_data = response.get('user', {})
        
        # Check required fields
        required_checks = [
            ('is_family_member', True),
            ('must_change_password', True),
            ('family_relation', 'spouse')
        ]
        
        for field, expected_value in required_checks:
            actual_value = user_data.get(field)
            if actual_value != expected_value:
                print(f"❌ {field}: expected {expected_value}, got {actual_value}")
                return False
            print(f"✅ {field}: {actual_value}")
        
        self.family_member_token = response['access_token']
        return True

    def test_duplicate_email_prevention(self):
        """Test that system prevents duplicate emails"""
        print("\n🔍 Testing duplicate email prevention...")
        
        # Try to create another family member with same email
        duplicate_data = {
            "email": self.family_member_email,
            "first_name": "Duplicate",
            "last_name": "User",
            "relation": "child"
        }
        
        status, response = self.make_request('POST', 'family-members', duplicate_data, self.master_token)
        
        if status == 400 and 'already registered' in response.get('detail', '').lower():
            print("✅ Duplicate email correctly rejected")
            return True
        else:
            print(f"❌ Duplicate email not properly handled: {status} - {response}")
            return False

    def test_existing_user_email_prevention(self):
        """Test that family member can't be created with existing user email"""
        print("\n🔍 Testing prevention of using existing user email...")
        
        # First create a regular user
        timestamp = datetime.now().strftime('%H%M%S')
        existing_user_email = f"existing_user_{timestamp}@example.com"
        
        signup_data = {
            "email": existing_user_email,
            "password": "ExistingPass123!",
            "first_name": "Existing",
            "last_name": "User"
        }
        
        status, response = self.make_request('POST', 'signup', signup_data)
        if status != 200:
            print(f"❌ Failed to create existing user: {response}")
            return False
        
        print(f"✅ Created existing user: {existing_user_email}")
        
        # Now try to create family member with same email
        family_data = {
            "email": existing_user_email,
            "first_name": "Family",
            "last_name": "Member",
            "relation": "child"
        }
        
        status, response = self.make_request('POST', 'family-members', family_data, self.master_token)
        
        if status == 400 and 'already registered' in response.get('detail', '').lower():
            print("✅ Existing user email correctly rejected for family member")
            return True
        else:
            print(f"❌ Existing user email not properly handled: {status} - {response}")
            return False

    def test_password_change_flow(self):
        """Test the complete password change flow"""
        print("\n🔍 Testing family member password change flow...")
        
        if not self.family_member_token:
            print("❌ No family member token available")
            return False
        
        # Change password
        password_data = {
            "current_password": "Artheeti1",
            "new_password": "NewFamilyPass123!"
        }
        
        status, response = self.make_request('POST', 'change-password', password_data, self.family_member_token)
        
        if status != 200:
            print(f"❌ Password change failed: {response}")
            return False
        
        print("✅ Password changed successfully")
        
        # Test login with new password
        login_data = {
            "email": self.family_member_email,
            "password": "NewFamilyPass123!"
        }
        
        status, response = self.make_request('POST', 'login', login_data)
        
        if status != 200:
            print(f"❌ Login with new password failed: {response}")
            return False
        
        # Check that must_change_password is now False
        user_data = response.get('user', {})
        if user_data.get('must_change_password') != False:
            print(f"❌ must_change_password not cleared: {user_data.get('must_change_password')}")
            return False
        
        print("✅ Login with new password successful, must_change_password cleared")
        return True

    def test_family_member_database_verification(self):
        """Verify family member appears in family list"""
        print("\n🔍 Verifying family member in database via API...")
        
        # Get family members list
        status, response = self.make_request('GET', 'family-members', token=self.master_token)
        
        if status != 200:
            print(f"❌ Failed to get family members: {response}")
            return False
        
        if not isinstance(response, list):
            print(f"❌ Family members response is not a list: {type(response)}")
            return False
        
        print(f"✅ Found {len(response)} family members:")
        
        family_member_found = False
        for member in response:
            print(f"  - {member.get('name')} ({member.get('email')}) - {member.get('relation')} - Master: {member.get('is_master')}")
            if member.get('email') == self.family_member_email:
                family_member_found = True
        
        if not family_member_found:
            print(f"❌ Family member {self.family_member_email} not found in list")
            return False
        
        print("✅ Family member correctly appears in family list")
        return True

def main():
    print("🚀 Family Member Account Creation Debug Test")
    print("=" * 60)
    
    tester = FamilyMemberDebugTester()
    
    # Test sequence focusing on the specific issues mentioned
    tests = [
        ("Setup Master Account", tester.setup_master_account),
        ("🔥 Family Member Creation (Detailed)", tester.test_family_member_creation_detailed),
        ("🔥 Family Member Login Verification", tester.test_family_member_login_verification),
        ("🔥 Duplicate Email Prevention", tester.test_duplicate_email_prevention),
        ("🔥 Existing User Email Prevention", tester.test_existing_user_email_prevention),
        ("🔥 Password Change Flow", tester.test_password_change_flow),
        ("🔥 Database Verification", tester.test_family_member_database_verification)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} FAILED")
            else:
                print(f"✅ {test_name} PASSED")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 DEBUG TEST SUMMARY")
    print("=" * 60)
    print(f"Tests run: {len(tests)}")
    print(f"Tests passed: {len(tests) - len(failed_tests)}")
    print(f"Tests failed: {len(failed_tests)}")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        print("\n🔍 ISSUES FOUND:")
        for test in failed_tests:
            print(f"  - {test}")
        return 1
    else:
        print("\n✅ ALL DEBUG TESTS PASSED!")
        print("\n🎉 FAMILY MEMBER ACCOUNT CREATION IS WORKING CORRECTLY")
        print("\nKey findings:")
        print("  ✅ Family member accounts are created successfully")
        print("  ✅ Default password 'Artheeti1' is set correctly")
        print("  ✅ must_change_password flag is set to True")
        print("  ✅ Login with default credentials works")
        print("  ✅ Password change flow works and clears the flag")
        print("  ✅ Duplicate email prevention works")
        print("  ✅ Family members appear in database/API correctly")
        return 0

if __name__ == "__main__":
    exit(main())