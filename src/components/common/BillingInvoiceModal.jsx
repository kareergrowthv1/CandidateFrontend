import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, CheckCircle2, Clock, ShieldCheck, Mail, CreditCard, Receipt } from 'lucide-react';

const BillingInvoiceModal = ({ isOpen, onClose, invoice }) => {
  if (!isOpen || !invoice) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900"
        >
          {/* Header Actions */}
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            <button className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
              <Printer size={18} />
            </button>
            <button className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-8">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-slate-100 pb-8 dark:border-zinc-800">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Invoice</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1">{invoice.invoice_number || 'INV-C-PENDING'}</p>
                </div>
              </div>
              
              <div className="text-right space-y-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  invoice.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                }`}>
                  {invoice.status === 'COMPLETED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {invoice.status}
                </div>
                <p className="text-sm text-slate-500">Date: {formatDate(invoice.payment_date || invoice.created_at)}</p>
              </div>
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100 dark:border-zinc-800">
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Billed To</p>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">Candidate Account</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={14} />
                    <span>Reference ID: {invoice.id.toString().slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4 md:text-right">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payment Information</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 md:justify-end">
                    <CreditCard size={14} />
                    <span>Razorpay - {invoice.currency}</span>
                  </div>
                  <p className="text-xs text-slate-400">Order: {invoice.transaction_id || 'N/A'}</p>
                  {invoice.razorpay_payment_id && (
                    <p className="text-xs text-slate-400">Payment ID: {invoice.razorpay_payment_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-8">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-50 dark:border-zinc-800/50">
                    <th className="pb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="pb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/50">
                  <tr>
                    <td className="py-6">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">{invoice.planName || 'KareerGrowth Subscription'}</p>
                        <p className="text-sm text-slate-500">Full access to candidate dashboard and features</p>
                      </div>
                    </td>
                    <td className="py-6 text-right font-bold text-slate-900 dark:text-white">
                      {invoice.amount} {invoice.currency}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 dark:border-white">
                    <td className="pt-6 font-bold text-slate-900 dark:text-white uppercase tracking-wider">Total Paid</td>
                    <td className="pt-6 text-right text-xl font-black text-slate-900 dark:text-white">
                      {invoice.amount} {invoice.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50 p-4 rounded-2xl dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Verified by KareerGrowth Billing System</span>
              </div>
              <span>Digital Receipt • {new Date().getFullYear()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BillingInvoiceModal;
