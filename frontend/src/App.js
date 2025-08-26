import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { 
  Calendar, User, DollarSign, TrendingUp, TrendingDown, Plus, Settings, 
  Home as HomeIcon, LogOut, Eye, EyeOff, PieChart, BarChart3, ArrowRight
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetTracker = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Auth forms
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    currency: 'INR',
    bank_account: '',
    address: '',
    country: '',
    account_type: 'individual',
    monthly_income: ''
  });

  // Transaction form
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    transaction_type: 'expense',
    category_id: '',
    person_name: '',
    payment_mode: 'online',
    bank_app: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    }
    fetchCategories();
  }, []);

  const fetchUserData = async () => {
    try {
      const userResponse = await axios.get(`${API}/me`);
      setUser(userResponse.data);
      
      try {
        const profileResponse = await axios.get(`${API}/profile`);
        setProfile(profileResponse.data);
        await fetchDashboardData();
        setCurrentView('dashboard');
      } catch (error) {
        if (error.response?.status === 404) {
          setCurrentView('profile-setup');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const response = await axios.post(`${API}/${endpoint}`, authForm);
      
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setUser(response.data.user);
      
      if (authMode === 'signup') {
        setCurrentView('profile-setup');
        toast.success('Account created successfully!');
      } else {
        await fetchUserData();
        toast.success('Logged in successfully!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profileData = {
        ...profileForm,
        monthly_income: profileForm.monthly_income ? parseFloat(profileForm.monthly_income) : null
      };
      
      const response = await axios.post(`${API}/profile`, profileData);
      setProfile(response.data);
      await fetchDashboardData();
      setCurrentView('dashboard');
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    }
    setLoading(false);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/transactions`, {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      });
      
      setTransactionForm({
        amount: '',
        transaction_type: 'expense',
        category_id: '',
        person_name: '',
        payment_mode: 'online',
        bank_app: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      await fetchDashboardData();
      setShowAddTransaction(false);
      toast.success('Transaction added successfully!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error(error.response?.data?.detail || 'Failed to add transaction');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setProfile(null);
    setDashboardData(null);
    setCurrentView('landing');
    toast.success('Logged out successfully');
  };

  const getCategoryTypeColor = (type) => {
    switch (type) {
      case 'needs': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'wants': return 'bg-red-100 text-red-800 border-red-200';
      case 'savings': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'within_tolerance': return 'text-green-600';
      case 'overshoot': return 'text-red-600';
      case 'undershoot': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-static-gradient">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-4">
              Budget Tracker
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Master your finances with smart budgeting
            </p>
            
            <div className="max-w-md mx-auto">
              <div className="auth-card p-8">
                <div className="flex justify-center mb-6">
                  <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                      className={`px-4 py-2 rounded-md transition-all ${
                        authMode === 'login' 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setAuthMode('login')}
                    >
                      Login
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md transition-all ${
                        authMode === 'signup' 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setAuthMode('signup')}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-white">First Name</Label>
                        <Input
                          id="first_name"
                          value={authForm.first_name}
                          onChange={(e) => setAuthForm(prev => ({ ...prev, first_name: e.target.value }))}
                          className="auth-input"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-white">Last Name</Label>
                        <Input
                          id="last_name"
                          value={authForm.last_name}
                          onChange={(e) => setAuthForm(prev => ({ ...prev, last_name: e.target.value }))}
                          className="auth-input"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      className="auth-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={authForm.password}
                        onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                        className="auth-input pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile Setup
  if (currentView === 'profile-setup') {
    return (
      <div className="min-h-screen bg-static-gradient p-6">
        <div className="max-w-2xl mx-auto">
          <div className="auth-card p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Setup Your Profile</h2>
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-white">First Name *</Label>
                  <Input
                    id="first_name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="auth-input"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="last_name" className="text-white">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country" className="text-white">Country *</Label>
                  <Input
                    id="country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                    className="auth-input"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="currency" className="text-white">Currency</Label>
                  <Select 
                    value={profileForm.currency} 
                    onValueChange={(value) => setProfileForm(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="auth-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bank_account" className="text-white">Bank Account</Label>
                <Input
                  id="bank_account"
                  value={profileForm.bank_account}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bank_account: e.target.value }))}
                  className="auth-input"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-white">Address</Label>
                <Input
                  id="address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  className="auth-input"
                />
              </div>

              <div>
                <Label htmlFor="monthly_income" className="text-white">Monthly Income ({profileForm.currency})</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={profileForm.monthly_income}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, monthly_income: e.target.value }))}
                  className="auth-input"
                  placeholder="For CFR calculations"
                />
              </div>

              <div>
                <Label htmlFor="account_type" className="text-white">Account Type</Label>
                <Select 
                  value={profileForm.account_type} 
                  onValueChange={(value) => setProfileForm(prev => ({ ...prev, account_type: value }))}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? 'Creating Profile...' : 'Create Profile'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-static-gradient">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-white">Budget Tracker</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {user?.first_name}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView('profile-settings')}
              className="text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {dashboardData && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Dashboard</h2>
              <Button 
                onClick={() => setShowAddTransaction(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="dashboard-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-400 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {profile?.currency} {dashboardData.total_income.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-400 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {profile?.currency} {dashboardData.total_expenses.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-400 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${dashboardData.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profile?.currency} {dashboardData.balance.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-400 flex items-center">
                    <PieChart className="w-5 h-5 mr-2" />
                    Savings Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {dashboardData.total_income > 0 
                      ? ((dashboardData.balance / dashboardData.total_income) * 100).toFixed(1)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CFR Analysis */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Clever Finance Rule (CFR) Analysis
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Needs: 50% | Wants: 30% | Savings: 20%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.cfr_analysis.map((analysis, index) => (
                    <div key={index} className="cfr-container">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryTypeColor(analysis.category_type)}>
                            {analysis.category_type.toUpperCase()} ({analysis.recommended_percentage}%)
                          </Badge>
                          <span className="text-white font-medium">
                            {profile?.currency} {analysis.actual_amount.toLocaleString()} / {analysis.budgeted_amount.toLocaleString()}
                          </span>
                        </div>
                        <span className={`font-bold ${getStatusColor(analysis.status)}`}>
                          {analysis.deviation_percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="cfr-bar">
                        <div 
                          className={`cfr-bar-fill ${
                            analysis.status === 'within_tolerance' ? 'bg-green-500' :
                            analysis.status === 'overshoot' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (analysis.actual_amount / analysis.budgeted_amount) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category-wise Spending */}
            {dashboardData.category_wise_spending && Object.keys(dashboardData.category_wise_spending).length > 0 && (
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="text-white">Category-wise Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(dashboardData.category_wise_spending).map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="text-gray-300">{category}</span>
                        <span className="text-white font-semibold">
                          {profile?.currency} {amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="modal-content max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Entry</DialogTitle>
            <DialogDescription className="text-gray-400">
              Record your income or expense
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="text-white">Amount ({profile?.currency})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type" className="text-white">Type</Label>
                <Select 
                  value={transactionForm.transaction_type} 
                  onValueChange={(value) => setTransactionForm(prev => ({ ...prev, transaction_type: value }))}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-white">Category</Label>
                <Select 
                  value={transactionForm.category_id} 
                  onValueChange={(value) => setTransactionForm(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center">
                          <Badge className={`${getCategoryTypeColor(category.type)} mr-2 text-xs`}>
                            {category.type}
                          </Badge>
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment-mode" className="text-white">Payment Mode</Label>
                <Select 
                  value={transactionForm.payment_mode} 
                  onValueChange={(value) => setTransactionForm(prev => ({ ...prev, payment_mode: value }))}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="person_name" className="text-white">Person Name</Label>
                <Input
                  id="person_name"
                  value={transactionForm.person_name}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, person_name: e.target.value }))}
                  className="auth-input"
                  placeholder="Who made this transaction?"
                />
              </div>
              
              <div>
                <Label htmlFor="bank_app" className="text-white">Bank/App</Label>
                <Input
                  id="bank_app"
                  value={transactionForm.bank_app}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, bank_app: e.target.value }))}
                  className="auth-input"
                  placeholder="Bank name or app used"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="date" className="text-white">Date</Label>
              <Input
                id="date"
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                className="auth-input"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Input
                id="description"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                className="auth-input"
                placeholder="Add a note..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddTransaction(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Adding...' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetTracker;