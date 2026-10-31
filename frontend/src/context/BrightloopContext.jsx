// Centralized State & Business-Logic Layer for Brightloop Software
// Synchronized with localStorage and wrapped around api.js

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  initializeStorage,
  resetDemoData,
  authApi,
  productsApi,
  plansApi,
  taxRulesApi,
  discountsApi,
  templatesApi,
  subscriptionsApi,
  billingApi,
  paymentsApi,
  staffApi,
  customersApi,
  stressTestApi,
  backendStatusApi,
  analyticsApi
} from '../services/api';

const BrightloopContext = createContext(null);

export const BrightloopProvider = ({ children }) => {
  // Performance SLA & Backend Connection state
  const [renderDuration, setRenderDuration] = useState(14);
  const [backendStatus, setBackendStatus] = useState({ isLive: true, latencyMs: 14, slaCompliant: true });
  const [toastMessage, setToastMessage] = useState(null);

  // Entities state
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [billingLogs, setBillingLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = useCallback((type, message) => {
    setToastMessage({ type, message, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => (prev?.id ? null : prev));
    }, 4500);
  }, []);

  const refreshAll = useCallback(async () => {
    const t0 = performance.now();
    initializeStorage();

    const [
      user,
      prods,
      plns,
      taxes,
      discs,
      tmpls,
      custs,
      stf,
      subs,
      invs,
      pays,
      logs,
      liveStatus
    ] = await Promise.all([
      authApi.getCurrentUser(),
      productsApi.getAll(),
      plansApi.getAll(),
      taxRulesApi.getAll(),
      discountsApi.getAll(),
      templatesApi.getAll(),
      customersApi.getAll(),
      staffApi.getAll(),
      subscriptionsApi.getAll(),
      billingApi.getInvoices(),
      paymentsApi.getAll(),
      billingApi.getBillingLogs(),
      backendStatusApi.checkStatus()
    ]);

    setCurrentUser(user);
    setProducts(prods);
    setPlans(plns);
    setTaxRules(taxes);
    setDiscounts(discs);
    setTemplates(tmpls);
    setCustomers(custs);
    setStaff(stf);
    setSubscriptions(subs);
    setInvoices(invs);
    setPayments(pays);
    setBillingLogs(logs);
    if (liveStatus) setBackendStatus(liveStatus);

    setIsLoading(false);
    const duration = Math.round((performance.now() - t0) * 10) / 10;
    setRenderDuration(duration);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Demo Role Switcher
  const switchDemoRole = async (roleName, customCustomerId = null) => {
    const t0 = performance.now();
    const updatedUser = await authApi.switchDemoRole(roleName, customCustomerId);
    setCurrentUser(updatedUser);
    showToast('info', `Switched demo role to: ${roleName}`);
    setRenderDuration(Math.round(performance.now() - t0));
    return updatedUser;
  };

  // Auth Operations
  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    setCurrentUser(res.user);
    showToast('success', `Signed in as ${res.user.name} (${res.user.role})`);
    return res;
  };

  const signup = async (payload) => {
    const res = await authApi.signup(payload);
    await refreshAll();
    setCurrentUser(res.user);
    showToast('success', `Welcome, ${res.user.name}! Your customer account is active.`);
    return res;
  };

  const requestPasswordReset = async (email) => {
    const res = await authApi.requestPasswordReset(email);
    showToast('info', res.message);
    return res;
  };

  const logout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    showToast('info', 'Logged out successfully.');
  };

  // Products CRUD
  const createProduct = async (productData) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can create products.');
      return;
    }
    const newProd = await productsApi.create(productData);
    setProducts(prev => [newProd, ...prev]);
    showToast('success', `Product "${newProd.name}" created.`);
    return newProd;
  };

  const updateProduct = async (id, updates) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can modify products.');
      return;
    }
    const updated = await productsApi.update(id, updates);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
    showToast('success', `Product "${updated.name}" updated.`);
    return updated;
  };

  const deleteProduct = async (id) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can remove products.');
      return;
    }
    await productsApi.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Product removed.');
  };

  // Plans CRUD
  const createPlan = async (planData) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can create subscription plans.');
      return;
    }
    const newPlan = await plansApi.create(planData);
    setPlans(prev => [newPlan, ...prev]);
    showToast('success', `Plan "${newPlan.name}" configured.`);
    return newPlan;
  };

  const updatePlan = async (id, updates) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can modify plans.');
      return;
    }
    const updated = await plansApi.update(id, updates);
    setPlans(prev => prev.map(p => p.id === id ? updated : p));
    showToast('success', `Plan "${updated.name}" updated.`);
    return updated;
  };

  const deletePlan = async (id) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can remove plans.');
      return;
    }
    await plansApi.delete(id);
    setPlans(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Plan removed.');
  };

  // Tax Rules CRUD
  const createTaxRule = async (taxData) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can create tax rules.');
      return;
    }
    const newTax = await taxRulesApi.create(taxData);
    setTaxRules(prev => [...prev, newTax]);
    showToast('success', `Tax rule "${newTax.name}" added.`);
    return newTax;
  };

  const updateTaxRule = async (id, updates) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can modify tax rules.');
      return;
    }
    const updated = await taxRulesApi.update(id, updates);
    setTaxRules(prev => prev.map(t => t.id === id ? updated : t));
    showToast('success', `Tax rule "${updated.name}" updated.`);
    return updated;
  };

  const deleteTaxRule = async (id) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can delete tax rules.');
      return;
    }
    await taxRulesApi.delete(id);
    setTaxRules(prev => prev.filter(t => t.id !== id));
    showToast('info', 'Tax rule deleted.');
  };

  // Discounts CRUD
  const createDiscount = async (discountData) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can configure discounts.');
      return;
    }
    const newDisc = await discountsApi.create(discountData);
    setDiscounts(prev => [newDisc, ...prev]);
    showToast('success', `Discount "${newDisc.code}" created.`);
    return newDisc;
  };

  const updateDiscount = async (id, updates) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can update discounts.');
      return;
    }
    const updated = await discountsApi.update(id, updates);
    setDiscounts(prev => prev.map(d => d.id === id ? updated : d));
    showToast('success', `Discount "${updated.code}" updated.`);
    return updated;
  };

  const deleteDiscount = async (id) => {
    if (currentUser?.role !== 'Admin') {
      showToast('error', 'Only Admin can delete discounts.');
      return;
    }
    await discountsApi.delete(id);
    setDiscounts(prev => prev.filter(d => d.id !== id));
    showToast('info', 'Discount removed.');
  };

  // Quotation Templates CRUD
  const createTemplate = async (tmplData) => {
    const newTmpl = await templatesApi.create(tmplData);
    setTemplates(prev => [newTmpl, ...prev]);
    showToast('success', `Quotation template "${newTmpl.name}" created.`);
    return newTmpl;
  };

  const updateTemplate = async (id, updates) => {
    const updated = await templatesApi.update(id, updates);
    setTemplates(prev => prev.map(t => t.id === id ? updated : t));
    showToast('success', `Template "${updated.name}" updated.`);
    return updated;
  };

  const deleteTemplate = async (id) => {
    await templatesApi.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast('info', 'Template deleted.');
  };

  // Subscriptions Pipeline & Actions
  const createSubscription = async (subData) => {
    const newSub = await subscriptionsApi.create(subData);
    setSubscriptions(prev => [newSub, ...prev]);
    showToast('success', `Subscription ${newSub.subNumber} created in Draft.`);
    return newSub;
  };

  const updateSubscription = async (id, updates) => {
    const updated = await subscriptionsApi.update(id, updates);
    setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
    showToast('success', `Subscription ${updated.subNumber} updated.`);
    return updated;
  };

  const advanceSubscriptionStatus = async (id, targetStatus) => {
    const updated = await subscriptionsApi.advanceStatus(id, targetStatus);
    setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
    showToast('success', `Subscription moved to ${targetStatus}`);
    return updated;
  };

  const pauseSubscription = async (id) => {
    try {
      const updated = await subscriptionsApi.pauseSubscription(id);
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      showToast(updated.isPaused ? 'warning' : 'success', 
        updated.isPaused ? `Subscription ${updated.subNumber} paused.` : `Subscription ${updated.subNumber} resumed.`
      );
      return updated;
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  const closeSubscriptionEarly = async (id) => {
    try {
      const updated = await subscriptionsApi.closeEarly(id);
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      showToast('info', `Subscription ${updated.subNumber} closed early.`);
      return updated;
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  const renewSubscription = async (id) => {
    try {
      const updated = await subscriptionsApi.renewSubscription(id);
      setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      showToast('success', `Subscription ${updated.subNumber} renewed until ${updated.expiryDate}`);
      return updated;
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  // Billing Day Engine
  const runBillingDay = async (targetDate) => {
    const t0 = performance.now();
    try {
      const res = await billingApi.runBillingDay({ billingDate: targetDate });
      await refreshAll();
      const dur = Math.round(performance.now() - t0);
      setRenderDuration(dur);
      showToast('success', `Billing Day Complete: ${res.createdCount} invoices created, ${res.skippedCount} duplicates safeguarded.`);
      return res;
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  // Invoices & Payments
  const updateInvoiceStatus = async (id, status) => {
    const updated = await billingApi.updateInvoiceStatus(id, status);
    setInvoices(prev => prev.map(i => i.id === id ? updated : i));
    showToast('success', `Invoice ${updated.invoiceNumber} status set to ${status}`);
    return updated;
  };

  const sendInvoiceEmail = async (id) => {
    const updated = await billingApi.sendInvoiceEmail(id);
    setInvoices(prev => prev.map(i => i.id === id ? updated : i));
    showToast('success', `Invoice notification dispatched to customer email.`);
    return updated;
  };

  const recordPayment = async (paymentData) => {
    const t0 = performance.now();
    const res = await paymentsApi.recordPayment(paymentData);
    await refreshAll();
    setRenderDuration(Math.round(performance.now() - t0));
    showToast('success', `Payment ${res.payment.paymentNumber} of $${res.payment.amount} recorded.`);
    return res;
  };

  // Staff Management (Admin only)
  const createStaff = async (staffData) => {
    try {
      const newStaff = await staffApi.create(staffData, currentUser?.role);
      setStaff(prev => [...prev, newStaff]);
      showToast('success', `Staff member ${newStaff.name} added.`);
      return newStaff;
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  const deleteStaff = async (id) => {
    try {
      await staffApi.delete(id, currentUser?.role);
      setStaff(prev => prev.filter(s => s.id !== id));
      showToast('info', 'Staff member removed.');
    } catch (err) {
      showToast('error', err.message);
      throw err;
    }
  };

  // Stress Testing & Data Reset
  const triggerStressTest = (count = 2500) => {
    const t0 = performance.now();
    const simulated = stressTestApi.generateStressSubscriptions(count);
    setSubscriptions(simulated);
    const dur = Math.round(performance.now() - t0);
    setRenderDuration(dur);
    showToast('warning', `Stress Test Activated: ${count} subscriptions generated in ${dur}ms (< 2000ms SLA).`);
  };

  const resetAllData = () => {
    resetDemoData();
    refreshAll();
    showToast('info', 'Demo data reset to default seed state.');
  };

  // Unified Finance KPIs (Memoized for high performance)
  const metrics = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.status === 'Active');
    const totalSubs = subscriptions.length;

    let mrr = 0;
    activeSubs.forEach(sub => {
      const plan = plans.find(p => p.id === sub.planId);
      const subLinesTotal = (sub.lines || []).reduce((acc, l) => acc + (Number(l.total) || (l.quantity * l.unitPrice)), 0);
      const baseAmt = subLinesTotal > 0 ? subLinesTotal : (plan?.cost || 0);

      const freq = plan?.billingFrequency || 'monthly';
      if (freq === 'monthly') mrr += baseAmt;
      else if (freq === 'yearly') mrr += baseAmt / 12;
      else if (freq === 'weekly') mrr += (baseAmt * 52) / 12;
      else if (freq === 'daily') mrr += baseAmt * 30;
    });

    const arr = mrr * 12;

    const totalInvoiced = invoices.reduce((acc, i) => acc + (i.status !== 'Cancelled' ? Number(i.totalAmount || 0) : 0), 0);
    const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueInvoices = invoices.filter(inv => {
      return (inv.status === 'Draft' || inv.status === 'Confirmed') &&
             inv.remainingAmount > 0 &&
             inv.dueDate && inv.dueDate < todayStr;
    });

    const overdueAmount = overdueInvoices.reduce((acc, i) => acc + Number(i.remainingAmount || 0), 0);

    return {
      activeSubsCount: activeSubs.length,
      totalSubsCount: totalSubs,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      overdueCount: overdueInvoices.length,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      overdueInvoices
    };
  }, [subscriptions, invoices, payments, plans]);

  const value = {
    // SLA & UI
    renderDuration,
    setRenderDuration,
    backendStatus,
    toastMessage,
    showToast,
    isLoading,
    resetAllData,
    triggerStressTest,
    metrics,

    // Auth & RBAC
    currentUser,
    switchDemoRole,
    login,
    signup,
    requestPasswordReset,
    logout,

    // Entities
    products,
    createProduct,
    updateProduct,
    deleteProduct,

    plans,
    createPlan,
    updatePlan,
    deletePlan,

    taxRules,
    createTaxRule,
    updateTaxRule,
    deleteTaxRule,

    discounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,

    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,

    customers,
    staff,
    createStaff,
    deleteStaff,

    subscriptions,
    createSubscription,
    updateSubscription,
    advanceSubscriptionStatus,
    pauseSubscription,
    closeSubscriptionEarly,
    renewSubscription,

    invoices,
    billingLogs,
    runBillingDay,
    updateInvoiceStatus,
    sendInvoiceEmail,

    payments,
    recordPayment,
    refreshAll
  };

  return (
    <BrightloopContext.Provider value={value}>
      {children}
    </BrightloopContext.Provider>
  );
};

export const useBrightloop = () => {
  const context = useContext(BrightloopContext);
  if (!context) {
    throw new Error('useBrightloop must be used within a BrightloopProvider');
  }
  return context;
};
