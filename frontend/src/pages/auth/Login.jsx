import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBrightloop } from '../../context/BrightloopContext';
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, UserPlus } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole } = useBrightloop();

  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('Admin@2026!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.user.role === 'Customer') {
        navigate('/portal');
      } else {
        navigate('/analytics');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role) => {
    switchDemoRole(role);
    if (role === 'Customer') navigate('/portal');
    else navigate('/analytics');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#F2EDF1] to-[#E6F6F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#714B67] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#714B67]/30">
            B
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Brightloop ERP
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Odoo x Flux Hackathon 2026 — Subscription Management System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                  placeholder="admin@brightloop.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-medium text-[#714B67] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#714B67] hover:bg-[#5d3d54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#714B67] transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Logins for Judges */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Evaluation Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin')}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-[11px] font-semibold text-[#714B67] text-center transition"
              >
                Admin Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Internal Staff')}
                className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-[11px] font-semibold text-[#00A09D] text-center transition"
              >
                Staff Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Customer')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center transition"
              >
                Customer Demo
              </button>
            </div>
          </div>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Need a new customer account?{' '}
              <Link to="/auth/signup" className="font-semibold text-[#714B67] hover:underline">
                Register company
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
