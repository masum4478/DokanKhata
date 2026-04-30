import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, UserPlus, Filter, Download, Package, FileText, Bell, QrCode, CloudUpload, MessageSquare, ChevronRight, ChevronLeft, Sparkles, TrendingUp, Info, X, ShoppingCart, History, Calendar } from 'lucide-react';
import { Contact, ContactType, SalePurchaseRecord } from '../types';
import DriveImage from './DriveImage';

interface TallyViewProps {
  contacts: Contact[];
  saleRecords: SalePurchaseRecord[];
  onSelectContact: (id: string) => void;
  onAddContact: () => void;
  onNavigate: (view: any) => void;
  typeFilter?: ContactType;
  geminiUsageCount?: number;
  googleAccessToken?: string | null;
}

const TallyView: React.FC<TallyViewProps> = ({ contacts, saleRecords, onSelectContact, onAddContact, onNavigate, typeFilter, geminiUsageCount, googleAccessToken }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [viewDate, setViewDate] = useState(new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const isToday = viewDate.toDateString() === today.toDateString();

  const formattedViewDate = useMemo(() => {
    // Format to match the Bengali style: 14 জানুয়ারি, 2026
    return viewDate.toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [viewDate]);

  const displayedSales = useMemo(() => {
    return saleRecords.filter(r => r.type === 'SALE' && r.date === formattedViewDate);
  }, [saleRecords, formattedViewDate]);

  const displayedTotalAmount = displayedSales.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

  const receivableTotal = contacts.reduce((acc, curr) => {
    const matchesType = typeFilter ? curr.type === typeFilter : true;
    return (matchesType && curr.balance > 0) ? acc + curr.balance : acc;
  }, 0);
  
  const payableTotal = Math.abs(contacts.reduce((acc, curr) => {
    const matchesType = typeFilter ? curr.type === typeFilter : true;
    return (matchesType && curr.balance < 0) ? acc + curr.balance : acc;
  }, 0));

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesType = typeFilter ? c.type === typeFilter : true;
    if (!matchesType) return false;
    if (filterMode === 'RECEIVABLE') return matchesSearch && c.balance > 0;
    if (filterMode === 'PAYABLE') return matchesSearch && c.balance < 0;
    return matchesSearch;
  });

  const changeDate = (days: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + days);
    // Prevent going into the future
    if (newDate > today) return;
    setViewDate(newDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setViewDate(new Date(e.target.value));
    }
  };

  const goToToday = () => setViewDate(new Date());

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* Sales Summary Card with Date Navigation */}
      <div className="mx-4 mt-4 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
        <div className="bg-[#D32F2F] p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} />
            <span className="text-sm font-black">{isToday ? 'আজকের বিক্রি' : 'বিক্রি হিসাব'}</span>
          </div>
          <div className="flex items-center gap-2">
            {geminiUsageCount !== undefined && (
              <div className="bg-white/20 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-300" />
                AI লিমিট: {Math.max(0, 50 - geminiUsageCount)}
              </div>
            )}
            {!isToday && (
              <button 
                onClick={goToToday}
                className="bg-white/20 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter hover:bg-white/30 transition-colors animate-in fade-in zoom-in"
              >
                আজ
              </button>
            )}
            <div className="flex items-center bg-black/10 rounded-full px-2 py-1 gap-1 border border-white/10">
              <button 
                onClick={() => changeDate(-1)} 
                className="p-1 hover:bg-white/20 rounded-full transition-colors active:scale-90"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="text-[10px] font-black uppercase tracking-widest px-1 min-w-[100px] text-center hover:bg-white/10 rounded py-0.5 transition-colors flex items-center gap-1"
                >
                  <Calendar size={10} className="opacity-70" />
                  {formattedViewDate}
                </button>
                <input 
                  type="date" 
                  ref={dateInputRef}
                  onChange={handleDateChange}
                  max={today.toISOString().split('T')[0]}
                  className="absolute opacity-0 pointer-events-none"
                />
              </div>

              <button 
                onClick={() => changeDate(1)} 
                disabled={isToday}
                className={`p-1 rounded-full transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-90'}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট পরিমাণ</div>
              <div className="text-3xl font-black text-gray-900">৳{displayedTotalAmount.toLocaleString('bn-BD')}</div>
            </div>
            <button 
              onClick={() => onNavigate('BECHA_KENA')}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full active:scale-95 transition-all"
            >
              বিস্তারিত <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {displayedSales.length > 0 ? (
              displayedSales.slice(0, 3).map(sale => (
                <div key={sale.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0 animate-in slide-in-from-left duration-300">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-bold text-gray-800 truncate block">{sale.customerName}</span>
                    <span className="text-[10px] text-gray-400 truncate block">{sale.description}</span>
                  </div>
                  <div className="font-black text-green-600">৳{sale.amount}</div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-300 italic text-xs animate-in fade-in">
                {isToday ? 'আজ এখনো কোনো বিক্রি হয়নি' : 'এই তারিখে কোনো বিক্রি পাওয়া যায়নি'}
              </div>
            )}
            {displayedSales.length > 3 && (
              <div className="text-center text-[10px] font-bold text-gray-400 pt-1">আরো {displayedSales.length - 3}টি বিক্রি...</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-4 p-4 text-center mt-2">
        {[
          { icon: ShoppingCart, label: 'বিক্রি করুন', color: 'text-blue-600', view: 'SALE_ENTRY' },
          { icon: Package, label: 'স্টক হিসাব', color: 'text-red-500', view: 'STOCK' },
          { icon: History, label: 'বেচা-কেনা', color: 'text-orange-500', view: 'BECHA_KENA' },
          { icon: CloudUpload, label: 'ব্যাকআপ', color: 'text-green-500', view: 'CLOUD_BACKUP' },
        ].map((item, idx) => (
          <div key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center cursor-pointer group">
            <div className={`p-3 bg-white rounded-2xl shadow-sm border border-gray-50 mb-2 group-active:scale-95 transition-all ${item.color}`}>
              <item.icon size={24} />
            </div>
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Balances Card */}
      <div className="mx-4 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 flex overflow-hidden mb-4">
        <div onClick={() => setFilterMode('RECEIVABLE')} className={`flex-1 p-4 border-r border-gray-100 text-center cursor-pointer transition-colors ${filterMode === 'RECEIVABLE' ? 'bg-red-50' : ''}`}>
          <div className="text-[#D32F2F] text-xl font-black">৳{receivableTotal.toLocaleString('bn-BD')}</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">মোট পাবো</div>
        </div>
        <div onClick={() => setFilterMode('PAYABLE')} className={`flex-1 p-4 text-center cursor-pointer transition-colors ${filterMode === 'PAYABLE' ? 'bg-green-50' : ''}`}>
          <div className="text-green-600 text-xl font-black">৳{payableTotal.toLocaleString('bn-BD')}</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">মোট দেবো</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mx-4 flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={typeFilter === ContactType.CUSTOMER ? 'কাস্টমার খুঁজুন...' : 
                         typeFilter === ContactType.SUPPLIER ? 'সাপ্লায়ার খুঁজুন...' : 
                         'কাস্টমার খুঁজুন...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-[#D32F2F] outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 bg-white rounded-t-[2.5rem] shadow-inner pt-6 overflow-hidden">
        <div className="px-6 mb-4 flex items-center justify-between">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {typeFilter === ContactType.CUSTOMER ? 'কাস্টমার তালিকা' : 
             typeFilter === ContactType.SUPPLIER ? 'সাপ্লায়ার তালিকা' : 
             'কাস্টমার খাতা'}
          </span>
          <button onClick={() => setFilterMode('ALL')} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">সব দেখুন</button>
        </div>
        <div className="space-y-1 px-2">
          {filteredContacts.map(contact => (
            <div key={contact.id} onClick={() => onSelectContact(contact.id)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 border border-gray-50 overflow-hidden text-lg">
                {contact.photo ? (
                  <DriveImage src={contact.photo} className="w-full h-full object-cover" alt={contact.name} token={googleAccessToken} />
                ) : (
                  contact.name[0]
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 leading-tight">{contact.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">{contact.phone}</p>
              </div>
              <div className="text-right">
                <div className={`font-black ${contact.balance >= 0 ? 'text-[#D32F2F]' : 'text-green-600'}`}>
                  ৳{Math.abs(contact.balance).toLocaleString('bn-BD')}
                </div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{contact.balance >= 0 ? 'পাবো' : 'দেবো'}</div>
              </div>
            </div>
          ))}
          {filteredContacts.length === 0 && (
             <div className="py-20 text-center opacity-30">
                <UserPlus size={48} className="mx-auto mb-2" />
                <p className="font-bold">
                  {typeFilter === ContactType.CUSTOMER ? 'কাস্টমার নেই' : 
                   typeFilter === ContactType.SUPPLIER ? 'সাপ্লায়ার নেই' : 
                   'কাস্টমার নেই'}
                </p>
             </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button 
        onClick={onAddContact} 
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#D32F2F] text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all z-40 border-4 border-white"
      >
        <UserPlus size={28} />
      </button>
    </div>
  );
};

export default TallyView;