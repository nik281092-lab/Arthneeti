import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut, ChevronDown, User } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";

const Layout = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    onLogout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-static-gradient">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center space-x-6">
            <h1 
              className="text-2xl font-bold text-white cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={handleDashboardClick}
            >
              Budget Tracker
            </h1>
            
            {/* Navigation Tabs */}
            <div className="hidden md:flex space-x-1">
              <Button
                variant={location.pathname === '/dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={handleDashboardClick}
                className={`${
                  location.pathname === '/dashboard' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Dashboard
              </Button>
              <Button
                variant={location.pathname === '/profile' ? 'default' : 'ghost'}
                size="sm"
                onClick={handleProfileClick}
                className={`${
                  location.pathname === '/profile' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Profile
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300 hidden sm:block">Welcome, {user?.first_name}</span>
            
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700">
                <DropdownMenuItem 
                  onClick={handleProfileClick}
                  className="text-white hover:bg-gray-800 cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;