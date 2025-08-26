import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Calendar, User, DollarSign, TrendingUp, TrendingDown, Plus, Settings, Home as HomeIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Switch } from "./components/ui/switch";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetTracker = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    dob: '',
    phone: '',
    email: '',
    country: '',
    currency: 'INR',
    is_family_mode: false,
    family_members: []
  });

  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    transaction_type: 'expense',
    category_id: '',
    person_id: '',
    payment_source: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [budgetForm, setBudgetForm] = useState({
    needs: '',
    wants: '',
    savings: ''
  });

  useEffect(() => {
    fetchCategories();
    const savedProfile = localStorage.getItem('budgetProfile');
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);
      setProfile(parsedProfile);
      fetchDashboardData(parsedProfile.id);
      setCurrentView('dashboard');
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDashboardData = async (profileId) => {
    try {
      const response = await axios.get(`${API}/dashboard/${profileId}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/profile`, profileForm);
      setProfile(response.data);
      localStorage.setItem('budgetProfile', JSON.stringify(response.data));
      
      // Create initial budgets
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (budgetForm.needs) {
        await axios.post(`${API}/budget`, {
          profile_id: response.data.id,
          category_type: 'needs',
          budgeted_amount: parseFloat(budgetForm.needs),
          month: currentMonth
        });
      }
      if (budgetForm.wants) {
        await axios.post(`${API}/budget`, {
          profile_id: response.data.id,
          category_type: 'wants',
          budgeted_amount: parseFloat(budgetForm.wants),
          month: currentMonth
        });
      }
      if (budgetForm.savings) {
        await axios.post(`${API}/budget`, {
          profile_id: response.data.id,
          category_type: 'savings',
          budgeted_amount: parseFloat(budgetForm.savings),
          month: currentMonth
        });
      }
      
      await fetchDashboardData(response.data.id);
      setCurrentView('dashboard');
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
    setLoading(false);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/transactions`, {
        ...transactionForm,
        profile_id: profile.id,
        amount: parseFloat(transactionForm.amount)
      });
      
      setTransactionForm({
        amount: '',
        transaction_type: 'expense',
        category_id: '',
        person_id: '',
        payment_source: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      await fetchDashboardData(profile.id);
      toast.success('Transaction added successfully!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
    setLoading(false);
  };

  const addFamilyMember = () => {
    const name = prompt('Enter family member name:');
    const relation = prompt('Enter relation (spouse/child/parent/sibling/other):');
    if (name && relation) {
      setProfileForm(prev => ({
        ...prev,
        family_members: [...prev.family_members, { name, relation, id: Date.now().toString() }]
      }));
    }
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

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-landing relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>
        
        {/* Glass morphing container */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="glass-card max-w-4xl w-full p-8 text-center">
            <div className="mb-8">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
                Budget Tracker
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Master your finances with the Clever Finance Rule (CFR)
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="feature-card">
                <div className="feature-icon bg-gradient-to-br from-emerald-400 to-cyan-500">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Budgeting</h3>
                <p className="text-gray-400 text-sm">Apply CFR with tolerance tracking for optimal financial health</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon bg-gradient-to-br from-blue-400 to-purple-500">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Family Mode</h3>
                <p className="text-gray-400 text-sm">Manage expenses for your entire family with ease</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon bg-gradient-to-br from-purple-400 to-pink-500">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Real-time Analysis</h3>
                <p className="text-gray-400 text-sm">Get instant insights with colorful deviation alerts</p>
              </div>
            </div>

            <Button 
              onClick={() => setCurrentView('setup')}
              className="glow-button text-lg px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-setup p-6">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Setup Your Profile</h2>
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-group">
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="dob" className="text-white">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={profileForm.dob}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-group">
                  <Label htmlFor="phone" className="text-white">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-group">
                  <Label htmlFor="country" className="text-white">Country</Label>
                  <Input
                    id="country"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                    className="glass-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="currency" className="text-white">Currency</Label>
                  <Select 
                    value={profileForm.currency} 
                    onValueChange={(value) => setProfileForm(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="glass-input">
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

              <div className="form-group">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="family-mode"
                    checked={profileForm.is_family_mode}
                    onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, is_family_mode: checked }))}
                  />
                  <Label htmlFor="family-mode" className="text-white">Family Mode</Label>
                </div>
              </div>

              {profileForm.is_family_mode && (
                <div className="form-group">
                  <Label className="text-white">Family Members</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profileForm.family_members.map((member, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {member.name} ({member.relation})
                      </Badge>
                    ))}
                  </div>
                  <Button type="button" onClick={addFamilyMember} variant="outline" className="glass-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Family Member
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Set Initial Budget ({profileForm.currency})</h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <Label htmlFor="needs-budget" className="text-yellow-300">Needs Budget</Label>
                    <Input
                      id="needs-budget"
                      type="number"
                      placeholder="5000"
                      value={budgetForm.needs}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, needs: e.target.value }))}
                      className="glass-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="wants-budget" className="text-red-300">Wants Budget</Label>
                    <Input
                      id="wants-budget"
                      type="number"
                      placeholder="2000"
                      value={budgetForm.wants}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, wants: e.target.value }))}
                      className="glass-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="savings-budget" className="text-green-300">Savings Budget</Label>
                    <Input
                      id="savings-budget"
                      type="number"
                      placeholder="3000"
                      value={budgetForm.savings}
                      onChange={(e) => setBudgetForm(prev => ({ ...prev, savings: e.target.value }))}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full glow-button bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                {loading ? 'Creating Profile...' : 'Create Profile'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Navigation */}
      <nav className="glass-nav p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Budget Tracker</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {profile?.name}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                localStorage.removeItem('budgetProfile');
                setProfile(null);
                setCurrentView('landing');
              }}
              className="glass-button"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="glass-tabs">
            <TabsTrigger value="dashboard" className="tab-trigger">
              <HomeIcon className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="add-transaction" className="tab-trigger">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {dashboardData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-green-400 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Income
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">
                        {profile?.currency} {dashboardData.total_income.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-red-400 flex items-center">
                        <TrendingDown className="w-5 h-5 mr-2" />
                        Expenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">
                        {profile?.currency} {dashboardData.total_expenses.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-blue-400 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${dashboardData.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profile?.currency} {dashboardData.balance.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CFR Analysis */}
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">Clever Finance Rule (CFR) Analysis</CardTitle>
                    <CardDescription className="text-gray-400">
                      Track your spending against your budget with tolerance rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData.cfr_analysis.map((analysis, index) => (
                        <div key={index} className="cfr-bar-container">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={getCategoryTypeColor(analysis.category_type)}>
                                {analysis.category_type.toUpperCase()}
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
                          
                          <div className="text-xs text-gray-400 mt-1">
                            Status: <span className={getStatusColor(analysis.status)}>{analysis.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add-transaction">
            <Card className="glass-card border-0 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white">Add New Entry</CardTitle>
                <CardDescription className="text-gray-400">
                  Record your income or expense
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <Label htmlFor="amount" className="text-white">Amount ({profile?.currency})</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="glass-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="type" className="text-white">Type</Label>
                      <Select 
                        value={transactionForm.transaction_type} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, transaction_type: value }))}
                      >
                        <SelectTrigger className="glass-input">
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
                    <div className="form-group">
                      <Label htmlFor="category" className="text-white">Category</Label>
                      <Select 
                        value={transactionForm.category_id} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              <span className="flex items-center">
                                <Badge className={`${getCategoryTypeColor(category.type)} mr-2`} size="sm">
                                  {category.type}
                                </Badge>
                                {category.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="payment-source" className="text-white">Payment Source</Label>
                      <Input
                        id="payment-source"
                        value={transactionForm.payment_source}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, payment_source: e.target.value }))}
                        className="glass-input"
                        placeholder="Bank Account, Credit Card, etc."
                        required
                      />
                    </div>
                  </div>

                  {profile?.is_family_mode && (
                    <div className="form-group">
                      <Label htmlFor="person" className="text-white">Person</Label>
                      <Select 
                        value={transactionForm.person_id} 
                        onValueChange={(value) => setTransactionForm(prev => ({ ...prev, person_id: value }))}
                      >
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={profile.id}>Self</SelectItem>
                          {profile.family_members.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.relation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="form-group">
                    <Label htmlFor="date" className="text-white">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="glass-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                      className="glass-input"
                      placeholder="Add a note..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full glow-button bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                  >
                    {loading ? 'Adding Entry...' : 'Add Entry'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BudgetTracker;