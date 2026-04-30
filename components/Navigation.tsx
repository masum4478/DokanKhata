
import React from 'react';
import { BookOpen, Wallet, Menu, Package } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const tabs = [
    { id: 'TALLY', label: 'টালি', icon: BookOpen },
    { id: 'SALE_ENTRY', label: 'বিক্রি', icon: Wallet },
    { id: 'STOCK', label: 'পণ্য', icon: Package },
    { id: 'MENU', label: 'মেনু', icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around py-3 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id as ViewState)}
          className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${
            (currentView === tab.id || (tab.id === 'TALLY' && (currentView === 'CUSTOMERS' || currentView === 'SUPPLIERS'))) ? 'text-[#D32F2F]' : 'text-gray-400'
          }`}
        >
          <div className={`p-2 rounded-2xl transition-all ${(currentView === tab.id || (tab.id === 'TALLY' && (currentView === 'CUSTOMERS' || currentView === 'SUPPLIERS'))) ? 'bg-[#FFE9E9] shadow-inner' : ''}`}>
             <tab.icon size={24} strokeWidth={2.5} fill={(currentView === tab.id || (tab.id === 'TALLY' && (currentView === 'CUSTOMERS' || currentView === 'SUPPLIERS'))) ? 'currentColor' : 'none'} />
          </div>
          <span className={`text-[10px] mt-1 font-black uppercase tracking-tighter transition-all ${
            (currentView === tab.id || (tab.id === 'TALLY' && (currentView === 'CUSTOMERS' || currentView === 'SUPPLIERS'))) ? 'opacity-100' : 'opacity-60'
          }`}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
