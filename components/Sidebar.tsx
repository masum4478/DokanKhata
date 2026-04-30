
import React from 'react';
import { 
  X, 
  Crown, 
  ShoppingCart, 
  Wallet, 
  Settings, 
  Share2, 
  History, 
  UserCircle,
  Users,
  ChevronRight,
  Calculator,
  Briefcase,
  Smartphone,
  Plus,
  PackagePlus,
  RotateCcw,
  CloudUpload,
  LogIn,
  LogOut,
  HelpCircle,
  MessageSquare,
  Store
} from 'lucide-react';
import { ViewState, ShopSettings } from '../types';
import { UserProfile } from './CloudBackup';

import DriveImage from './DriveImage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  isLoggedIn: boolean;
  user: UserProfile | null;
  shopSettings: ShopSettings;
  onLogout: () => void;
  googleAccessToken: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, isLoggedIn, user, shopSettings, onLogout, googleAccessToken }) => {
  const displayShopName = isLoggedIn && shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'গেস্ট';
  const profilePhoto = isLoggedIn ? (shopSettings.shopLogo || (user ? user.photo : null)) : null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity z-[60] ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transition-transform transform z-[70] ease-out duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
           <div className="flex justify-end items-start mb-6">
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"><X size={20} /></button>
           </div>

           <div className="flex items-center justify-between mb-4 group cursor-pointer" onClick={() => onNavigate('CLOUD_BACKUP')}>
              <div className="flex items-center gap-3">
                 <div className="relative">
                    {profilePhoto ? (
                      <DriveImage src={profilePhoto} className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover" alt="Profile" token={googleAccessToken} />
                    ) : (
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 shadow-sm">
                        <Store size={24} />
                      </div>
                    )}
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="font-bold text-lg leading-tight truncate max-w-[140px] text-gray-900">{displayShopName}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate max-w-[140px]">{isLoggedIn && user ? user.email : 'সেটিংস থেকে প্রোফাইল সেট করুন'}</p>
                 </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
           </div>

           {!isLoggedIn && (
             <button onClick={() => onNavigate('CLOUD_BACKUP')} className="w-full flex items-center justify-center gap-2 mb-4 p-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100">
                <LogIn size={14} /> লগইন করুন
             </button>
           )}

           <button onClick={() => onNavigate('STOCK')} className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl shadow-xl shadow-red-100 active:scale-[0.98] mt-2 group">
              <div className="flex items-center gap-3 font-bold">
                 <PackagePlus size={18} /> নতুন পণ্য যোগ
              </div>
              <ChevronRight size={18} />
           </button>
        </div>

        <div className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar">
           <div className="text-[10px] font-black text-gray-400 mb-2 px-3 uppercase tracking-[0.2em]">প্রধান ফিচারসমূহ</div>
           {[
             { label: 'বাকি হিসাব (টালি)', icon: Calculator, view: 'TALLY' },
             { label: 'কাস্টমার তালিকা', icon: Users, view: 'CUSTOMERS' },
             { label: 'সাপ্লায়ার তালিকা', icon: Briefcase, view: 'SUPPLIERS' },
             { label: 'বেচা কেনা হিসাব', icon: ShoppingCart, view: 'BECHA_KENA' },
             { label: 'প্রোডাক্ট রিটার্ন', icon: RotateCcw, view: 'PRODUCT_RETURN' },
             { label: 'স্টক হিসাব', icon: PackagePlus, view: 'STOCK' },
             { label: 'বিক্রি', icon: Wallet, view: 'SALE_ENTRY' },
           ].map((item, idx) => (
             <button key={idx} onClick={() => onNavigate(item.view as ViewState)} className="w-full flex items-center gap-4 p-3 hover:bg-red-50 hover:text-[#D32F2F] rounded-xl transition-all text-gray-600 font-bold group text-left border border-transparent hover:border-red-100">
                <item.icon size={20} className="text-gray-400 group-hover:text-[#D32F2F]" />
                <span className="text-sm">{item.label}</span>
             </button>
           ))}

           <div className="text-[10px] font-black text-gray-400 mt-6 mb-2 px-3 uppercase tracking-[0.2em]">সেটিংস</div>
           {[
             { label: 'দোকান সেটিংস ও ব্যাকআপ', icon: Settings, view: 'CLOUD_BACKUP' },
             { label: 'হেল্প ও সাপোর্ট', icon: HelpCircle, view: 'HELP_SUPPORT' },
           ].map((item, idx) => (
             <button key={idx} onClick={() => item.view ? onNavigate(item.view as ViewState) : null} className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-600 font-bold group text-left border border-transparent">
                <item.icon size={20} className="text-gray-400 group-hover:text-gray-900" />
                <span className="text-sm">{item.label}</span>
             </button>
           ))}

           {isLoggedIn && (
             <div className="mt-6 pt-6 border-t border-gray-100">
               <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 p-3.5 bg-red-50 text-[#D32F2F] rounded-xl transition-all font-black group text-left border border-red-100 hover:bg-red-100 active:scale-95"
               >
                  <LogOut size={20} />
                  <span className="text-sm uppercase tracking-widest">লগ আউট করুন</span>
               </button>
             </div>
           )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="font-black text-lg text-[#D32F2F] tracking-tighter">TECH HIGH BD</span>
            <div className="text-[9px] text-gray-400 font-black border border-gray-200 px-2 py-1 rounded-full uppercase tracking-widest bg-white">V 7.10.0</div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
