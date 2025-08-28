import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import axios from "axios";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import Layout from "./components/layout/Layout";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import FirstTimeLoginModal from "./components/FirstTimeLoginModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const response = await axios.post(`${API}/${endpoint}`, authForm);
      
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      if (authMode === 'signup') {
        navigate('/profile-setup');
        toast.success('Account created successfully!');
      } else {
        // Check if user needs to change password (family member first login)
        if (response.data.user.must_change_password) {
          navigate('/dashboard?first-login=true');
        } else {
          navigate('/dashboard');
        }
        toast.success('Logged in successfully!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

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
};

// Profile Setup Component
const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profileData = {
        ...profileForm,
        monthly_income: profileForm.monthly_income ? parseFloat(profileForm.monthly_income) : null
      };
      
      await axios.post(`${API}/profile`, profileData);
      navigate('/dashboard');
      toast.success('Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    }
    setLoading(false);
  };

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
              <select 
                value={profileForm.account_type} 
                onChange={(e) => setProfileForm(prev => ({ ...prev, account_type: e.target.value }))}
                className="auth-input"
              >
                <option value="individual">Individual</option>
                <option value="family">Family</option>
              </select>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? 'Creating Profile...' : 'Save Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFirstTimeLogin, setShowFirstTimeLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for first-login parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('first-login') === 'true') {
      fetchUserData().then(() => {
        setShowFirstTimeLogin(true);
      });
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const userResponse = await axios.get(`${API}/me`);
      setUser(userResponse.data);
      setIsAuthenticated(true);
      
      // Check if this is a family member who needs to change password
      if (userResponse.data.must_change_password) {
        setShowFirstTimeLogin(true);
      }
      
      // Check if user needs profile setup
      try {
        await axios.get(`${API}/profile`);
      } catch (error) {
        if (error.response?.status === 404) {
          navigate('/profile-setup');
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const handlePasswordChanged = () => {
    setShowFirstTimeLogin(false);
    // Refresh user data to clear must_change_password flag
    fetchUserData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-static-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Layout user={user} onLogout={handleLogout}>
        {children}
      </Layout>
      <FirstTimeLoginModal 
        isOpen={showFirstTimeLogin}
        onClose={() => setShowFirstTimeLogin(false)}
        onPasswordChanged={handlePasswordChanged}
      />
    </>
  );
};

// Main App Component
const BudgetTracker = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default BudgetTracker;