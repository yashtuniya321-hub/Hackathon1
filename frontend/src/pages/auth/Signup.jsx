import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBrightloop } from '../../context/BrightloopContext';
import { Lock, Mail, Building, User, Phone, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useBrightloop();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password validation checks
  const password = formData.password;
  const hasLength = password.length > 8; // > 8 characters requirement
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not satisfy all security criteria.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(formData);
      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Signup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#F2EDF1] to-[#E6F6F6] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#714B67] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#714B67]/30">
            B
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Create Customer Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Self-service access to subscriptions, invoices, and license management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-7 px-6 shadow-xl rounded-2xl sm:px-8 border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Company Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="Acme Innovations Ltd"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address (Unique)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="jane@acme.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="+1 (555) 019-2831"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="P@ssw0rd2026!"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Confirm Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-[#714B67] focus:border-[#714B67]"
                    placeholder="P@ssw0rd2026!"
                  />
                </div>
              </div>
            </div>

            {/* Live Password Validation Requirement Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                Live Password Security Checklist
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  {hasLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span>&gt; 8 Characters ({password.length}/9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span>1 Uppercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  {hasLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span>1 Lowercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                  {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                  <span>1 Special Character (!@#$)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#714B67] hover:bg-[#5d3d54] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Registering Account...' : 'Create Account & Enter Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-semibold text-[#714B67] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
