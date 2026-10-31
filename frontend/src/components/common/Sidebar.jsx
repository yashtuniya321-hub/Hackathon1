import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  LayoutDashboard,
  Repeat,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Package,
  Tags,
  Users,
  UserCheck,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  CalendarCheck,
  Percent
} from 'lucide-react';

export const Sidebar = () => {
  const { currentUser } = useBrightloop();
  const location = useLocation();

  const isAdmin = currentUser?.role === 'Admin';
  const isStaff = currentUser?.role === 'Internal Staff' || isAdmin;

  const navLinkClasses = ({ isActive }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-[#714B67] text-white shadow-sm font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 no-print select-none">
      {/* Brand & App Title */}
      <div>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#714B67] to-[#00A09D] flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#714B67]/20">
            B
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 tracking-tight text-base">Brightloop</span>
              <span className="px-1.5 py-0.2 bg-[#00A09D]/10 text-[#00A09D] rounded text-[10px] font-bold">ERP</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Odoo x Flux Hackathon</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)]">
          {/* Main ERP Operations */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Operations & Sales
            </p>
            <nav className="space-y-1">
              <NavLink to="/analytics" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Finance Dashboard</span>
                </div>
              </NavLink>

              <NavLink to="/subscriptions" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4" />
                  <span>Subscriptions</span>
                </div>
              </NavLink>

              <NavLink to="/templates" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Quotation Templates</span>
                </div>
              </NavLink>
            </nav>
          </div>

          {/* Billing & Finance */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Billing & Invoices
            </p>
            <nav className="space-y-1">
              <NavLink to="/billing" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4" />
                  <span>Run Billing Day</span>
                </div>
              </NavLink>

              <NavLink to="/invoices" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  <span>Customer Invoices</span>
                </div>
              </NavLink>

              <NavLink to="/payments" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Payments & Overdue</span>
                </div>
              </NavLink>
            </nav>
          </div>

          {/* Admin Configuration Engine (Restricted) */}
          <div>
            <div className="px-3 flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Configuration
              </p>
              {!isAdmin && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <Lock className="w-2.5 h-2.5" /> Admin Only
                </span>
              )}
            </div>

            <nav className="space-y-1">
              {isAdmin ? (
                <>
                  <NavLink to="/catalog" className={navLinkClasses}>
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4" />
                      <span>Products & Plans</span>
                    </div>
                  </NavLink>

                  <NavLink to="/discounts" className={navLinkClasses}>
                    <div className="flex items-center gap-2.5">
                      <Percent className="w-4 h-4" />
                      <span>Discount Engine</span>
                    </div>
                  </NavLink>

                  <NavLink to="/staff" className={navLinkClasses}>
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4" />
                      <span>Staff & RBAC</span>
                    </div>
                  </NavLink>
                </>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Admin Access Required
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Staff members cannot modify products, subscription plans, taxes, discounts, or invite staff. Use the Role Switcher above to test Admin.
                  </p>
                </div>
              )}
            </nav>
          </div>

          {/* Customer Self-Service Portal Link */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              End-User View
            </p>
            <nav className="space-y-1">
              <NavLink to="/portal" className={navLinkClasses}>
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-[#00A09D]" />
                  <span>Customer Portal</span>
                </div>
              </NavLink>
            </nav>
          </div>
        </div>
      </div>

      {/* Role Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium">Logged as:</span>
          </div>
          <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
            isAdmin
              ? 'bg-[#714B67]/10 text-[#714B67]'
              : currentUser?.role === 'Internal Staff'
              ? 'bg-[#00A09D]/10 text-[#00A09D]'
              : 'bg-slate-200 text-slate-800'
          }`}>
            {currentUser?.role || 'Guest'}
          </span>
        </div>
      </div>
    </aside>
  );
};
