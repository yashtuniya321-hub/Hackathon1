import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  Zap,
  Activity,
  RotateCcw,
  Shield,
  UserCheck,
  User,
  ChevronDown,
  LogOut,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    switchDemoRole,
    renderDuration,
    backendStatus,
    triggerStressTest,
    resetAllData,
    logout,
    subscriptions
  } = useBrightloop();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Generate readable breadcrumb
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbTitle = pathSegments.length === 0
    ? 'Analytics Dashboard'
    : pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      triggerStressTest(2500);
      setIsSimulating(false);
    }, 50);
  };

  const handleRoleSelect = async (roleName) => {
    await switchDemoRole(roleName);
    if (roleName === 'Customer') {
      navigate('/portal');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Breadcrumbs & Odoo Hackathon Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Odoo ERP</span>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {breadcrumbTitle}
              {subscriptions.length > 500 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-[#714B67] rounded-full border border-purple-200">
                  {subscriptions.length.toLocaleString()} active items
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Center / Right: Demo Role Switcher, Performance SLA, Stress Test */}
        <div className="flex items-center flex-wrap gap-2.5 ml-auto">
          {/* Live PostgreSQL Backend Connection Pill */}
          <div
            title={`Connected to Node.js + Express + PostgreSQL Backend on Port 4000 (Latency: ${backendStatus?.latencyMs || renderDuration}ms)`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-emerald-50 border-emerald-200 text-emerald-800"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold hidden md:inline">PostgreSQL Backend</span>
            <span className="text-emerald-700 font-mono text-[11px]">:4000</span>
          </div>

          {/* SLA Performance Indicator */}
          <div
            title="Real-time Client & State Execution Benchmark against the 2,000ms SLA"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-slate-50 border-slate-200"
          >
            <span className={`w-2 h-2 rounded-full ${renderDuration < 50 ? 'bg-emerald-500 animate-pulse' : renderDuration < 500 ? 'bg-amber-500' : 'bg-rose-500'}`} />
            <span className="text-slate-600 font-mono">
              {renderDuration}ms
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">(&lt; 2000ms SLA)</span>
          </div>

          {/* Stress Test Simulation Button */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
            title="Stress-test client virtualization and calculations with 2,500 active subscriptions"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'text-amber-500 animate-spin' : 'text-amber-600'}`} />
            <span>Simulate 2,500 Subs</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={resetAllData}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
            title="Reset dataset to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* DEMO ROLE SWITCHER PILL (Judges 1-click RBAC testing) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 role-switcher">
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              Role:
            </span>
            <button
              onClick={() => handleRoleSelect('Admin')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                currentUser?.role === 'Admin'
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => handleRoleSelect('Internal Staff')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                currentUser?.role === 'Internal Staff'
                  ? 'bg-[#00A09D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Internal Staff
            </button>
            <button
              onClick={() => handleRoleSelect('Customer')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                currentUser?.role === 'Customer'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Customer Portal
            </button>
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded hover:bg-slate-100 transition"
            >
              <div className="w-7 h-7 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser?.name || 'Guest'}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {currentUser?.role || 'Sign In'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-slate-800">{currentUser?.name}</p>
                  <p className="text-slate-500 truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-[#714B67]">
                    Role: {currentUser?.role}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/portal"
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 transition"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    Customer Portal View
                  </Link>
                  <Link
                    to="/auth/login"
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Switch / Login Screen
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/auth/login');
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
