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

def main():
    print("🚀 Starting Budget Tracker API Tests")
    print("=" * 50)
    
    tester = BudgetTrackerAPITester()
    
    # Test sequence - Focus on reported bug fixes
    tests = [
        ("Signup", tester.test_signup),
        ("Get Current User", tester.test_get_current_user),
        ("Create Profile", tester.test_create_profile),
        ("Get Profile", tester.test_get_profile),
        ("Get Categories (CRITICAL)", tester.test_get_categories),
        ("Create Transaction", tester.test_create_transaction),
        ("Get Transactions", tester.test_get_transactions),
        ("Dashboard Data", tester.test_dashboard),
        # CRITICAL TESTS FOR REPORTED BUGS
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