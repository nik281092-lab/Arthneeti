import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Calendar, DollarSign, TrendingUp, TrendingDown, Plus, 
  Home as HomeIcon, PieChart, BarChart3, Save, Edit3, Trash2, 
  Filter, Search, List
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const [categories, setCategories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({});
  const [hasTransactions, setHasTransactions] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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

  // Filter form for transactions
  const [filterForm, setFilterForm] = useState({
    filter_type: 'month',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week: 1,
    day: 1
  });

  const [editingTransaction, setEditingTransaction] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchCategories();
    fetchDashboardData();
    fetchAllTransactions();
    fetchAvailableFilters();
    fetchFamilyMembers();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/me`);
      setCurrentUser(response.data);
      
      // Set default person name to current user
      const defaultPersonName = `${response.data.first_name} ${response.data.last_name}`;
      setTransactionForm(prev => ({ ...prev, person_name: defaultPersonName }));
    } catch (error) {
      console.error('Error fetching current user:', error);
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

  const fetchAllTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setAllTransactions(response.data);
      setHasTransactions(response.data.length > 0);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchAvailableFilters = async () => {
    try {
      const response = await axios.get(`${API}/transactions/available-filters`);
      setAvailableFilters(response.data);
      setHasTransactions(response.data.has_transactions);
    } catch (error) {
      console.error('Error fetching available filters:', error);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const response = await axios.get(`${API}/family-members`);
      setFamilyMembers(response.data || []);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const fetchFilteredTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter_type: filterForm.filter_type,
        year: filterForm.year.toString()
      });
      
      if (filterForm.filter_type === 'month' && filterForm.month) {
        params.append('month', filterForm.month.toString());
      }
      if (filterForm.filter_type === 'week' && filterForm.week && filterForm.month) {
        params.append('month', filterForm.month.toString());
        params.append('week', filterForm.week.toString());
      }
      if (filterForm.filter_type === 'day' && filterForm.day && filterForm.month) {
        params.append('month', filterForm.month.toString());
        params.append('day', filterForm.day.toString());
      }
      
      const response = await axios.get(`${API}/transactions/filtered?${params}`);
      setFilteredTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching filtered transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const transactionData = {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      };

      if (editingTransaction) {
        await axios.put(`${API}/transactions/${editingTransaction.id}`, transactionData);
        toast.success('Transaction updated successfully!');
        setEditingTransaction(null);
      } else {
        await axios.post(`${API}/transactions`, transactionData);
        toast.success('Transaction added successfully!');
      }
      
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
      await fetchAllTransactions();
      await fetchAvailableFilters();
      setShowAddTransaction(false);
    } catch (error) {
      console.error('Error with transaction:', error);
      toast.error(error.response?.data?.detail || 'Failed to process transaction');
    }
    setLoading(false);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      amount: transaction.amount.toString(),
      transaction_type: transaction.transaction_type,
      category_id: transaction.category_id,
      person_name: transaction.person_name || '',
      payment_mode: transaction.payment_mode,
      bank_app: transaction.bank_app || '',
      description: transaction.description || '',
      date: transaction.date.split('T')[0]
    });
    setShowAddTransaction(true);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axios.delete(`${API}/transactions/${transactionId}`);
        await fetchDashboardData();
        await fetchAllTransactions();
        await fetchAvailableFilters();
        toast.success('Transaction deleted successfully!');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Failed to delete transaction');
      }
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

  const formatCurrency = (amount) => {
    return `${dashboardData?.profile?.currency || 'INR'} ${amount.toLocaleString()}`;
  };

  const getAvailableMonths = () => {
    const year = filterForm.year;
    return availableFilters.available_months?.[year] || [];
  };

  const getAvailableDays = () => {
    const year = filterForm.year;
    const month = filterForm.month;
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    return availableFilters.available_days?.[key] || [];
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="glass-tabs">
          <TabsTrigger value="dashboard" className="tab-trigger">
            <HomeIcon className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="all-entries" 
            className={`tab-trigger ${!hasTransactions ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!hasTransactions}
          >
            <List className="w-4 h-4 mr-2" />
            View All Entries
            {!hasTransactions && <span className="text-xs ml-1">(No entries)</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
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
                      {formatCurrency(dashboardData.total_income)}
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
                      {formatCurrency(dashboardData.total_expenses)}
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
                      {formatCurrency(dashboardData.balance)}
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
                              {formatCurrency(analysis.actual_amount)} / {formatCurrency(analysis.budgeted_amount)}
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
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-entries">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">All Entries</h2>
              <Button 
                onClick={() => setShowAddTransaction(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>

            {/* Smart Filters */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filter Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="filter_type" className="text-white">View By</Label>
                    <Select 
                      value={filterForm.filter_type} 
                      onValueChange={(value) => setFilterForm(prev => ({ ...prev, filter_type: value }))}
                    >
                      <SelectTrigger className="auth-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year" className="text-white">Year</Label>
                    <Select 
                      value={filterForm.year.toString()} 
                      onValueChange={(value) => setFilterForm(prev => ({ ...prev, year: parseInt(value) }))}
                    >
                      <SelectTrigger className="auth-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(availableFilters.available_years || []).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="month" className="text-white">Month</Label>
                    <Select 
                      value={filterForm.month.toString()} 
                      onValueChange={(value) => setFilterForm(prev => ({ ...prev, month: parseInt(value) }))}
                    >
                      <SelectTrigger className="auth-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableMonths().map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filterForm.filter_type === 'week' && (
                    <div>
                      <Label htmlFor="week" className="text-white">Week</Label>
                      <Select 
                        value={filterForm.week.toString()} 
                        onValueChange={(value) => setFilterForm(prev => ({ ...prev, week: parseInt(value) }))}
                      >
                        <SelectTrigger className="auth-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Week 1</SelectItem>
                          <SelectItem value="2">Week 2</SelectItem>
                          <SelectItem value="3">Week 3</SelectItem>
                          <SelectItem value="4">Week 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filterForm.filter_type === 'day' && (
                    <div>
                      <Label htmlFor="day" className="text-white">Day</Label>
                      <Select 
                        value={filterForm.day.toString()} 
                        onValueChange={(value) => setFilterForm(prev => ({ ...prev, day: parseInt(value) }))}
                      >
                        <SelectTrigger className="auth-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableDays().map(day => (
                            <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button 
                      onClick={fetchFilteredTransactions}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {loading ? 'Loading...' : 'Filter'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-white">
                  Transactions {filteredTransactions.length > 0 && `(${filteredTransactions.length} found)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">No transactions found for selected filter</div>
                    <Button 
                      onClick={fetchFilteredTransactions}
                      variant="outline"
                      className="text-white border-gray-600 hover:bg-gray-800"
                    >
                      Load Transactions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTransactions.map((transaction) => {
                      const category = categories.find(c => c.id === transaction.category_id);
                      return (
                        <div key={transaction.id} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${
                              transaction.transaction_type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {transaction.transaction_type === 'income' ? 
                                <TrendingUp className="w-4 h-4 text-green-400" /> : 
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              }
                            </div>
                            <div>
                              <div className="text-white font-semibold">
                                {formatCurrency(transaction.amount)}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {transaction.description || transaction.category_name || 'No description'}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {new Date(transaction.date).toLocaleDateString()} • {transaction.payment_mode}
                                {transaction.person_name && ` • ${transaction.person_name}`}
                              </div>
                            </div>
                            {category && (
                              <Badge className={getCategoryTypeColor(category.type)}>
                                {category.type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTransaction(transaction)}
                              className="text-white border-gray-600 hover:bg-gray-800"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-400 border-red-600 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Transaction Modal */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent className="modal-content max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTransaction ? 'Edit Entry' : 'Add New Entry'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingTransaction ? 'Update your transaction details' : 'Record your income or expense'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="text-white">Amount ({dashboardData?.profile?.currency})</Label>
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
                  <SelectContent className="max-h-60 z-[9999]" container={document.body}>
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
                <Select 
                  value={transactionForm.person_name} 
                  onValueChange={(value) => setTransactionForm(prev => ({ ...prev, person_name: value }))}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue placeholder="Select family member" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Current User (Default) */}
                    {currentUser && (
                      <SelectItem value={`${currentUser.first_name} ${currentUser.last_name}`}>
                        {currentUser.first_name} {currentUser.last_name} (You)
                      </SelectItem>
                    )}
                    
                    {/* Family Members */}
                    {familyMembers.filter(member => !member.is_master).map(member => (
                      <SelectItem key={member.id} value={member.name}>
                        {member.name} ({member.relation})
                      </SelectItem>
                    ))}
                    
                    {/* Manual Entry Option */}
                    <SelectItem value="__manual__">Other (type manually)</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Manual input field for custom person name */}
                {transactionForm.person_name === '__manual__' && (
                  <Input
                    className="auth-input mt-2"
                    placeholder="Enter person name"
                    value=""
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, person_name: e.target.value }))}
                    autoFocus
                  />
                )}
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
                onClick={() => {
                  setShowAddTransaction(false);
                  setEditingTransaction(null);
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
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : (editingTransaction ? 'Update Entry' : 'Add Entry')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;