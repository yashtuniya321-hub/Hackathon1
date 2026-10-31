import React, { useState } from 'react';
import { useBrightloop } from '../../context/BrightloopContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Mail,
  Building,
  CheckCircle2,
  Lock,
  Plus
} from 'lucide-react';

export const StaffManagement = () => {
  const { currentUser, staff, createStaff, deleteStaff } = useBrightloop();

  const isAdmin = currentUser?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Internal Staff',
    department: 'Sales & Customer Operations'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = () => {
    if (!isAdmin) return;
    setError('');
    setFormData({
      name: '',
      email: '',
      role: 'Internal Staff',
      department: 'Sales & Customer Operations'
    });
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Permission Denied: Only Admin can add staff members.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createStaff(formData);
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to create staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, staffName) => {
    if (!isAdmin) return;
    if (window.confirm(`Are you sure you want to remove ${staffName} from staff?`)) {
      await deleteStaff(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Staff & Role-Based Access Control</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-[#714B67] border border-purple-200">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization members, assign operational permissions, and audit role elevation.
          </p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Admin only permission</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Access Matrix Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#714B67]" />
            <h3>Admin Role</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Full root privileges. Exclusively configures subscription plans, products, pricing variants, discounts, taxes, and adds new staff members.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A09D]" />
            <h3>Internal Staff Role</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Customer operations team. Handles day-to-day quotations, billing cycles, payments, and invoices. Restricted from adding staff or modifying catalog/plans.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <h3>Customer Role</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            End-user self-service portal. Restricted to viewing only their own subscriptions, toggling approved add-ons, and downloading/paying invoices.
          </p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">
            Registered Internal Staff ({staff.length})
          </h3>
          <span className="text-xs text-slate-500">
            Live Staff Directory
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-bold text-xs uppercase">
                      {member.name.charAt(0)}
                    </div>
                    <span>{member.name}</span>
                    {currentUser?.email === member.email && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{member.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      member.role === 'Admin'
                        ? 'bg-purple-100 text-[#714B67] border border-purple-200'
                        : 'bg-teal-50 text-[#00A09D] border border-teal-200'
                    }`}>
                      {member.role === 'Admin' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{member.department}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{member.joinedDate}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isAdmin && member.email !== currentUser?.email ? (
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-300 text-[11px]">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#714B67]" />
                <h3 className="font-bold text-slate-800 text-sm">Add New Staff Member</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
                  placeholder="e.g. Rachel Miller"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
                  placeholder="rachel@brightloop.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
                >
                  <option value="Internal Staff">Internal Staff (Customer Operations, Billing, Sales)</option>
                  <option value="Admin">Admin (Full Control, Products, Plans, Discounts)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-[#714B67] focus:border-[#714B67]"
                  placeholder="e.g. Sales, Billing, Customer Success"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#714B67] text-white rounded-lg text-xs font-semibold hover:bg-[#5d3d54] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
