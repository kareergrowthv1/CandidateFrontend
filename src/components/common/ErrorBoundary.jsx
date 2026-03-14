import React, { Component } from "react";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return <ErrorView onReset={this.handleReset} error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorView = ({ onReset, error }) => {
  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Abstract Background Shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -right-20 w-96 h-96 border-2 border-orange-200 rounded-full border-dashed opacity-40"
      />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Animated Illustration Container */}
        <div className="relative h-80 w-full flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="relative"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-10 -right-8"
            >
              <AlertTriangle size={60} className="text-amber-400" fill="currentColor" />
            </motion.div>
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl font-black text-slate-800 mb-6 tracking-tight leading-tight"
          >
            Oops, <br />
            <span className="text-orange-500">Something Went Wrong</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-600 mb-10 font-medium leading-relaxed max-w-md"
          >
            We encountered an unexpected error. Please try refreshing the page or return to the home page.
          </motion.p>

          {error && import.meta.env.DEV && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-sm text-red-800 font-mono">{error.toString()}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-[#FF6B6B] border-2 border-slate-900 text-white font-bold rounded-xl shadow-[4px_4px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2"
            >
              <RefreshCw size={20} />
              <span>Retry Page</span>
            </button>

            <button
              onClick={onReset}
              className="px-8 py-4 bg-white border-2 border-slate-900 text-slate-900 font-bold rounded-xl shadow-[4px_4px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(15,23,42,1)] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2"
            >
              <Home size={20} />
              <span>Back to Home</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
