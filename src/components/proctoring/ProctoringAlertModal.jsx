import React from 'react';

/**
 * Modal shown when backend proctoring detects a violation (no_face, multiple_faces, looking_left, etc.).
 * Displayed as soon as streaming/test has started and a violation is received.
 */
export default function ProctoringAlertModal({ alert, onDismiss }) {
  if (!alert?.message) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-labelledby="proctoring-alert-title"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-orange-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 id="proctoring-alert-title" className="text-lg font-semibold text-gray-900">
            Proctoring notice
          </h2>
        </div>
        <p className="text-gray-700 mb-6">{alert.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white shadow-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          OK
        </button>
      </div>
    </div>
  );
}
