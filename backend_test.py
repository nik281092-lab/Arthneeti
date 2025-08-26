import requests
import sys
import json
from datetime import datetime, timezone
import uuid

class BudgetTrackerAPITester:
    def __init__(self, base_url="https://moneymanager-23.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.profile_id = None
        self.category_ids = {}
        self.transaction_id = None
        self.current_month = datetime.now().strftime("%Y-%m")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: List with {len(response_data)} items")
                        if len(response_data) <= 3:
                            print(f"   First item: {response_data[0]}")
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

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_get_categories(self):
        """Test getting categories (should have default categories)"""
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            # Store category IDs for later use
            for category in response:
                self.category_ids[category['type']] = category['id']
            return len(response) > 0
        return False

    def test_create_profile(self):
        """Test creating a profile"""
        profile_data = {
            "name": "Test User",
            "dob": "1990-01-01",
            "phone": "+1234567890",
            "email": "test@example.com",
            "country": "India",
            "currency": "INR",
            "is_family_mode": False,
            "family_members": []
        }
        
        success, response = self.run_test("Create Profile", "POST", "profile", 200, profile_data)
        if success and 'id' in response:
            self.profile_id = response['id']
            print(f"   Profile ID: {self.profile_id}")
            return True
        return False

    def test_get_profile(self):
        """Test getting a profile by ID"""
        if not self.profile_id:
            print("❌ No profile ID available for testing")
            return False
        
        return self.run_test("Get Profile", "GET", f"profile/{self.profile_id}", 200)[0]

    def test_get_profiles(self):
        """Test getting all profiles"""
        return self.run_test("Get All Profiles", "GET", "profiles", 200)[0]

    def test_create_budgets(self):
        """Test creating budgets for all category types"""
        if not self.profile_id:
            print("❌ No profile ID available for budget creation")
            return False

        budget_data = [
            {"category_type": "needs", "budgeted_amount": 5000},
            {"category_type": "wants", "budgeted_amount": 2000},
            {"category_type": "savings", "budgeted_amount": 3000}
        ]

        all_success = True
        for budget in budget_data:
            budget_payload = {
                "profile_id": self.profile_id,
                "month": self.current_month,
                **budget
            }
            success, _ = self.run_test(
                f"Create {budget['category_type'].title()} Budget", 
                "POST", 
                "budget", 
                200, 
                budget_payload
            )
            if not success:
                all_success = False

        return all_success

    def test_get_budgets(self):
        """Test getting budgets for a profile and month"""
        if not self.profile_id:
            print("❌ No profile ID available for getting budgets")
            return False
        
        return self.run_test("Get Budgets", "GET", f"budget/{self.profile_id}/{self.current_month}", 200)[0]

    def test_create_transactions(self):
        """Test creating various transactions"""
        if not self.profile_id or not self.category_ids:
            print("❌ Missing profile ID or category IDs for transaction creation")
            return False

        transactions = [
            {
                "amount": 8000,
                "transaction_type": "income",
                "category_id": list(self.category_ids.values())[0],  # Use first available category
                "payment_source": "Salary Account",
                "description": "Monthly Salary",
                "date": f"{self.current_month}-01"
            },
            {
                "amount": 1500,
                "transaction_type": "expense",
                "category_id": self.category_ids.get('needs', list(self.category_ids.values())[0]),
                "payment_source": "Credit Card",
                "description": "Grocery Shopping",
                "date": f"{self.current_month}-05"
            },
            {
                "amount": 800,
                "transaction_type": "expense",
                "category_id": self.category_ids.get('wants', list(self.category_ids.values())[0]),
                "payment_source": "Debit Card",
                "description": "Restaurant",
                "date": f"{self.current_month}-10"
            },
            {
                "amount": 2000,
                "transaction_type": "expense",
                "category_id": self.category_ids.get('savings', list(self.category_ids.values())[0]),
                "payment_source": "Bank Transfer",
                "description": "Investment",
                "date": f"{self.current_month}-15"
            }
        ]

        all_success = True
        for i, transaction in enumerate(transactions):
            transaction_payload = {
                "profile_id": self.profile_id,
                **transaction
            }
            success, response = self.run_test(
                f"Create Transaction {i+1} ({transaction['transaction_type']})", 
                "POST", 
                "transactions", 
                200, 
                transaction_payload
            )
            if success and i == 0:  # Store first transaction ID
                self.transaction_id = response.get('id')
            if not success:
                all_success = False

        return all_success

    def test_get_transactions(self):
        """Test getting transactions for a profile"""
        if not self.profile_id:
            print("❌ No profile ID available for getting transactions")
            return False
        
        success, response = self.run_test("Get Transactions", "GET", f"transactions/{self.profile_id}", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} transactions")
            return len(response) > 0
        return False

    def test_dashboard_summary(self):
        """Test getting dashboard summary"""
        if not self.profile_id:
            print("❌ No profile ID available for dashboard summary")
            return False
        
        success, response = self.run_test("Dashboard Summary", "GET", f"dashboard/{self.profile_id}", 200)
        if success:
            expected_keys = ['profile_id', 'month', 'total_income', 'total_expenses', 'balance', 'cfr_analysis']
            has_all_keys = all(key in response for key in expected_keys)
            if has_all_keys:
                print(f"   Income: {response['total_income']}, Expenses: {response['total_expenses']}, Balance: {response['balance']}")
                print(f"   CFR Analysis items: {len(response['cfr_analysis'])}")
                return True
            else:
                print(f"   Missing keys in response: {[key for key in expected_keys if key not in response]}")
        return False

    def test_cfr_analysis(self):
        """Test CFR analysis endpoint"""
        if not self.profile_id:
            print("❌ No profile ID available for CFR analysis")
            return False
        
        success, response = self.run_test("CFR Analysis", "GET", f"cfr-analysis/{self.profile_id}/{self.current_month}", 200)
        if success and isinstance(response, list):
            print(f"   CFR Analysis items: {len(response)}")
            for analysis in response:
                if 'category_type' in analysis and 'status' in analysis:
                    print(f"   {analysis['category_type']}: {analysis['status']} ({analysis.get('deviation_percentage', 0):.1f}%)")
            return len(response) > 0
        return False

    def test_create_custom_category(self):
        """Test creating a custom category"""
        success, response = self.run_test(
            "Create Custom Category", 
            "POST", 
            "categories?name=Custom%20Test&category_type=wants", 
            200
        )
        return success

def main():
    print("🚀 Starting Budget Tracker API Tests")
    print("=" * 50)
    
    tester = BudgetTrackerAPITester()
    
    # Test sequence
    test_sequence = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Get Categories", tester.test_get_categories),
        ("Create Profile", tester.test_create_profile),
        ("Get Profile", tester.test_get_profile),
        ("Get All Profiles", tester.test_get_profiles),
        ("Create Budgets", tester.test_create_budgets),
        ("Get Budgets", tester.test_get_budgets),
        ("Create Transactions", tester.test_create_transactions),
        ("Get Transactions", tester.test_get_transactions),
        ("Dashboard Summary", tester.test_dashboard_summary),
        ("CFR Analysis", tester.test_cfr_analysis),
        ("Create Custom Category", tester.test_create_custom_category),
    ]
    
    print(f"Running {len(test_sequence)} test groups...\n")
    
    for test_name, test_func in test_sequence:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test group '{test_name}' failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 Final Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())