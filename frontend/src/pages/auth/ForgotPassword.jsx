import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrightloop } from '../../context/BrightloopContext';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';

export const ForgotPassword = () => {
  const { requestPasswordReset } = useBrightloop();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#F2EDF1] to-[#E6F6F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#714B67] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#714B67]/30">
            B
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Enter your registered email address to receive secure recovery steps
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Password Recovery Dispatched
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We have generated a secure one-time recovery token and dispatched it to{' '}
                <strong className="text-slate-800">{email}</strong>. Please check your inbox and spam folder.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono text-slate-600">
                <span className="text-[10px] text-slate-400 block font-sans">Simulated Token Header:</span>
                Bearer reset_tok_2026_xyz99a7b
              </div>
              <div className="pt-2">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Registered Email</label>
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
                    placeholder="elena@apexretail.io"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#714B67] hover:bg-[#5d3d54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#714B67] transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel & Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
