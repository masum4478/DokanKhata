
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'loading';
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible && type !== 'loading') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, type, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
        type === 'success' ? 'bg-green-600 border-green-500 text-white' :
        type === 'error' ? 'bg-red-600 border-red-500 text-white' :
        'bg-gray-900 border-gray-800 text-white'
      }`}>
        <div className="flex-shrink-0">
          {type === 'success' && <CheckCircle2 size={20} />}
          {type === 'error' && <AlertCircle size={20} />}
          {type === 'loading' && <RefreshCw size={20} className="animate-spin" />}
        </div>
        <div className="flex-1 text-xs font-black uppercase tracking-widest leading-tight">
          {message}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
