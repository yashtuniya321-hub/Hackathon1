import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Navbar } from '../common/Navbar';
import { Toast } from '../common/Toast';
import { useBrightloop } from '../../context/BrightloopContext';
import { ShieldAlert, ExternalLink } from 'lucide-react';

export const AppLayout = () => {
  const { currentUser, switchDemoRole } = useBrightloop();
  const location = useLocation();

  // If the logged in role is strictly 'Customer' and they are not on '/portal', provide a quick banner
  const isCustomerRole = currentUser?.role === 'Customer';

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        {isCustomerRole && !location.pathname.startsWith('/portal') && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Customer Role Active:</strong> You are browsing internal ERP views in read/demo preview. For the self-service customer experience, switch to the Customer Portal.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/portal"
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs flex items-center gap-1"
              >
                Go to Portal <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => switchDemoRole('Admin')}
                className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-800 font-medium hover:bg-amber-100"
              >
                Switch to Admin
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  );
};
