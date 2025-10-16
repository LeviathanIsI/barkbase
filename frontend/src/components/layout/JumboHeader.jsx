import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, MessageCircle, Grid3x3, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const JumboHeader = ({ onMenuToggle }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);

  const closeAllMenus = () => {
    setAppsOpen(false);
    setNotificationsOpen(false);
    setMessagesOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-gradient-to-r from-[#4B5DD3] to-[#3A4BC2] text-white shadow-lg">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Side - Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={onMenuToggle}
          >
            <Grid3x3 className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              {tenant?.assets?.logo ? (
                <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <span className="font-bold">BB</span>
              )}
            </div>
            <span className="hidden md:block text-lg font-semibold">{tenant?.name ?? 'BarkBase'}</span>
          </div>
        </div>

        {/* Center - Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <div className="flex items-center bg-white/10 rounded-lg px-4 py-2 hover:bg-white/20 transition-colors">
              <Search className="h-4 w-4 text-white/70 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-0 outline-none text-white placeholder-white/70 flex-1 text-sm"
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
              />
            </div>

            {/* Search Dropdown (placeholder for now) */}
            {searchOpen && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-4">
                <p className="text-gray-500 text-sm">Search functionality coming soon...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Apps Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => {
                closeAllMenus();
                setAppsOpen(!appsOpen);
              }}
            >
              <Grid3x3 className="h-5 w-5" />
            </Button>

            {appsOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Quick Apps</p>
                </div>
                <div className="p-2">
                  <Link
                    to="/bookings"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    onClick={closeAllMenus}
                  >
                    <div className="w-8 h-8 bg-[#4B5DD3] rounded-lg flex items-center justify-center">
                      <Grid3x3 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New Booking</p>
                      <p className="text-xs text-gray-500">Create reservation</p>
                    </div>
                  </Link>
                  <Link
                    to="/daycare/checkin"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    onClick={closeAllMenus}
                  >
                    <div className="w-8 h-8 bg-[#FF9800] rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Check In</p>
                      <p className="text-xs text-gray-500">Process arrival</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 relative"
              onClick={() => {
                closeAllMenus();
                setNotificationsOpen(!notificationsOpen);
              }}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#F44336] rounded-full text-xs flex items-center justify-center">3</span>
            </Button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">Vaccination due for Max</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                  <div className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">New booking from Sarah Johnson</p>
                    <p className="text-xs text-gray-500">4 hours ago</p>
                  </div>
                  <div className="p-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-900">Facility capacity at 85%</p>
                    <p className="text-xs text-gray-500">6 hours ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <Button variant="ghost" className="w-full text-sm">View All</Button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => {
                closeAllMenus();
                setMessagesOpen(!messagesOpen);
              }}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>

            {messagesOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Messages</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center text-white text-xs font-semibold">SJ</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Sarah Johnson</p>
                        <p className="text-xs text-gray-500">Thanks for the update on Max!</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#FF9800] rounded-full flex items-center justify-center text-white text-xs font-semibold">MR</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Mike Roberts</p>
                        <p className="text-xs text-gray-500">Can we reschedule pickup?</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <Button variant="ghost" className="w-full text-sm">View All Messages</Button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
              onClick={() => {
                closeAllMenus();
                setUserMenuOpen(!userMenuOpen);
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name ?? 'Guest User'}</p>
                <p className="text-xs opacity-80">{role ?? 'OWNER'}</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeAllMenus}
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>
                <Link
                  to="/settings/billing"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeAllMenus}
                >
                  <Settings className="h-4 w-4" />
                  Billing & Plans
                </Link>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  onClick={() => {
                    // Handle logout
                    closeAllMenus();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default JumboHeader;
