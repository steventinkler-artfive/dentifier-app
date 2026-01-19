import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Users, Camera, FileText, TrendingUp, Settings } from "lucide-react";
import { AlertProvider } from "@/components/ui/CustomAlert";
import InactiveUserBanner from "@/components/InactiveUserBanner";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  // Scroll to top whenever location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navigationItems = [
    { name: "Home", url: createPageUrl("Dashboard"), icon: Home },
    { name: "Customers", url: createPageUrl("Customers"), icon: Users },
    { name: "Assessment", url: createPageUrl("Assessment"), icon: Camera },
    { name: "Quotes", url: createPageUrl("Quotes"), icon: FileText },
    { name: "Reports", url: createPageUrl("Reports"), icon: TrendingUp }
  ];


  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>
        {`
          :root {
            --primary-navy: #020617;
            --secondary-navy: #0F172A;
            --accent-pink: #E11D48;
            --accent-pink-hover: #BE123C;
            --text-primary: #F8FAFC;
            --text-secondary: #94A3B8;
            --border-color: #1E293B;
          }
          
          .glass-effect {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .pink-gradient {
            background: linear-gradient(135deg, var(--accent-pink), #F43F5E);
          }
          
          .nav-item-inactive {
            color: var(--text-secondary);
          }
          
          .nav-item-inactive:hover {
            background: var(--secondary-navy);
            color: var(--text-primary);
          }
          
          .custom-shadow {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }

          /* Hide app UI elements when printing */
          @media print {
            .print\\:hidden {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Header - Hidden when printing */}
      <header className="bg-slate-900 px-4 border-b border-slate-800 print:hidden h-20 flex items-center">
        <div className="flex items-center justify-between max-w-md mx-auto w-full">
          <div className="flex items-center">
            <Link to={createPageUrl("Dashboard")} className="cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a8991579d29e7c386105d5/4087c6169_Asset19hi-res.png"
                alt="Dentifier" 
                className="h-[3.25rem] w-auto object-contain mt-2"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-xl font-bold text-white">Dentifier</span>';
                }}
              />
            </Link>
          </div>
          <div className="flex items-center">
            <Link to={createPageUrl("Settings")}>
              <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                <Settings className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 min-h-screen">
        <AlertProvider>
          {!loadingUser && <InactiveUserBanner user={currentUser} />}
          {children}
        </AlertProvider>
      </main>

      {/* Bottom Navigation - Hidden when printing */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 print:hidden">
        <div className="flex justify-around items-center py-2 max-w-md mx-auto">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.name}
                to={item.url}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-rose-600 text-white' : 'nav-item-inactive'}`
                }>
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}