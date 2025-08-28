import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FirstTimeLoginModal = ({ isOpen, onClose, onPasswordChanged }) => {
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: 'Artheeti1',
    new_password: '',
    confirm_password: ''
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordForm({
        current_password: 'Artheeti1',
        new_password: '',
        confirm_password: ''
      });
      
      toast.success('Password changed successfully! You can now access your profile.');
      onPasswordChanged();
      onClose();
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="modal-content max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-white">Change Your Password</DialogTitle>
          <DialogDescription className="text-gray-400">
            As a new family member, you must change your password before continuing.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="bg-blue-950/50 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>Default Password:</strong> Artheeti1<br/>
              Please change this to a secure password of your choice.
            </p>
          </div>

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
                disabled
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
            <Label htmlFor="new_password" className="text-white">New Password *</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword.new ? "text" : "password"}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                className="auth-input pr-10"
                required
                minLength={8}
                placeholder="Enter your new password"
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
            <Label htmlFor="confirm_password" className="text-white">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showPassword.confirm ? "text" : "password"}
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="auth-input pr-10"
                required
                minLength={8}
                placeholder="Confirm your new password"
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

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Changing Password...' : 'Change Password & Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FirstTimeLoginModal;