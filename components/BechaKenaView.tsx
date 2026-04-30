
import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Calendar, ShoppingCart, ShoppingBag, ChevronRight, History, Search, X, FileText, User, Truck, Package, Filter, Phone, CheckCircle2, Printer, Download, MessageSquare, Edit2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import InvoiceView from './InvoiceView';
import { SalePurchaseRecord, StockTransaction, StockItem, Contact, ContactType, Transaction, ShopSettings } from '../types';
import DriveImage from './DriveImage';

interface BechaKenaViewProps {
  records: SalePurchaseRecord[];
  stockTransactions: StockTransaction[];
  stockItems: StockItem[];
  contacts: Contact[];
  onBack: () => void;
  onAddRecord: (record: SalePurchaseRecord) => void;
  onUpdateContacts: (contacts: Contact[]) => void;
  shopSettings: ShopSettings;
  onSelectContact: (id: string) => void;
  googleAccessToken?: string | null;
}

const BechaKenaView: React.FC<BechaKenaViewProps> = ({ records, stockTransactions, stockItems, contacts, onBack, onAddRecord, onUpdateContacts, shopSettings, onSelectContact, googleAccessToken }) => {
  const [activeTab, setActiveTab] = useState<'SALE' | 'PURCHASE' | 'CUSTOMER_DUE' | 'SUPPLIER_DUE'>('SALE');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'INVOICE' | 'CONTACT'>('INVOICE');
  const [selectedInvoice, setSelectedInvoice] = useState<SalePurchaseRecord | null>(null);
  const [showInvoiceView, setShowInvoiceView] = useState<SalePurchaseRecord | null>(null);
  const [showSupplierDetail, setShowSupplierDetail] = useState<Contact | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState<Contact | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [transactionType, setTransactionType] = useState<'RECEIVED' | 'DUE_GIVEN'>('RECEIVED');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  
  const [showReceipt, setShowReceipt] = useState<{ amount: number; date: string; supplierName: string; remainingBalance: number; phone: string; isDueEntry?: boolean } | null>(null);
  const [showCustomerReceipt, setShowCustomerReceipt] = useState<{ amount: number; date: string; customerName: string; remainingBalance: number; phone: string; isDueEntry?: boolean } | null>(null);

  const supplierReceiptRef = useRef<HTMLDivElement>(null);
  const customerReceiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (ref.current === null) return;
    try {
      const dataUrl = await htmlToImage.toPng(ref.current, { 
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error saving receipt:', err);
    }
  };

  const shareToWhatsApp = (receiptData: any) => {
    const shopName = shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান';
    const message = `
*${shopName}*
${shopSettings.shopPhone ? `ফোন: ${shopSettings.shopPhone}` : ''}
---------------------------
*টাকা আদায় রশিদ*
কাস্টমার: ${receiptData.customerName}
তারিখ: ${receiptData.date}
আদায়কৃত পরিমাণ: ৳${receiptData.amount.toLocaleString('bn-BD')}
${receiptData.remainingBalance > 0 ? `অবশিষ্ট বকেয়া: ৳${receiptData.remainingBalance.toLocaleString('bn-BD')}` : 'বকেয়া নেই'}
---------------------------
"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"
    `.trim();

    const phone = receiptData.phone.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      alert('বৈধ ফোন নম্বর পাওয়া যায়নি!');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/88${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      let matchesType = false;
      if (activeTab === 'SALE') matchesType = record.type === 'SALE';
      else if (activeTab === 'PURCHASE') matchesType = record.type === 'PURCHASE';
      else if (activeTab === 'CUSTOMER_DUE') matchesType = record.type === 'SALE' && record.dueAmount > 0;
      else if (activeTab === 'SUPPLIER_DUE') matchesType = record.type === 'PURCHASE' && record.dueAmount > 0;

      const matchesSearch = record.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (record.customerName && record.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDate = !dateFilter || record.date.includes(dateFilter);
      return matchesType && matchesSearch && matchesDate;
    }).slice().reverse();
  }, [records, activeTab, searchQuery, dateFilter]);

  const filteredDueContacts = useMemo(() => {
    if (activeTab === 'SALE' || activeTab === 'PURCHASE') return [];
    return contacts.filter(contact => {
      const isCustomerDue = activeTab === 'CUSTOMER_DUE' && contact.type === ContactType.CUSTOMER && contact.balance > 0;
      const isSupplierDue = activeTab === 'SUPPLIER_DUE' && contact.type === ContactType.SUPPLIER && contact.balance < 0;
      const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || contact.phone.includes(searchQuery);
      return (isCustomerDue || isSupplierDue) && matchesSearch;
    }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [contacts, activeTab, searchQuery]);

  const totalSales = records
    .filter(r => r.type === 'SALE')
    .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

  const totalPurchases = records
    .filter(r => r.type === 'PURCHASE')
    .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

  const totalCustomerDue = contacts
    .filter(c => c.type === ContactType.CUSTOMER && c.balance > 0)
    .reduce((acc, curr) => acc + curr.balance, 0);

  const totalSupplierDue = Math.abs(contacts
    .filter(c => c.type === ContactType.SUPPLIER && c.balance < 0)
    .reduce((acc, curr) => acc + curr.balance, 0));

  const getSupplierForItem = (productId: string) => {
    // Find the most recent 'IN' transaction for this product to identify the supplier
    const lastInTransaction = stockTransactions
      .filter(t => t.itemId === productId && t.type === 'IN')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return lastInTransaction ? lastInTransaction.partyName : 'অজানা সাপ্লায়ার';
  };

  const openSupplierProfile = (name: string) => {
    const contact = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (contact) {
      onSelectContact(contact.id);
    }
  };

  const handleSupplierPayment = () => {
    if (!showSupplierDetail || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const ledgerTransaction: Transaction = {
      id: Date.now().toString() + "-pay",
      type: transactionType,
      amount: amount,
      description: paymentDescription || (transactionType === 'RECEIVED' ? 'বকেয়া পরিশোধ (সাপ্লায়ার পেমেন্ট)' : 'বাকি নিলাম (সাপ্লায়ার)'),
      date: today
    };

    const updatedContacts = contacts.map(c => {
      if (c.id === showSupplierDetail.id) {
        const newBalance = transactionType === 'RECEIVED' ? c.balance + amount : c.balance - amount;
        return { 
          ...c, 
          balance: newBalance, 
          transactions: [ledgerTransaction, ...c.transactions],
          lastActivity: today
        };
      }
      return c;
    });

    onUpdateContacts(updatedContacts);
    setIsPaying(false);
    setPaymentAmount('');
    setPaymentDescription('');
    
    if (transactionType === 'RECEIVED') {
      setShowReceipt({ 
        amount, 
        date: today, 
        supplierName: showSupplierDetail.name,
        remainingBalance: Math.abs((showSupplierDetail.balance + amount)),
        phone: showSupplierDetail.phone,
        isDueEntry: false
      });
    } else {
      setShowReceipt({ 
        amount, 
        date: today, 
        supplierName: showSupplierDetail.name,
        remainingBalance: Math.abs((showSupplierDetail.balance - amount)),
        phone: showSupplierDetail.phone,
        isDueEntry: true
      });
    }
    setShowSupplierDetail(null);
  };

  const openCustomerProfile = (name: string) => {
    const contact = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (contact) {
      onSelectContact(contact.id);
    }
  };

  const handleCustomerPayment = () => {
    if (!showCustomerDetail || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const ledgerTransaction: Transaction = {
      id: Date.now().toString() + "-pay-c",
      type: transactionType,
      amount: amount,
      description: paymentDescription || (transactionType === 'RECEIVED' ? 'বকেয়া আদায় (কাস্টমার পেমেন্ট)' : 'বাকি দিলাম (কাস্টমার)'),
      date: today
    };

    const updatedContacts = contacts.map(c => {
      if (c.id === showCustomerDetail.id) {
        const newBalance = transactionType === 'RECEIVED' ? c.balance - amount : c.balance + amount;
        return { 
          ...c, 
          balance: newBalance, 
          transactions: [ledgerTransaction, ...c.transactions],
          lastActivity: today
        };
      }
      return c;
    });

    onUpdateContacts(updatedContacts);
    setIsPaying(false);
    setPaymentAmount('');
    setPaymentDescription('');
    
    if (transactionType === 'RECEIVED') {
      setShowCustomerReceipt({ 
        amount, 
        date: today, 
        customerName: showCustomerDetail.name,
        remainingBalance: showCustomerDetail.balance - amount,
        phone: showCustomerDetail.phone,
        isDueEntry: false
      });
    } else {
      setShowCustomerReceipt({ 
        amount, 
        date: today, 
        customerName: showCustomerDetail.name,
        remainingBalance: showCustomerDetail.balance + amount,
        phone: showCustomerDetail.phone,
        isDueEntry: true
      });
    }
    setShowCustomerDetail(null);
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-[#D32F2F] focus:ring-4 focus:ring-red-50 transition-all shadow-sm text-lg placeholder:text-gray-400";

  return (
    <div className="bg-gray-50 min-h-full flex flex-col pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
      <header className="flex items-center gap-4 p-4 bg-[#D32F2F] text-white sticky top-0 z-20 shadow-md">
        <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-black">বেচা কেনা হিসাব</h2>
      </header>

      {/* Summary Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button 
          onClick={() => setActiveTab('SALE')}
          className={`p-4 rounded-3xl shadow-sm border-2 transition-all flex flex-col items-center gap-1 ${
            activeTab === 'SALE' ? 'bg-green-50 border-green-500 scale-105' : 'bg-white border-transparent'
          }`}
        >
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">নগদ বিক্রি</div>
          <div className="text-xl font-black text-green-600">৳ {totalSales.toLocaleString('bn-BD')}</div>
          {activeTab === 'SALE' && <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('PURCHASE')}
          className={`p-4 rounded-3xl shadow-sm border-2 transition-all flex flex-col items-center gap-1 ${
            activeTab === 'PURCHASE' ? 'bg-red-50 border-red-500 scale-105' : 'bg-white border-transparent'
          }`}
        >
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">নগদ ক্রয়</div>
          <div className="text-xl font-black text-red-600">৳ {totalPurchases.toLocaleString('bn-BD')}</div>
          {activeTab === 'PURCHASE' && <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('CUSTOMER_DUE')}
          className={`p-4 rounded-3xl shadow-sm border-2 transition-all flex flex-col items-center gap-1 ${
            activeTab === 'CUSTOMER_DUE' ? 'bg-orange-50 border-orange-500 scale-105' : 'bg-white border-transparent'
          }`}
        >
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">কাস্টমার বাকী</div>
          <div className="text-xl font-black text-orange-600">৳ {totalCustomerDue.toLocaleString('bn-BD')}</div>
          {activeTab === 'CUSTOMER_DUE' && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('SUPPLIER_DUE')}
          className={`p-4 rounded-3xl shadow-sm border-2 transition-all flex flex-col items-center gap-1 ${
            activeTab === 'SUPPLIER_DUE' ? 'bg-purple-50 border-purple-500 scale-105' : 'bg-white border-transparent'
          }`}
        >
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">সাপ্লায়ার বাকী</div>
          <div className="text-xl font-black text-purple-600">৳ {totalSupplierDue.toLocaleString('bn-BD')}</div>
          {activeTab === 'SUPPLIER_DUE' && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1"></div>}
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 mb-4 space-y-3">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D32F2F]" size={20} />
          <input 
            type="text" 
            placeholder="Invoice ID বা নাম দিয়ে খুঁজুন..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl outline-none font-bold focus:border-[#D32F2F] transition-all shadow-sm"
            inputMode="search"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="তারিখ দিয়ে ফিল্টার (উদা: মার্চ)" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl outline-none text-sm font-bold focus:border-[#D32F2F] transition-all shadow-sm"
            />
          </div>
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-95">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 bg-white rounded-t-[3rem] p-6 shadow-inner border-t border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <History size={16} /> 
              {activeTab === 'SALE' && 'বিক্রয় তালিকা'}
              {activeTab === 'PURCHASE' && 'ক্রয় তালিকা'}
              {activeTab === 'CUSTOMER_DUE' && (viewMode === 'INVOICE' ? 'বাকি বিক্রয় ইনভয়েস' : 'কাস্টমার বাকী তালিকা')}
              {activeTab === 'SUPPLIER_DUE' && (viewMode === 'INVOICE' ? 'বাকি ক্রয় ইনভয়েস' : 'সাপ্লায়ার বাকী তালিকা')}
            </h3>
            <span className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-black text-gray-400 uppercase tracking-tighter w-fit">
              {viewMode === 'INVOICE' ? filteredRecords.length : filteredDueContacts.length} টি রেকর্ড
            </span>
          </div>
          
          {(activeTab === 'CUSTOMER_DUE' || activeTab === 'SUPPLIER_DUE') && (
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('INVOICE')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'INVOICE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
              >
                ইনভয়েস
              </button>
              <button 
                onClick={() => setViewMode('CONTACT')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewMode === 'CONTACT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
              >
                কাস্টমার
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {viewMode === 'INVOICE' ? (
            filteredRecords.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                   {activeTab === 'SALE' || activeTab === 'CUSTOMER_DUE' ? <ShoppingCart size={40} className="text-gray-200" /> : <ShoppingBag size={40} className="text-gray-200" />}
                </div>
                <p className="text-gray-400 text-sm font-black uppercase tracking-widest">কোনো রেকর্ড পাওয়া যায়নি</p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div 
                  key={record.id} 
                  onClick={() => {
                    if ((activeTab === 'CUSTOMER_DUE' || activeTab === 'SUPPLIER_DUE') && viewMode === 'INVOICE') {
                      setShowInvoiceView(record);
                    } else {
                      setSelectedInvoice(record);
                    }
                  }}
                  className="flex items-center gap-4 p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] hover:bg-gray-50 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    record.type === 'SALE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {record.type === 'SALE' ? <ShoppingCart size={24} /> : <ShoppingBag size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-gray-900">ID: {record.id.slice(-8)}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${record.isCash ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {record.isCash ? 'নগদ' : 'বাকি'}
                      </span>
                      {record.dueAmount && record.dueAmount > 0 && (
                        <span className="text-[8px] font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-full uppercase tracking-widest">
                          বকেয়া: ৳{record.dueAmount.toLocaleString('bn-BD')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-500 truncate max-w-[150px]">
                      {record.customerName || record.description || 'বিবরণ নেই'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{record.date}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black ${record.type === 'SALE' ? 'text-green-600' : 'text-red-600'}`}>
                      ৳{record.amount.toLocaleString('bn-BD')}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 ml-auto mt-1 group-hover:text-[#D32F2F] transition-colors" />
                  </div>
                </div>
              ))
            )
          ) : (
            filteredDueContacts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                   <User size={40} className="text-gray-200" />
                </div>
                <p className="text-gray-400 text-sm font-black uppercase tracking-widest">কোনো বাকী রেকর্ড নেই</p>
              </div>
            ) : (
              filteredDueContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => onSelectContact(contact.id)}
                  className="flex items-center gap-4 p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] hover:bg-gray-50 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    activeTab === 'CUSTOMER_DUE' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <User size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-gray-900">{contact.name}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500">
                      {contact.phone}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">শেষ লেনদেন: {contact.lastActivity}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black ${activeTab === 'CUSTOMER_DUE' ? 'text-orange-600' : 'text-purple-600'}`}>
                      ৳{Math.abs(contact.balance).toLocaleString('bn-BD')}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 ml-auto mt-1 group-hover:text-[#D32F2F] transition-colors" />
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <header className="p-6 bg-[#D32F2F] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {selectedInvoice.dueAmount && selectedInvoice.dueAmount > 0 ? 'বকেয়া ক্যাশ মেমো' : 'ক্যাশ মেমো'}
                  </h3>
                  <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">ইনভয়েস ID: {selectedInvoice.id.slice(-8)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Customer Info */}
              <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                      <User size={20} />
                    </div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">কাস্টমার তথ্য</h4>
                  </div>
                  {selectedInvoice.customerPhone && (
                    <a 
                      href={`tel:${selectedInvoice.customerPhone}`}
                      className="p-3 bg-green-100 text-green-600 rounded-2xl hover:bg-green-200 transition-colors shadow-sm active:scale-95"
                    >
                      <Phone size={20} />
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      const contact = contacts.find(c => c.name.toLowerCase() === (selectedInvoice.customerName || '').toLowerCase());
                      if (contact) {
                        onSelectContact(contact.id);
                        setSelectedInvoice(null);
                      }
                    }}
                    className="text-lg font-black text-gray-900 hover:text-blue-600 transition-colors text-left block"
                  >
                    {selectedInvoice.customerName || 'অনিবন্ধিত কাস্টমার'}
                  </button>
                  {selectedInvoice.customerPhone && <div className="text-xs font-bold text-gray-500">{selectedInvoice.customerPhone}</div>}
                  {selectedInvoice.customerAddress && <div className="text-xs text-gray-400">{selectedInvoice.customerAddress}</div>}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পণ্যের তালিকা ও সাপ্লায়ার</h4>
                  <Package size={14} className="text-gray-300" />
                </div>
                
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="p-5 bg-white border-2 border-gray-50 rounded-[2rem] shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-black text-gray-900 text-base leading-tight">{item.name}</div>
                            <div className="text-[10px] font-bold text-gray-400 mt-1">{item.quantity} পিস × ৳{item.price}</div>
                          </div>
                          <div className="text-right font-black text-gray-900">৳{(item.quantity * item.price).toLocaleString('bn-BD')}</div>
                        </div>
                        
                        {/* Supplier Info */}
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-blue-500" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">সাপ্লায়ার:</span>
                          </div>
                          <button 
                            onClick={() => {
                              const supplierName = getSupplierForItem(item.productId);
                              const contact = contacts.find(c => c.name.toLowerCase() === supplierName.toLowerCase());
                              if (contact) {
                                onSelectContact(contact.id);
                                setSelectedInvoice(null);
                              }
                            }}
                            className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm active:scale-95"
                          >
                            {getSupplierForItem(item.productId)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 font-bold italic">পণ্যের বিস্তারিত তথ্য নেই</p>
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">মোট বিল</span>
                    <span className="text-2xl font-black">৳{selectedInvoice.amount.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-400">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">পরিশোধিত</span>
                    <span className="text-lg font-black">৳{(selectedInvoice.paidAmount || selectedInvoice.amount).toLocaleString('bn-BD')}</span>
                  </div>
                  {selectedInvoice.dueAmount && selectedInvoice.dueAmount > 0 && (
                    <div className="flex justify-between items-center text-red-400">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">বকেয়া</span>
                      <span className="text-lg font-black">৳{selectedInvoice.dueAmount.toLocaleString('bn-BD')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowInvoiceView(selectedInvoice)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <FileText size={18} /> রশিদ দেখুন
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <Printer size={18} /> প্রিন্ট
                </button>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-colors active:scale-95 shadow-sm"
              >
                বন্ধ করুন
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* SUPPLIER PROFILE & PAYMENT VIEW */}
      {showSupplierDetail && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="w-16 h-16 rounded-[2.2rem] bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm overflow-hidden">
                        {showSupplierDetail.photo ? (
                          <DriveImage src={showSupplierDetail.photo} alt="" className="w-full h-full object-cover" token={googleAccessToken} />
                        ) : (
                          <Truck size={36} />
                        )}
                      </div>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900 leading-tight">
                         {showSupplierDetail.name}
                       </h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-gray-500">
                            {showSupplierDetail.phone}
                          </span>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full uppercase tracking-tighter">সাপ্লায়ার</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => { setShowSupplierDetail(null); setIsPaying(false); }} className="p-2 bg-gray-50 rounded-full text-gray-400"><X size={20} /></button>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black text-white p-8 rounded-[3rem] shadow-2xl mb-6 relative overflow-hidden border-b-4 border-gray-800">
                 <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                      <Truck size={24} className="text-red-400" />
                   </div>
                   
                   <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">সাপ্লায়ার বকেয়া স্থিতি</div>
                   
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-red-400 tracking-tighter">
                       ৳{Math.abs(showSupplierDetail.balance).toLocaleString('bn-BD')}
                     </span>
                     <span className="text-lg font-bold text-red-400/80">.০০</span>
                   </div>

                   <div className="mt-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                     আপনার কাছে পাবে
                   </div>

                   <div className="mt-8 flex items-center gap-3 w-full">
                      <button 
                        onClick={() => { setTransactionType('RECEIVED'); setIsPaying(true); }}
                        className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-red-700"
                      >
                         পেলাম (পরিশোধ)
                      </button>
                      <button 
                        onClick={() => { setTransactionType('DUE_GIVEN'); setIsPaying(true); }}
                        className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/20 active:scale-95 transition-all"
                      >
                         দিলাম (বাকি)
                      </button>
                      {showSupplierDetail.phone !== 'অনিবন্ধিত' && (
                        <a 
                          href={`tel:${showSupplierDetail.phone}`} 
                          className="p-4 bg-white/10 rounded-2xl text-white border border-white/10 active:scale-95 hover:bg-white/20 transition-colors"
                        >
                          <Phone size={20} />
                        </a>
                      )}
                   </div>
                 </div>
                 {/* Decorative blur */}
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl"></div>
                 <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
              </div>

              {isPaying && (
                <div className={`mb-6 p-5 border-2 rounded-[2rem] animate-in slide-in-from-top-4 duration-300 ${
                  transactionType === 'RECEIVED' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                }`}>
                   <div className="flex justify-between items-center mb-4 px-1">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                        transactionType === 'RECEIVED' ? 'text-red-700' : 'text-blue-700'
                      }`}>
                        {transactionType === 'RECEIVED' ? 'টাকা পরিশোধ করুন' : 'বাকি টাকা লিখুন'}
                      </h4>
                      <button onClick={() => setIsPaying(false)} className="text-gray-400"><X size={16} /></button>
                   </div>
                   <div className="space-y-4">
                      <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl ${
                          transactionType === 'RECEIVED' ? 'text-red-600' : 'text-blue-600'
                        }`}>৳</span>
                        <input 
                          type="number" 
                          value={paymentAmount} 
                          onChange={(e) => setPaymentAmount(e.target.value)} 
                          placeholder="পরিমাণ" 
                          className={inputClasses + ` pl-10 ${transactionType === 'RECEIVED' ? 'border-red-100 focus:border-red-600' : 'border-blue-100 focus:border-blue-600'} text-2xl`} 
                          autoFocus 
                          inputMode="numeric"
                        />
                      </div>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={paymentDescription} 
                          onChange={(e) => setPaymentDescription(e.target.value)} 
                          placeholder="বিবরণ (ঐচ্ছিক)" 
                          className={inputClasses + " pl-12 text-sm"} 
                        />
                      </div>
                      <button 
                        onClick={handleSupplierPayment} 
                        className={`w-full text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all ${
                          transactionType === 'RECEIVED' ? 'bg-red-600 shadow-red-100' : 'bg-blue-600 shadow-blue-100'
                        }`}
                      >
                        {transactionType === 'RECEIVED' ? 'পরিশোধ নিশ্চিত করুন' : 'বাকি নিশ্চিত করুন'}
                      </button>
                   </div>
                </div>
              )}

               <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">লেনদেনের ইতিহাস</span>
                     <History size={14} className="text-gray-300" />
                  </div>
                  
                  <div className="space-y-2">
                     {records.filter(r => r.customerName === showSupplierDetail.name && r.type === 'PURCHASE').map(r => {
                       const isDue = r.dueAmount && r.dueAmount > 0;
                       return (
                         <div 
                           key={r.id} 
                           onClick={() => {
                             if (isDue) {
                               setShowInvoiceView(r);
                             } else {
                               setSelectedInvoice(r);
                             }
                           }}
                           className={`p-4 rounded-2xl border transition-colors cursor-pointer group flex justify-between items-center ${
                             isDue 
                               ? "bg-orange-50 border-orange-200 hover:bg-orange-100" 
                               : "bg-gray-50 border-gray-100 hover:bg-blue-50"
                           }`}
                         >
                            <div>
                               <div className="flex items-center gap-2">
                                  <div className={`text-xs font-black transition-colors ${isDue ? "text-orange-700 group-hover:text-orange-800" : "text-gray-900 group-hover:text-blue-600"}`}>
                                     ইনভয়েস: {r.id.slice(-8)}
                                  </div>
                                  {isDue && (
                                     <span className="px-1.5 py-0.5 bg-orange-600 text-[8px] font-black text-white rounded-md uppercase tracking-tighter">বাকি</span>
                                  )}
                               </div>
                               <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{r.date}</div>
                               <div className="text-[8px] font-black text-blue-500 mt-1 flex items-center gap-1">
                                  <FileText size={10} /> ডিটেইলস দেখুন
                               </div>
                            </div>
                            <div className="text-right">
                               <div className={`text-sm font-black ${isDue ? "text-orange-600" : "text-red-600"}`}>৳{r.amount.toLocaleString('bn-BD')}</div>
                               <div className="text-[8px] font-bold text-gray-400">{r.items?.length || 0} টি পণ্য</div>
                            </div>
                         </div>
                       );
                     })}
                     {showSupplierDetail.transactions.map(t => (
                      <div key={t.id} className="p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white text-green-600 flex items-center justify-center border border-green-200"><CheckCircle2 size={16} /></div>
                            <div>
                               <div className="text-xs font-black text-green-800">{t.description}</div>
                               <div className="text-[9px] font-bold text-green-400 uppercase mt-0.5 tracking-tighter">{t.date}</div>
                            </div>
                         </div>
                         <div className="text-sm font-black text-green-700">৳{t.amount.toLocaleString('bn-BD')}</div>
                      </div>
                    ))}
                    {records.filter(r => r.customerName === showSupplierDetail.name && r.type === 'PURCHASE').length === 0 && showSupplierDetail.transactions.length === 0 && (
                       <div className="text-center py-10 text-xs text-gray-300 italic font-bold">কোনো রেকর্ড নেই</div>
                    )}
                  </div>
               </div>
            </div>
        </div>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      {showReceipt && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div id="printable-receipt" ref={supplierReceiptRef} className="bg-white">
              <header className={`p-6 text-white text-center ${showReceipt.isDueEntry ? 'bg-blue-600' : 'bg-red-600'}`}>
                <div className="mb-2">
                  <h2 className="text-lg font-black uppercase tracking-tight">{shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান'}</h2>
                  {shopSettings.shopPhone && <p className="text-[10px] font-bold opacity-80">ফোন: {shopSettings.shopPhone}</p>}
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {showReceipt.isDueEntry ? 'বাকি এন্ট্রি সফল' : 'পেমেন্ট সফল হয়েছে'}
                </h3>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">রশিদ (Receipt)</p>
              </header>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রাপক (সাপ্লায়ার)</div>
                  <div className="text-2xl font-black text-gray-900">{showReceipt.supplierName}</div>
                  <div className="text-xs font-bold text-gray-500">{showReceipt.phone}</div>
                </div>

                <div className="bg-gray-50 rounded-[2rem] p-6 space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">তারিখ:</span>
                    <span className="text-xs font-black text-gray-900">{showReceipt.date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200">
                    <span className="text-sm font-black text-gray-900">
                      {showReceipt.isDueEntry ? 'বাকির পরিমাণ:' : 'পরিশোধিত পরিমাণ:'}
                    </span>
                    <span className={`text-xl font-black ${showReceipt.isDueEntry ? 'text-red-600' : 'text-blue-600'}`}>
                      ৳{showReceipt.amount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  {showReceipt.remainingBalance !== 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-bold text-gray-400">অবশিষ্ট বকেয়া:</span>
                      <span className={`text-sm font-black ${showReceipt.remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ৳{Math.abs(showReceipt.remainingBalance).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 text-center">
                   <p className="text-[10px] font-black text-gray-400 italic">"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"</p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-3 no-print">
              <div className="flex gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Printer size={16} /> প্রিন্ট
                </button>
                <button 
                  onClick={() => handleSave(supplierReceiptRef, `Supplier_Receipt_${showReceipt.date}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download size={16} /> সেভ করুন
                </button>
              </div>
            </div>

            <footer className="p-6 bg-gray-50 border-t border-gray-100 no-print">
              <button 
                onClick={() => setShowReceipt(null)}
                className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 shadow-sm"
              >
                বন্ধ করুন
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE & PAYMENT VIEW */}
      {showCustomerDetail && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-[2.2rem] bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-sm overflow-hidden">
                        {showCustomerDetail.photo ? (
                          <DriveImage src={showCustomerDetail.photo} alt="" className="w-full h-full object-cover" token={googleAccessToken} />
                        ) : (
                          <User size={36} />
                        )}
                      </div>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900 leading-tight">
                         {showCustomerDetail.name}
                       </h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-gray-500">
                            {showCustomerDetail.phone}
                          </span>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-green-100 text-green-600 rounded-full uppercase tracking-tighter">কাস্টমার</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => { setShowCustomerDetail(null); setIsPaying(false); }} className="p-2 bg-gray-50 rounded-full text-gray-400"><X size={20} /></button>
              </div>

              <div className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl border-b-4 mb-6 ${
                showCustomerDetail.balance >= 0 
                ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-900' 
                : 'bg-gradient-to-br from-green-600 to-green-800 border-green-900'
              }`}>
                 {/* Decorative elements */}
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                 <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>

                 <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="p-3 bg-white/20 rounded-2xl mb-4 backdrop-blur-md">
                     <User className="text-white" size={24} />
                   </div>
                   
                   <div className="text-[10px] text-white/70 font-black uppercase tracking-[0.3em] mb-2">কাস্টমার বকেয়া স্থিতি</div>
                   
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-white tracking-tighter">
                       ৳{Math.abs(showCustomerDetail.balance).toLocaleString('bn-BD')}
                     </span>
                     <span className="text-lg font-bold text-white/80">.০০</span>
                   </div>

                   <div className={`mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg ${showCustomerDetail.balance >= 0 ? 'bg-white text-red-700' : 'bg-white text-green-700'}`}>
                     {showCustomerDetail.balance >= 0 ? 'মোট বকেয়া (বাকি)' : 'মোট পাওনা (পাবেন)'}
                   </div>

                   <div className="mt-8 flex items-center gap-3 w-full">
                      <button 
                        onClick={() => { setTransactionType('RECEIVED'); setIsPaying(true); }}
                        className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all ${
                          showCustomerDetail.balance >= 0 ? 'bg-white text-red-700' : 'bg-white text-green-700'
                        }`}
                      >
                         পেলাম (আদায়)
                      </button>
                      <button 
                        onClick={() => { setTransactionType('DUE_GIVEN'); setIsPaying(true); }}
                        className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all bg-black/20 text-white border border-white/20`}
                      >
                         দিলাম (বাকি)
                      </button>
                      {showCustomerDetail.phone !== 'অনিবন্ধিত' && (
                        <a 
                          href={`tel:${showCustomerDetail.phone}`} 
                          className="p-4 bg-white/10 rounded-2xl text-white border border-white/10 active:scale-95 hover:bg-white/20 transition-colors"
                        >
                          <Phone size={20} />
                        </a>
                      )}
                   </div>
                 </div>
              </div>

              {isPaying && (
                <div className={`mb-6 p-5 border-2 rounded-[2rem] animate-in slide-in-from-top-4 duration-300 ${
                  transactionType === 'RECEIVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                   <div className="flex justify-between items-center mb-4 px-1">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                        transactionType === 'RECEIVED' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {transactionType === 'RECEIVED' ? 'টাকা আদায় করুন' : 'বাকি টাকা লিখুন'}
                      </h4>
                      <button onClick={() => setIsPaying(false)} className="text-gray-400"><X size={16} /></button>
                   </div>
                   <div className="space-y-4">
                      <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl ${
                          transactionType === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
                        }`}>৳</span>
                        <input 
                          type="number" 
                          value={paymentAmount} 
                          onChange={(e) => setPaymentAmount(e.target.value)} 
                          placeholder="পরিমাণ" 
                          className={inputClasses + ` pl-10 ${transactionType === 'RECEIVED' ? 'border-green-100 focus:border-green-600' : 'border-red-100 focus:border-red-600'} text-2xl`} 
                          autoFocus 
                          inputMode="numeric"
                        />
                      </div>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={paymentDescription} 
                          onChange={(e) => setPaymentDescription(e.target.value)} 
                          placeholder="বিবরণ (ঐচ্ছিক)" 
                          className={inputClasses + " pl-12 text-sm"} 
                        />
                      </div>
                      <button 
                        onClick={handleCustomerPayment} 
                        className={`w-full text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all ${
                          transactionType === 'RECEIVED' ? 'bg-green-600 shadow-green-100' : 'bg-red-600 shadow-red-100'
                        }`}
                      >
                        {transactionType === 'RECEIVED' ? 'আদায় নিশ্চিত করুন' : 'বাকি নিশ্চিত করুন'}
                      </button>
                   </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">বিক্রয় ইতিহাস</span>
                    <History size={14} className="text-gray-300" />
                 </div>
                 
                 <div className="space-y-2">
                    {records.filter(r => r.customerName === showCustomerDetail.name && r.type === 'SALE').map(r => {
                      const isDue = r.dueAmount && r.dueAmount > 0;
                      return (
                        <div 
                          key={r.id} 
                          onClick={() => {
                            if (isDue) {
                              setShowInvoiceView(r);
                            } else {
                              setSelectedInvoice(r);
                            }
                          }}
                          className={`p-4 rounded-2xl border transition-colors cursor-pointer group ${
                            isDue 
                              ? "bg-red-50 border-red-200 hover:bg-red-100" 
                              : "bg-gray-50 border-gray-100 hover:bg-green-50"
                          }`}
                        >
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <div className="flex items-center gap-2">
                                    <div className={`text-xs font-black transition-colors ${isDue ? "text-red-700 group-hover:text-red-800" : "text-gray-900 group-hover:text-green-600"}`}>
                                       ইনভয়েস: {r.id.slice(-8)}
                                    </div>
                                    {isDue && (
                                       <span className="px-1.5 py-0.5 bg-red-600 text-[8px] font-black text-white rounded-md uppercase tracking-tighter">বাকি</span>
                                    )}
                                 </div>
                                 <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{r.date}</div>
                              </div>
                              <div className="text-right">
                                 <div className={`text-sm font-black ${isDue ? "text-red-600" : "text-green-600"}`}>৳{r.amount.toLocaleString('bn-BD')}</div>
                                 <div 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       setShowInvoiceView(r);
                                    }}
                                    className="text-[8px] font-black text-blue-600 mt-1 flex items-center gap-1 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                                 >
                                    <FileText size={10} /> বিক্রি সফল হয়েছে (রশিদ)
                                 </div>
                                 <div className="text-[8px] font-black text-gray-400 mt-1 flex items-center gap-1">
                                    <FileText size={10} /> ডিটেইলস দেখুন
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-1">
                              {r.items?.map((item, idx) => (
                                 <div key={idx} className="text-[10px] font-bold text-gray-500 flex justify-between">
                                    <span>{item.name} ({item.quantity} পিস)</span>
                                    <span>৳{(item.quantity * item.price).toLocaleString('bn-BD')}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      );
                    })}
                    {records.filter(r => r.customerName === showCustomerDetail.name && r.type === 'SALE').length === 0 && (
                       <div className="text-center py-10 text-xs text-gray-300 italic font-bold">কোনো বিক্রয় রেকর্ড নেই</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* CUSTOMER PAYMENT RECEIPT MODAL */}
      {showCustomerReceipt && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div id="printable-receipt" ref={customerReceiptRef} className="bg-white">
              <header className={`p-6 text-white text-center ${showCustomerReceipt.isDueEntry ? 'bg-red-600' : 'bg-green-600'}`}>
                <div className="mb-2">
                  <h2 className="text-lg font-black uppercase tracking-tight">{shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান'}</h2>
                  {shopSettings.shopPhone && <p className="text-[10px] font-bold opacity-80">ফোন: {shopSettings.shopPhone}</p>}
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {showCustomerReceipt.isDueEntry ? 'বাকি এন্ট্রি সফল' : 'টাকা আদায় সফল'}
                </h3>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">রশিদ (Receipt)</p>
              </header>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">কাস্টমার</div>
                  <div className="text-2xl font-black text-gray-900">{showCustomerReceipt.customerName}</div>
                  <div className="text-xs font-bold text-gray-500">{showCustomerReceipt.phone}</div>
                </div>

                <div className="bg-gray-50 rounded-[2rem] p-6 space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">তারিখ:</span>
                    <span className="text-xs font-black text-gray-900">{showCustomerReceipt.date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200">
                    <span className="text-sm font-black text-gray-900">
                      {showCustomerReceipt.isDueEntry ? 'বাকির পরিমাণ:' : 'আদায়কৃত পরিমাণ:'}
                    </span>
                    <span className={`text-xl font-black ${showCustomerReceipt.isDueEntry ? 'text-red-600' : 'text-green-600'}`}>
                      ৳{showCustomerReceipt.amount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  {showCustomerReceipt.remainingBalance !== 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs font-bold text-gray-400">অবশিষ্ট বকেয়া:</span>
                      <span className={`text-sm font-black ${showCustomerReceipt.remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ৳{Math.abs(showCustomerReceipt.remainingBalance).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 text-center">
                   <p className="text-[10px] font-black text-gray-400 italic">"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"</p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-3 no-print">
              <button 
                onClick={() => shareToWhatsApp(showCustomerReceipt)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-green-100"
              >
                <MessageSquare size={16} /> হোয়াটসঅ্যাপে শেয়ার করুন
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Printer size={16} /> প্রিন্ট
                </button>
                <button 
                  onClick={() => handleSave(customerReceiptRef, `Customer_Receipt_${showCustomerReceipt.date}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download size={16} /> সেভ করুন
                </button>
              </div>
            </div>

            <footer className="p-6 bg-gray-50 border-t border-gray-100 no-print">
              <button 
                onClick={() => setShowCustomerReceipt(null)}
                className="w-full py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 shadow-sm"
              >
                বন্ধ করুন
              </button>
            </footer>
          </div>
        </div>
      )}
      {/* INVOICE VIEW MODAL (Sale Successful Page) */}
      {showInvoiceView && (
        <InvoiceView 
          record={showInvoiceView} 
          shopSettings={shopSettings} 
          onClose={() => setShowInvoiceView(null)} 
        />
      )}
    </div>
  );
};

export default BechaKenaView;
