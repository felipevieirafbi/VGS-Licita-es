import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Trello, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { userData, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Kanban', href: '/kanban', icon: Trello },
    { name: 'Calendário', href: '/calendar', icon: CalendarIcon },
    ...(userData?.role === 'admin' ? [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">VGS Licitações</h1>
          <p className="text-blue-300 text-sm mt-1">Área Restrita</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive ? "bg-blue-800 text-white font-medium" : "text-blue-100 hover:bg-blue-800/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            {userData?.avatar_url ? (
              <img src={userData.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold">
                {userData?.name?.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{userData?.name}</p>
              <p className="text-xs text-blue-300 capitalize">{userData?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
