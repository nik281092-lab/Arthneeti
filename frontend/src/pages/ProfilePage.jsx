import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Save, Plus, Users, Mail, Trash2, Eye, EyeOff, Lock, User, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [familyStatus, setFamilyStatus] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    currency: 'INR',
    bank_account: '',
    address: '',
    country: '',
    account_type: 'individual',
    monthly_income: ''
  });

  // New family members to be created (not yet saved)
  const [newFamilyMembers, setNewFamilyMembers] = useState([]);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
    fetchFamilyStatus();
    fetchFamilyMembers();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setProfile(response.data);
      setProfileForm({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        currency: response.data.currency,
        bank_account: response.data.bank_account || '',
        address: response.data.address || '',
        country: response.data.country,
        account_type: response.data.account_type,
        monthly_income: response.data.monthly_income || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchFamilyStatus = async () => {
    try {
      const response = await axios.get(`${API}/profile/family-status`);
      setFamilyStatus(response.data);
    } catch (error) {
      console.error('Error fetching family status:', error);
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update user info
      await axios.put(`${API}/me`, {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email
      });

      // Update profile info
      const profileData = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        currency: profileForm.currency,
        bank_account: profileForm.bank_account,
        address: profileForm.address,
        country: profileForm.country,
        account_type: profileForm.account_type,
        monthly_income: profileForm.monthly_income ? parseFloat(profileForm.monthly_income) : null
      };
      
      const response = await axios.put(`${API}/profile`, profileData);
      setProfile(response.data);
      
      // Create new family member accounts
      const createdMembers = [];
      for (const member of newFamilyMembers) {
        try {
          const memberResponse = await axios.post(`${API}/family-members`, member);
          createdMembers.push(memberResponse.data);
          toast.success(`Family member ${member.first_name} ${member.last_name} added successfully!`);
        } catch (error) {
          toast.error(`Failed to add ${member.first_name} ${member.last_name}: ${error.response?.data?.detail || 'Unknown error'}`);
        }
      }
      
      // Clear new family members after successful creation
      setNewFamilyMembers([]);
      
      // Refresh family members list
      await fetchFamilyMembers();
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    }
    setLoading(false);
  };

  const addNewFamilyMember = () => {
    setNewFamilyMembers(prev => [...prev, {
      email: '',
      first_name: '',
      last_name: '',
      relation: 'spouse'
    }]);
  };

  const updateNewFamilyMember = (index, field, value) => {
    setNewFamilyMembers(prev => prev.map((member, i) => 
      i === index ? { ...member, [field]: value } : member
    ));
  };

  const removeNewFamilyMember = (index) => {
    setNewFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      setShowChangePassword(false);
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
    setLoading(false);
  };

  const getRelationBadgeColor = (relation) => {
    switch (relation) {
      case 'master': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'spouse': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'child': return 'bg-green-100 text-green-800 border-green-200';
      case 'parent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sibling': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-static-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-static-gradient p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-300">Manage your profile and family settings</p>
        </div>

        {/* Profile Information */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
            <CardDescription className="text-gray-400">
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
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

              <div>
                <Label htmlFor="email" className="text-white">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="auth-input"
                  required
                />
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
                  disabled={familyStatus?.is_family_member}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
                {familyStatus?.is_family_member && (
                  <p className="text-sm text-yellow-400 mt-1">
                    Family members cannot change account type
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button 
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Family Management - Only for master users */}
        {familyStatus?.can_add_family_members && (
          <Card className="dashboard-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Family Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage family members and their access
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setShowAddFamilyMember(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Family Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No family members added yet</p>
                    <p className="text-sm text-gray-500">Add family members to share budget tracking</p>
                  </div>
                ) : (
                  familyMembers.map((member) => (
                    <div key={member.id} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">{member.name}</div>
                          <div className="text-gray-400 text-sm flex items-center space-x-2">
                            <Mail className="w-3 h-3" />
                            <span>{member.email}</span>
                          </div>
                        </div>
                        <Badge className={getRelationBadgeColor(member.relation)}>
                          {member.relation}
                        </Badge>
                        {member.is_master && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Master
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Members List - For family members to see family */}
        {familyStatus?.is_family_member && familyMembers.length > 0 && (
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Family Members
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{member.name}</div>
                        <div className="text-gray-400 text-sm flex items-center space-x-2">
                          <Mail className="w-3 h-3" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                      <Badge className={getRelationBadgeColor(member.relation)}>
                        {member.relation}
                      </Badge>
                      {member.is_master && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Master
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Family Member Modal */}
      <Dialog open={showAddFamilyMember} onOpenChange={setShowAddFamilyMember}>
        <DialogContent className="modal-content max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Family Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new family member to share budget tracking
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddFamilyMember} className="space-y-4">
            <div>
              <Label htmlFor="family_email" className="text-white">Email Address *</Label>
              <Input
                id="family_email"
                type="email"
                value={familyMemberForm.email}
                onChange={(e) => setFamilyMemberForm(prev => ({ ...prev, email: e.target.value }))}
                className="auth-input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="family_first_name" className="text-white">First Name *</Label>
                <Input
                  id="family_first_name"
                  value={familyMemberForm.first_name}
                  onChange={(e) => setFamilyMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="family_last_name" className="text-white">Last Name *</Label>
                <Input
                  id="family_last_name"
                  value={familyMemberForm.last_name}
                  onChange={(e) => setFamilyMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="family_relation" className="text-white">Relationship *</Label>
              <Select 
                value={familyMemberForm.relation} 
                onValueChange={(value) => setFamilyMemberForm(prev => ({ ...prev, relation: value }))}
              >
                <SelectTrigger className="auth-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-950/50 border border-blue-700 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> An account will be created automatically with email as username and default password "Artheeti1". 
                The family member must change their password on first login.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddFamilyMember(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="modal-content max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update your account password
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="current_password" className="text-white">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showPassword.current ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                  className="auth-input pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new_password" className="text-white">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword.new ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                  className="auth-input pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm_password" className="text-white">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="auth-input pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setPasswordForm({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                  });
                  setShowChangePassword(false);
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
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;