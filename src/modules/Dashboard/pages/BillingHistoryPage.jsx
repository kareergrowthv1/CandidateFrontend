import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, Receipt } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';

/* ─── helpers ─── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'N/A';

/* ─── Invoice Modal ─── */
const InvoiceModal = ({ invoice, onClose }) => {
  if (!invoice) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8 space-y-6">
          {/* Header row */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Tax Invoice</p>
              <p className="text-lg font-bold text-slate-900">{invoice.invoice_number || 'INV-C-PENDING'}</p>
              <p className="text-xs text-slate-400 mt-1">{fmtDateTime(invoice.payment_date || invoice.created_at)}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              invoice.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>
              {invoice.status === 'COMPLETED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {invoice.status}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
              <p className="text-sm font-semibold text-slate-800">Razorpay · {invoice.currency || 'INR'}</p>
              <p className="text-xs text-slate-400 font-mono mt-1 break-all">{invoice.transaction_id || '—'}</p>
              {invoice.razorpay_payment_id && (
                <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">{invoice.razorpay_payment_id}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Plan</p>
              <p className="text-sm font-semibold text-slate-800">{invoice.planName || '—'}</p>
              {invoice.valid_till && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1">Valid Till</p>
                  <p className="text-sm font-semibold text-slate-800">{fmtDate(invoice.valid_till)}</p>
                </>
              )}
            </div>
          </div>

          {/* Line item */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left">Description</th>
                <th className="py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-5">
                  <p className="font-semibold text-slate-900">{invoice.planName || 'KareerGrowth Subscription'}</p>
                  <p className="text-xs text-slate-400 mt-1">Full platform access — candidate dashboard &amp; features</p>
                </td>
                <td className="py-5 text-right font-bold text-slate-900">₹{invoice.amount}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td className="pt-4 font-bold text-slate-900 text-sm uppercase tracking-wider">Total Paid</td>
                <td className="pt-4 text-right font-black text-slate-900 text-xl">₹{invoice.amount}</td>
              </tr>
            </tfoot>
          </table>

          {/* footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
            <span>✓ Verified · KareerGrowth Billing System</span>
            <span>Digital Receipt · {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
  const cfg = {
    COMPLETED: { cls: 'bg-green-50 text-green-600 border-green-100', icon: <CheckCircle2 size={11} /> },
    PENDING:   { cls: 'bg-orange-50 text-orange-600 border-orange-100', icon: <Clock size={11} /> },
    FAILED:    { cls: 'bg-red-50 text-red-600 border-red-100', icon: <AlertCircle size={11} /> },
  };
  const { cls, icon } = cfg[status] || cfg.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-normal border ${cls}`}>
      {icon}{status}
    </span>
  );
};

/* ─── Main page ─── */
const BillingHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchHistoryAndCredits = async () => {
    try {
      setLoading(true);
      const [histRes, credRes] = await Promise.allSettled([
        paymentService.getHistory(),
        paymentService.getCredits()
      ]);
      
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data || []);
      }
      
      if (credRes.status === 'fulfilled' && credRes.value.data?.hasActivePlan) {
        setCredits(credRes.value.data);
      }
    } catch (e) {
      console.error('Billing fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistoryAndCredits(); }, []);

  // Summary values
  const totalPaid = history
    .filter(p => p.status === 'COMPLETED')
    .reduce((a, p) => a + parseFloat(p.amount || 0), 0);
  const activePlan = history.find(p => p.is_active)?.planName || 'None';

  return (
    <div className="space-y-6">
      {/* Credits Overview */}
      {credits && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Credits Overview</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your current <span className="font-semibold text-slate-700">{credits.planName}</span> plan limits and usage.
              </p>
            </div>
            {credits.validTill && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valid Till</p>
                <p className="text-sm font-semibold text-slate-800">{fmtDate(credits.validTill)}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Allocated</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900">{credits.totalAllocated}</p>
                <span className="text-xs font-semibold text-slate-500">Credits</span>
              </div>
            </div>
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-wider mb-2">Credits Utilized</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-blue-600">{credits.utilized}</p>
                <span className="text-xs font-semibold text-blue-500/80">Used</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider mb-2">Credits Remaining</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-emerald-600">{credits.remaining}</p>
                <span className="text-xs font-semibold text-emerald-500/80">Available</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <div className="relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="pl-8 pr-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[24%]">Invoice #</th>
                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[14%]">Plan</th>
                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[14%]">Date</th>
                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[14%]">Valid Till</th>
                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]">Amount</th>
                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[12%]">Status</th>
                <th className="pr-8 pl-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right w-[8%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400 text-sm">
                    No payment records found
                  </td>
                </tr>
              ) : (
                history.map((p, i) => (
                  <tr
                    key={p.id || i}
                    className="hover:bg-slate-100/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedInvoice(p)}
                  >
                    {/* Invoice # */}
                    <td className="pl-8 pr-2 py-4">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {p.invoice_number || 'INV-C-PENDING'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {p.id?.toString().slice(0, 8)}…
                      </p>
                    </td>
                    {/* Plan */}
                    <td className="px-2 py-4 text-xs font-normal text-slate-900">
                      {p.planName || '—'}
                    </td>
                    {/* Date */}
                    <td className="px-2 py-4 text-xs font-normal text-slate-900 whitespace-nowrap">
                      {fmtDate(p.payment_date || p.created_at)}
                    </td>
                    {/* Valid Till */}
                    <td className="px-2 py-4 text-xs font-normal text-slate-900 whitespace-nowrap">
                      {p.valid_till ? fmtDate(p.valid_till) : '—'}
                    </td>
                    {/* Amount */}
                    <td className="px-2 py-4 text-xs font-bold text-slate-900">
                      ₹{p.amount}
                    </td>
                    {/* Status */}
                    <td className="px-2 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    {/* Action */}
                    <td className="pr-8 pl-2 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedInvoice(p); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <Receipt size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice modal */}
      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};

export default BillingHistoryPage;
