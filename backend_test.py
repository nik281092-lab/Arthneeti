import requests
import sys
import json
from datetime import datetime

class BudgetTrackerAPITester:
    def __init__(self, base_url="https://family-budget-18.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.profile_id = None
        self.category_id = None
        self.tests_run = 0
        self.tests_passed = 0
        # Family testing variables
        self.family_member_token = None
        self.family_member_id = None
        self.family_member_email = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_signup(self):
        """Test user signup"""
        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        success, response = self.run_test(
            "User Signup",
            "POST",
            "signup",
            200,
            data=signup_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": "test@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Login (if exists)",
            "POST", 
            "login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "me",
            200
        )
        return success

    def test_create_profile(self):
        """Test profile creation with family mode"""
        profile_data = {
            "first_name": "Master",
            "last_name": "User",
            "currency": "USD",
            "bank_account": "1234567890",
            "address": "123 Test Street",
            "country": "USA",
            "account_type": "family",  # Changed to family for testing
            "monthly_income": 5000.0
        }
        
        success, response = self.run_test(
            "Create Profile (Family Mode)",
            "POST",
            "profile",
            200,
            data=profile_data
        )
        
        if success and 'id' in response:
            self.profile_id = response['id']
            print(f"   Profile created with account_type: {response.get('account_type')}")
            return True
        return False

    def test_get_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get Profile",
            "GET",
            "profile",
            200
        )
        return success

    def test_get_categories(self):
        """Test getting categories - CRITICAL for dropdown issue"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            if len(response) > 0:
                self.category_id = response[0]['id']
                print(f"   Sample category: {response[0]['name']} ({response[0]['type']})")
                
                # Check if we have all expected categories
                category_names = [cat['name'] for cat in response]
                expected_categories = [
                    "Grocery", "Rent", "Petrol", "Monthly bills", "Medical",
                    "Entertainment", "Fashion and Clothing", "Food And Restaurant",
                    "Investment/Savings", "Insurance", "Donation"
                ]
                
                missing_categories = [cat for cat in expected_categories if cat not in category_names]
                if missing_categories:
                    print(f"   ⚠️  Missing categories: {missing_categories}")
                else:
                    print(f"   ✅ All expected categories found")
                    
            return True
        return False

    def test_create_transaction(self):
        """Test creating a transaction"""
        if not self.category_id:
            print("   ⚠️  No category ID available, skipping transaction test")
            return False
            
        transaction_data = {
            "amount": 100.50,
            "transaction_type": "expense",
            "category_id": self.category_id,
            "person_name": "Test User",
            "payment_mode": "online",
            "bank_app": "Test Bank",
            "description": "Test transaction",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data=transaction_data
        )
        return success

    def test_get_transactions(self):
        """Test getting user transactions"""
        success, response = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} transactions")
        return success

    def test_dashboard(self):
        """Test dashboard data - includes CFR analysis"""
        success, response = self.run_test(
            "Get Dashboard",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            # Check CFR analysis
            if 'cfr_analysis' in response:
                cfr_data = response['cfr_analysis']
                print(f"   CFR Analysis found with {len(cfr_data)} categories")
                for analysis in cfr_data:
                    print(f"     {analysis['category_type']}: {analysis['recommended_percentage']}% recommended")
            
            # Check other dashboard components
            dashboard_keys = ['total_income', 'total_expenses', 'balance', 'monthly_income']
            for key in dashboard_keys:
                if key in response:
                    print(f"   {key}: {response[key]}")
                    
        return success

    def test_filtered_transactions_month(self):
        """Test filtered transactions by month - CRITICAL FIX"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        success, response = self.run_test(
            "Filtered Transactions (Month)",
            "GET",
            f"transactions/filtered?filter_type=month&year={current_year}&month={current_month}",
            200
        )
        
        if success:
            if 'transactions' in response:
                print(f"   Found {len(response['transactions'])} transactions for {current_year}-{current_month:02d}")
                if 'filter_applied' in response:
                    print(f"   Filter applied: {response['filter_applied']}")
            else:
                print("   ⚠️  Response missing 'transactions' key")
                return False
        return success

    def test_filtered_transactions_week(self):
        """Test filtered transactions by week - CRITICAL FIX"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        success, response = self.run_test(
            "Filtered Transactions (Week)",
            "GET",
            f"transactions/filtered?filter_type=week&year={current_year}&month={current_month}&week=1",
            200
        )
        
        if success:
            if 'transactions' in response:
                print(f"   Found {len(response['transactions'])} transactions for week 1 of {current_year}-{current_month:02d}")
            else:
                print("   ⚠️  Response missing 'transactions' key")
                return False
        return success

    def test_filtered_transactions_day(self):
        """Test filtered transactions by day - CRITICAL FIX"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        current_day = datetime.now().day
        
        success, response = self.run_test(
            "Filtered Transactions (Day)",
            "GET",
            f"transactions/filtered?filter_type=day&year={current_year}&month={current_month}&day={current_day}",
            200
        )
        
        if success:
            if 'transactions' in response:
                print(f"   Found {len(response['transactions'])} transactions for {current_year}-{current_month:02d}-{current_day:02d}")
            else:
                print("   ⚠️  Response missing 'transactions' key")
                return False
        return success

    def test_filtered_transactions_different_years(self):
        """Test filtered transactions with different years - Edge case testing"""
        test_years = [2023, 2024, 2025]
        
        for year in test_years:
            success, response = self.run_test(
                f"Filtered Transactions (Year {year})",
                "GET",
                f"transactions/filtered?filter_type=month&year={year}&month=1",
                200
            )
            
            if not success:
                print(f"   ❌ Failed for year {year}")
                return False
            else:
                print(f"   ✅ Year {year} filter working")
        
        return True

    def test_profile_update(self):
        """Test profile update functionality"""
        if not self.profile_id:
            print("   ⚠️  No profile ID available, skipping profile update test")
            return False
            
        update_data = {
            "first_name": "Updated",
            "last_name": "User",
            "currency": "EUR",
            "bank_account": "9876543210",
            "address": "456 Updated Street",
            "country": "Germany",
            "account_type": "individual",
            "monthly_income": 6000.0
        }
        
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data=update_data
        )
        return success

    def test_change_password(self):
        """Test password change functionality"""
        password_data = {
            "current_password": "TestPass123!",
            "new_password": "NewTestPass456!"
        }
        
        success, response = self.run_test(
            "Change Password",
            "POST",
            "change-password",
            200,
            data=password_data
        )
        return success

    # ===== FAMILY MEMBER MANAGEMENT TESTS =====
    
    def test_enhanced_login_response(self):
        """Test that login response includes family member fields"""
        # First create a test user to login with
        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "email": f"login_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "first_name": "Login",
            "last_name": "Test"
        }
        
        # Signup first
        success, response = self.run_test(
            "Signup for Login Test",
            "POST",
            "signup",
            200,
            data=signup_data
        )
        
        if not success:
            return False
            
        # Now test login response
        login_data = {
            "email": signup_data["email"],
            "password": signup_data["password"]
        }
        
        success, response = self.run_test(
            "Enhanced Login Response",
            "POST",
            "login",
            200,
            data=login_data
        )
        
        if success:
            user_data = response.get('user', {})
            expected_fields = ['is_family_member', 'must_change_password', 'family_relation']
            missing_fields = [field for field in expected_fields if field not in user_data]
            
            if missing_fields:
                print(f"   ❌ Missing fields in login response: {missing_fields}")
                return False
            else:
                print(f"   ✅ All family fields present: is_family_member={user_data['is_family_member']}, must_change_password={user_data['must_change_password']}")
                return True
        return False

    def test_add_family_member(self):
        """Test adding a family member"""
        if not self.token:
            print("   ⚠️  No authentication token, skipping family member test")
            return False
            
        timestamp = datetime.now().strftime('%H%M%S')
        self.family_member_email = f"family_member_{timestamp}@example.com"
        
        family_member_data = {
            "email": self.family_member_email,
            "first_name": "Family",
            "last_name": "Member",
            "relation": "spouse"
        }
        
        success, response = self.run_test(
            "Add Family Member",
            "POST",
            "family-members",
            200,
            data=family_member_data
        )
        
        if success:
            if 'credentials' in response:
                credentials = response['credentials']
                print(f"   ✅ Family member created with default password: {credentials.get('default_password')}")
                print(f"   Must change password: {credentials.get('must_change_password')}")
                return True
            else:
                print("   ❌ Missing credentials in response")
                return False
        return False

    def test_family_member_first_login(self):
        """Test family member first-time login flow"""
        if not self.family_member_email:
            print("   ⚠️  No family member email, skipping first login test")
            return False
            
        login_data = {
            "email": self.family_member_email,
            "password": "Artheeti1"  # Default password
        }
        
        success, response = self.run_test(
            "Family Member First Login",
            "POST",
            "login",
            200,
            data=login_data
        )
        
        if success:
            user_data = response.get('user', {})
            if user_data.get('must_change_password') == True and user_data.get('is_family_member') == True:
                print(f"   ✅ Family member login successful with must_change_password=True")
                self.family_member_token = response['access_token']
                self.family_member_id = user_data['id']
                return True
            else:
                print(f"   ❌ Unexpected login response: must_change_password={user_data.get('must_change_password')}, is_family_member={user_data.get('is_family_member')}")
                return False
        return False

    def test_family_member_password_change(self):
        """Test family member password change"""
        if not self.family_member_token:
            print("   ⚠️  No family member token, skipping password change test")
            return False
            
        # Temporarily switch to family member token
        original_token = self.token
        self.token = self.family_member_token
        
        password_data = {
            "current_password": "Artheeti1",
            "new_password": "NewFamilyPass123!"
        }
        
        success, response = self.run_test(
            "Family Member Password Change",
            "POST",
            "change-password",
            200,
            data=password_data
        )
        
        # Restore original token
        self.token = original_token
        
        if success:
            print("   ✅ Family member password changed successfully")
            return True
        return False

    def test_get_family_members(self):
        """Test getting family members list"""
        success, response = self.run_test(
            "Get Family Members",
            "GET",
            "family-members",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} family members")
            for member in response:
                print(f"     - {member.get('name')} ({member.get('relation')}) - Master: {member.get('is_master', False)}")
            return True
        return False

    def test_get_family_status(self):
        """Test getting family status"""
        success, response = self.run_test(
            "Get Family Status",
            "GET",
            "profile/family-status",
            200
        )
        
        if success:
            expected_fields = ['is_family_member', 'is_master', 'can_add_family_members', 'can_change_to_individual']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ❌ Missing fields in family status: {missing_fields}")
                return False
            else:
                print(f"   ✅ Family status: is_master={response['is_master']}, can_add_family_members={response['can_add_family_members']}")
                return True
        return False

    def test_family_member_profile_restriction(self):
        """Test that family members cannot change to individual mode"""
        if not self.family_member_token:
            print("   ⚠️  No family member token, skipping profile restriction test")
            return False
            
        # Temporarily switch to family member token
        original_token = self.token
        self.token = self.family_member_token
        
        # Try to create/update profile with individual mode
        profile_data = {
            "first_name": "Family",
            "last_name": "Member",
            "currency": "USD",
            "country": "USA",
            "account_type": "individual",  # This should be rejected
            "monthly_income": 3000.0
        }
        
        success, response = self.run_test(
            "Family Member Profile Restriction",
            "PUT",
            "profile",
            403,  # Should be forbidden
            data=profile_data
        )
        
        # Restore original token
        self.token = original_token
        
        if success:
            print("   ✅ Family member correctly restricted from changing to individual mode")
            return True
        return False

    def test_shared_transaction_access(self):
        """Test that family members can access shared transactions"""
        if not self.family_member_token:
            print("   ⚠️  No family member token, skipping shared transaction test")
            return False
            
        # First create a transaction as master user
        if not self.category_id:
            print("   ⚠️  No category ID available, skipping shared transaction test")
            return False
            
        transaction_data = {
            "amount": 250.75,
            "transaction_type": "expense",
            "category_id": self.category_id,
            "person_name": "Master User",
            "payment_mode": "credit_card",
            "description": "Master transaction for family sharing",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Master Transaction",
            "POST",
            "transactions",
            200,
            data=transaction_data
        )
        
        if not success:
            return False
            
        master_transaction_id = response.get('id')
        
        # Now switch to family member and try to access transactions
        original_token = self.token
        self.token = self.family_member_token
        
        success, response = self.run_test(
            "Family Member Access Shared Transactions",
            "GET",
            "transactions",
            200
        )
        
        if success and isinstance(response, list):
            # Check if family member can see the master's transaction
            master_transaction_found = any(t.get('id') == master_transaction_id for t in response)
            if master_transaction_found:
                print("   ✅ Family member can access master's transactions")
                
                # Test family member creating a transaction
                family_transaction_data = {
                    "amount": 75.50,
                    "transaction_type": "expense",
                    "category_id": self.category_id,
                    "person_name": "Family Member",
                    "payment_mode": "debit_card",
                    "description": "Family member transaction",
                    "date": datetime.now().strftime('%Y-%m-%d')
                }
                
                success2, response2 = self.run_test(
                    "Family Member Create Transaction",
                    "POST",
                    "transactions",
                    200,
                    data=family_transaction_data
                )
                
                # Restore original token
                self.token = original_token
                
                if success2:
                    print("   ✅ Family member can create shared transactions")
                    return True
                else:
                    return False
            else:
                print("   ❌ Family member cannot see master's transactions")
                self.token = original_token
                return False
        else:
            self.token = original_token
            return False

    def test_family_dashboard_sharing(self):
        """Test that family members see shared dashboard data"""
        if not self.family_member_token:
            print("   ⚠️  No family member token, skipping family dashboard test")
            return False
            
        # Get dashboard as master user first
        success1, master_dashboard = self.run_test(
            "Master Dashboard",
            "GET",
            "dashboard",
            200
        )
        
        if not success1:
            return False
            
        # Now get dashboard as family member
        original_token = self.token
        self.token = self.family_member_token
        
        success2, family_dashboard = self.run_test(
            "Family Member Dashboard",
            "GET",
            "dashboard",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success2:
            # Compare key metrics - they should be the same for shared family data
            master_income = master_dashboard.get('total_income', 0)
            family_income = family_dashboard.get('total_income', 0)
            master_expenses = master_dashboard.get('total_expenses', 0)
            family_expenses = family_dashboard.get('total_expenses', 0)
            
            if master_income == family_income and master_expenses == family_expenses:
                print(f"   ✅ Family dashboard shows shared data: Income={family_income}, Expenses={family_expenses}")
                return True
            else:
                print(f"   ❌ Dashboard data mismatch: Master({master_income}, {master_expenses}) vs Family({family_income}, {family_expenses})")
                return False
        return False

    def test_access_control_family_members(self):
        """Test that only master users can add family members"""
        if not self.family_member_token:
            print("   ⚠️  No family member token, skipping access control test")
            return False
            
        # Try to add family member as a family member (should fail)
        original_token = self.token
        self.token = self.family_member_token
        
        timestamp = datetime.now().strftime('%H%M%S')
        family_member_data = {
            "email": f"unauthorized_member_{timestamp}@example.com",
            "first_name": "Unauthorized",
            "last_name": "Member",
            "relation": "child"
        }
        
        success, response = self.run_test(
            "Family Member Tries to Add Member (Should Fail)",
            "POST",
            "family-members",
            403,  # Should be forbidden
            data=family_member_data
        )
        
        # Restore original token
        self.token = original_token
        
        if success:
            print("   ✅ Access control working: Family members cannot add other family members")
            return True
        return False

def main():
    print("🚀 Starting Budget Tracker API Tests")
    print("=" * 50)
    
    tester = BudgetTrackerAPITester()
    
    # Test sequence - Focus on family member management functionality
    tests = [
        ("Signup", tester.test_signup),
        ("Get Current User", tester.test_get_current_user),
        ("Enhanced Login Response", tester.test_enhanced_login_response),
        ("Create Profile (Family Mode)", tester.test_create_profile),
        ("Get Profile", tester.test_get_profile),
        ("Get Categories (CRITICAL)", tester.test_get_categories),
        
        # Family Member Management Tests
        ("🔥 Add Family Member", tester.test_add_family_member),
        ("🔥 Family Member First Login", tester.test_family_member_first_login),
        ("🔥 Family Member Password Change", tester.test_family_member_password_change),
        ("🔥 Get Family Members", tester.test_get_family_members),
        ("🔥 Get Family Status", tester.test_get_family_status),
        ("🔥 Family Member Profile Restriction", tester.test_family_member_profile_restriction),
        ("🔥 Access Control - Family Members", tester.test_access_control_family_members),
        
        # Transaction and Dashboard Sharing Tests
        ("Create Transaction", tester.test_create_transaction),
        ("Get Transactions", tester.test_get_transactions),
        ("🔥 Shared Transaction Access", tester.test_shared_transaction_access),
        ("🔥 Family Dashboard Sharing", tester.test_family_dashboard_sharing),
        ("Dashboard Data", tester.test_dashboard),
        
        # Original filtering tests
        ("🔥 Filtered Transactions (Month)", tester.test_filtered_transactions_month),
        ("🔥 Filtered Transactions (Week)", tester.test_filtered_transactions_week),
        ("🔥 Filtered Transactions (Day)", tester.test_filtered_transactions_day),
        ("🔥 Filtered Transactions (Different Years)", tester.test_filtered_transactions_different_years),
        ("Profile Update", tester.test_profile_update),
        ("Change Password", tester.test_change_password)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())