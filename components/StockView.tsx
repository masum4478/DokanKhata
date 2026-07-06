
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  TrendingUp, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  History, 
  Truck, 
  User, 
  Briefcase, 
  Phone, 
  CheckCircle2, 
  Calendar,
  Layers,
  Tag,
  ArrowRight,
  FileText,
  Download
} from 'lucide-react';
import { StockItem, StockTransaction, Contact, ContactType, Transaction, SalePurchaseRecord } from '../types';
import { compressImage } from '../imageUtils';
import DriveImage from './DriveImage';
import { ensureImagesFolder, uploadFileToDrive } from '../services/driveService';

interface StockViewProps {
  items: StockItem[];
  transactions: StockTransaction[];
  contacts: Contact[];
  onBack: () => void;
  onUpdateStock: (items: StockItem[], transactions: StockTransaction[]) => void;
  onUpdateContacts: (contacts: Contact[]) => void;
  onAddRecord: (record: SalePurchaseRecord) => void;
  onSelectContact?: (id: string) => void;
  googleAccessToken?: string | null;
  onTokenExpired?: () => void;
}

const StockView: React.FC<StockViewProps> = ({ items, transactions, contacts, onBack, onUpdateStock, onUpdateContacts, onAddRecord, onSelectContact, googleAccessToken, onTokenExpired }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StockItem>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [activeAction, setActiveAction] = useState<'NONE' | 'IMPORT' | 'SALE'>('NONE');
  const [showHistory, setShowHistory] = useState(false);
  const [showPriceMap, setShowPriceMap] = useState<Record<string, boolean>>({});
  const [showSupplierDetail, setShowSupplierDetail] = useState<Contact | null>(null);
  const [showProductDetail, setShowProductDetail] = useState<StockItem | null>(null);
  
  const [selectedProductForAction, setSelectedProductForAction] = useState<StockItem | null>(null);
  const [actionQuantity, setActionQuantity] = useState('');
  const [partyName, setPartyName] = useState('');
  const [actionSearchTerm, setActionSearchTerm] = useState('');
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  
  const [isFullPaid, setIsFullPaid] = useState(true);
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const [actionSerialNumbers, setActionSerialNumbers] = useState<string[]>([]);
  const [showActionSerialInputs, setShowActionSerialInputs] = useState(false);
  const [actionPrice, setActionPrice] = useState('');

  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSerialInputs, setShowSerialInputs] = useState(false);

  useEffect(() => {
    if (selectedProductForAction) {
      setActionPrice(
        activeAction === 'IMPORT'
          ? selectedProductForAction.buyingPrice.toString()
          : selectedProductForAction.sellingPrice.toString()
      );
    } else {
      setActionPrice('');
    }
  }, [selectedProductForAction, activeAction]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return items;

    // Search in current items
    const matchesCurrent = items.filter(item => 
      item.name.toLowerCase().includes(term) || 
      (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) ||
      (item.serialNumbers && item.serialNumbers.some(sn => sn.toLowerCase().includes(term)))
    );

    // Search in transactions for history (including sold serials)
    const matchingItemIdsFromTransactions = new Set(
      transactions
        .filter(t => t.selectedSerials && t.selectedSerials.some(sn => sn.toLowerCase().includes(term)))
        .map(t => t.itemId)
    );

    // Items that match via transaction history but not current stock fields
    const matchesHistory = items.filter(item => 
      matchingItemIdsFromTransactions.has(item.id) && 
      !matchesCurrent.find(m => m.id === item.id)
    );

    return [...matchesCurrent, ...matchesHistory];
  }, [items, transactions, searchTerm]);

  const filteredActionItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(actionSearchTerm.toLowerCase())
    );
  }, [items, actionSearchTerm]);

  const filteredSuppliers = useMemo(() => {
    return contacts.filter(c => 
      c.type === ContactType.SUPPLIER && 
      c.name.toLowerCase().includes(partyName.toLowerCase())
    );
  }, [contacts, partyName]);

  const totalBuyingValuation = useMemo(() => 
    items.reduce((acc, curr) => acc + (curr.quantity * curr.buyingPrice), 0),
    [items]
  );
  
  const totalSellingValuation = useMemo(() => 
    items.reduce((acc, curr) => acc + (curr.quantity * curr.sellingPrice), 0),
    [items]
  );

  const togglePriceVisibility = (id: string) => {
    setShowPriceMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditClick = (item: StockItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSave = () => {
    if ((editingId || isAdding) && editForm.name) {
      const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
      if (isAdding) {
        const newItem: StockItem = {
          id: Date.now().toString(),
          name: editForm.name || '',
          serialNumber: editForm.serialNumber || '',
          serialNumbers: editForm.serialNumbers || [],
          quantity: editForm.quantity || 0,
          unit: editForm.unit || 'পিস',
          buyingPrice: editForm.buyingPrice || 0,
          sellingPrice: editForm.sellingPrice || 0,
          lastUpdated: today,
          image: editForm.image
        };
        onUpdateStock([...items, newItem], transactions);
        setIsAdding(false);
      } else {
        const updated = items.map(item => 
          item.id === editingId 
            ? { ...item, ...editForm, lastUpdated: today } 
            : item
        );
        onUpdateStock(updated, transactions);
        setEditingId(null);
        if (showProductDetail?.id === editingId) {
          setShowProductDetail(updated.find(i => i.id === editingId) || null);
        }
      }
      setEditForm({});
      setShowSerialInputs(false);
    }
  };

  const handleStockAction = async () => {
    if (!selectedProductForAction || !actionQuantity || !partyName) {
      alert('সব তথ্য সঠিকভাবে দিন!');
      return;
    }

    setIsUploading(true);
    let finalInvoiceImage = invoiceImage;

    try {
      if (invoiceImage && invoiceImage.startsWith('data:image') && googleAccessToken) {
        const imagesFolderId = await ensureImagesFolder(googleAccessToken);
        if (imagesFolderId) {
          const fileName = `invoice_${Date.now()}.jpg`;
          const driveFileId = await uploadFileToDrive(googleAccessToken, fileName, 'image/jpeg', invoiceImage, imagesFolderId);
          if (driveFileId) {
            finalInvoiceImage = `drive://${driveFileId}`;
          }
        }
      }
    } catch (err: any) {
      console.error("Drive upload failed", err);
      if (err.message === 'TOKEN_EXPIRED' && onTokenExpired) {
        onTokenExpired();
      }
    }

    const qty = parseFloat(actionQuantity);
    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    const unitPrice = actionPrice ? parseFloat(actionPrice) : (activeAction === 'IMPORT' ? selectedProductForAction.buyingPrice : selectedProductForAction.sellingPrice);
    const totalCost = qty * unitPrice;
    
    let updatedItems = items.map(item => {
      if (item.id === selectedProductForAction.id) {
        const newQty = activeAction === 'IMPORT' ? item.quantity + qty : item.quantity - qty;
        if (newQty < 0 && activeAction === 'SALE') {
          alert('স্টকে পর্যাপ্ত পণ্য নেই!');
          return item;
        }
        
        let newSerialNumbers = [...(item.serialNumbers || [])];
        if (activeAction === 'IMPORT' && actionSerialNumbers.length > 0) {
          newSerialNumbers = [...newSerialNumbers, ...actionSerialNumbers.filter(s => s.trim() !== '')];
        }

        let previousBuyingPrice = item.previousBuyingPrice;
        let currentBuyingPrice = item.buyingPrice;
        if (activeAction === 'IMPORT' && actionPrice) {
          const newPrice = parseFloat(actionPrice);
          if (newPrice !== item.buyingPrice) {
            previousBuyingPrice = item.buyingPrice;
            currentBuyingPrice = newPrice;
          }
        }

        return { 
          ...item, 
          quantity: newQty, 
          buyingPrice: currentBuyingPrice,
          previousBuyingPrice: previousBuyingPrice,
          lastUpdated: today,
          serialNumbers: newSerialNumbers
        };
      }
      return item;
    });

    if (activeAction === 'IMPORT') {
      const actualPaid = isFullPaid ? totalCost : parseFloat(paidAmount || '0');
      const due = totalCost - actualPaid;
      
      const recordId = Date.now().toString();
      const ledgerTransaction: Transaction = {
        id: recordId + "-ledger",
        type: 'RECEIVED',
        amount: actualPaid,
        description: `স্টক ক্রয়: ${selectedProductForAction.name} (${qty} ${selectedProductForAction.unit}) ${note ? `[${note}]` : ''}`,
        date: today,
        recordId: recordId
      };

      const existingSupplier = contacts.find(c => c.name.toLowerCase() === partyName.toLowerCase());
      if (existingSupplier) {
        const updatedContacts = contacts.map(c => {
          if (c.id === existingSupplier.id) {
            return { 
              ...c, 
              balance: c.balance - due, 
              transactions: [ledgerTransaction, ...c.transactions],
              lastActivity: 'এখনই'
            };
          }
          return c;
        });
        onUpdateContacts(updatedContacts);
      } else {
        const newSupplier: Contact = {
          id: Date.now().toString() + "-new",
          name: partyName,
          phone: 'সাপ্লায়ার',
          type: ContactType.SUPPLIER,
          balance: -due,
          lastActivity: 'এখনই',
          transactions: [ledgerTransaction]
        };
        onUpdateContacts([...contacts, newSupplier]);
      }
    }

    const recordId = Date.now().toString();
    const newTransaction: StockTransaction = {
      id: recordId,
      itemId: selectedProductForAction.id,
      itemName: selectedProductForAction.name,
      type: activeAction === 'IMPORT' ? 'IN' : 'OUT',
      quantity: qty,
      price: unitPrice,
      date: today,
      partyName,
      invoiceImage: finalInvoiceImage || undefined,
      selectedSerials: activeAction === 'IMPORT' ? actionSerialNumbers : []
    };

    const newRecord: SalePurchaseRecord = {
      id: recordId,
      type: activeAction === 'IMPORT' ? 'PURCHASE' : 'SALE',
      amount: totalCost,
      paidAmount: activeAction === 'IMPORT' ? (isFullPaid ? totalCost : parseFloat(paidAmount || '0')) : totalCost,
      dueAmount: activeAction === 'IMPORT' ? (isFullPaid ? 0 : totalCost - parseFloat(paidAmount || '0')) : 0,
      description: `${selectedProductForAction.name} (${qty} ${selectedProductForAction.unit})`,
      date: today,
      isCash: activeAction === 'IMPORT' ? isFullPaid : true,
      customerName: partyName,
      invoiceImage: finalInvoiceImage || undefined,
      items: [{
        productId: selectedProductForAction.id,
        name: selectedProductForAction.name,
        quantity: qty,
        price: unitPrice,
        selectedSerials: activeAction === 'IMPORT' ? actionSerialNumbers : []
      }]
    };
    onAddRecord(newRecord);

    onUpdateStock(updatedItems, [newTransaction, ...transactions]);
    setIsUploading(false);
    resetActionStates();
  };

  const handleSupplierPayment = () => {
    if (!showSupplierDetail || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const ledgerTransaction: Transaction = {
      id: Date.now().toString() + "-pay",
      type: 'RECEIVED',
      amount: amount,
      description: `বকেয়া পরিশোধ (সাপ্লায়ার পেমেন্ট)`,
      date: today
    };

    const updatedContacts = contacts.map(c => {
      if (c.id === showSupplierDetail.id) {
        return { 
          ...c, 
          balance: c.balance + amount, 
          transactions: [ledgerTransaction, ...c.transactions],
          lastActivity: today
        };
      }
      return c;
    });

    onUpdateContacts(updatedContacts);
    setIsPaying(false);
    setPaymentAmount('');
    const updatedSupplier = updatedContacts.find(c => c.id === showSupplierDetail.id);
    if (updatedSupplier) setShowSupplierDetail(updatedSupplier);
  };

  const deleteTransaction = (id: string) => {
    if (confirm('হিস্টোরি থেকে ডিলিট করতে চান? (এটি স্টক এডজাস্ট করবে না)')) {
      onUpdateStock(items, transactions.filter(t => t.id !== id));
    }
  };

  const resetActionStates = () => {
    setActiveAction('NONE');
    setSelectedProductForAction(null);
    setActionQuantity('');
    setActionPrice('');
    setActionSerialNumbers([]);
    setShowActionSerialInputs(false);
    setPartyName('');
    setActionSearchTerm('');
    setShowActionDropdown(false);
    setShowPartyDropdown(false);
    setIsFullPaid(true);
    setPaidAmount('');
    setNote('');
    setInvoiceImage(null);
  };

  const openSupplierProfile = (name: string) => {
    const contact = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (contact && onSelectContact) {
      onSelectContact(contact.id);
    } else if (contact) {
      setShowSupplierDetail(contact);
    } else {
      setShowSupplierDetail({
        id: 'tmp',
        name,
        phone: 'অনিবন্ধিত',
        type: ContactType.SUPPLIER,
        balance: 0,
        transactions: [],
        lastActivity: 'রেকর্ড নেই'
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('এই পণ্যটি কি চিরতরে ডিলিট করতে চান?')) {
      onUpdateStock(items.filter(item => item.id !== id), transactions);
      setEditingId(null);
      setShowProductDetail(null);
    }
  };

  const handleUpdateImage = async (e: React.ChangeEvent<HTMLInputElement>, item: StockItem) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string);
          const updatedItems = items.map(i => 
            i.id === item.id ? { ...i, image: compressed } : i
          );
          onUpdateStock(updatedItems, transactions);
          if (showProductDetail?.id === item.id) {
            setShowProductDetail({ ...item, image: compressed });
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Image update failed", err);
        alert("ছবি আপডেট করতে সমস্যা হয়েছে");
      }
    }
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-[#D32F2F] focus:ring-4 focus:ring-red-50 transition-all shadow-sm text-lg placeholder:text-gray-400";

  return (
    <div className="bg-gray-50 min-h-full flex flex-col pb-24 animate-in fade-in duration-300">
      <header className="p-4 bg-gradient-to-br from-red-700 to-red-800 text-white rounded-b-[2rem] shadow-lg sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 bg-white/10 rounded-full active:scale-90 transition-transform"><ArrowLeft size={20} /></button>
            <h2 className="text-lg font-black tracking-tight">স্টক ইনভেন্টরি</h2>
          </div>
          <button onClick={() => setShowHistory(true)} className="p-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <History size={14} /> ট্রানজেকশন
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => setShowHistory(true)} className="bg-white/15 p-2 px-3 rounded-2xl border border-white/10 cursor-pointer active:bg-white/20 transition-colors">
            <span className="text-[8px] font-black uppercase text-red-100/70 block tracking-widest">স্টক ভ্যালু (কেনা)</span>
            <div className="text-lg font-black">৳{totalBuyingValuation.toLocaleString('bn-BD')}</div>
          </div>
          <div className="bg-white/15 p-2 px-3 rounded-2xl border border-white/10 text-right">
            <span className="text-[8px] font-black uppercase text-yellow-100/70 block tracking-widest">সম্ভাব্য লাভ</span>
            <div className="text-lg font-black text-yellow-300">৳{(totalSellingValuation - totalBuyingValuation).toLocaleString('bn-BD')}</div>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-5 mb-5">
        <div className="bg-white shadow-2xl rounded-[2.5rem] p-4 grid grid-cols-3 gap-3 border border-gray-50">
           <button onClick={() => setIsAdding(true)} className="flex flex-col items-center gap-2 group p-2 rounded-2xl active:bg-red-50 transition-colors">
             <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 group-active:scale-90 transition-transform shadow-sm">
               <Plus size={28} />
             </div>
             <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter">নতুন পণ্য</span>
           </button>
           <button onClick={() => setActiveAction('IMPORT')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl active:bg-green-50 transition-colors">
             <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 group-active:scale-90 transition-transform shadow-sm">
               <ArrowDownLeft size={28} />
             </div>
             <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter">স্টক ইন (ক্রয়)</span>
           </button>
           <button onClick={() => setActiveAction('SALE')} className="flex flex-col items-center gap-2 group p-2 rounded-2xl active:bg-blue-50 transition-colors">
             <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-active:scale-90 transition-transform shadow-sm">
               <ArrowUpRight size={28} />
             </div>
             <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter">স্টক আউট</span>
           </button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="নাম বা সিরিয়াল দিয়ে খুঁজুন..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:border-red-600 outline-none transition-all" 
          />
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 pb-10 overflow-y-auto no-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center opacity-20">
             <Package size={64} className="mx-auto mb-4" />
             <p className="font-black text-lg uppercase tracking-widest">স্টক খালি</p>
          </div>
        ) : filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => setShowProductDetail(item)}
            className="bg-white p-3 px-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center font-black text-gray-400 text-sm overflow-hidden border border-gray-100">
                  {item.image ? (
                    <DriveImage src={item.image} className="w-full h-full object-cover" alt={item.name} token={googleAccessToken} />
                  ) : (
                    item.name[0]
                  )}
               </div>
               <div className="max-w-[140px]">
                  <h4 className="font-black text-gray-900 text-sm leading-tight truncate">{item.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.quantity === 0 ? 'bg-gray-100 text-gray-400' : item.quantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      {item.quantity > 0 && <span className="text-[8px] font-black text-green-600 bg-green-50 px-1 py-0.5 rounded uppercase tracking-tighter">স্টকে আছে</span>}
                      {item.quantity === 0 && <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-1 py-0.5 rounded uppercase tracking-tighter">স্টক শেষ</span>}
                      {item.serialNumber && <span className="text-[8px] font-bold text-gray-400 tracking-tighter"># {item.serialNumber}</span>}
                    </div>
               </div>
            </div>
            <div className="text-right">
               <div className="flex flex-col items-end">
                  <div className="text-xs font-black text-gray-900">৳{item.sellingPrice}</div>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400">
                    কেনা: {showPriceMap[item.id] ? `৳${item.buyingPrice}` : '***'}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePriceVisibility(item.id);
                      }} 
                      className="ml-1 text-[#D32F2F]"
                    >
                      {showPriceMap[item.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                    </button>
                  </div>
               </div>
               <div className="flex gap-2 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(item);
                    }} 
                    className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={12} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {(activeAction !== 'NONE') && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 shadow-2xl relative my-auto">
            <button onClick={resetActionStates} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
               <X size={24} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
               <div className={`p-4 rounded-3xl ${activeAction === 'IMPORT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {activeAction === 'IMPORT' ? <ArrowDownLeft size={40} /> : <ArrowUpRight size={40} />}
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                     {activeAction === 'IMPORT' ? 'স্টক ক্রয় (ইন)' : 'স্টক বিক্রি (আউট)'}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন</p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="relative" ref={actionDropdownRef}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">পণ্য নির্বাচন করুন</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="পণ্যের নাম লিখুন..." 
                      value={selectedProductForAction ? selectedProductForAction.name : actionSearchTerm}
                      onChange={(e) => {
                        setActionSearchTerm(e.target.value);
                        setShowActionDropdown(true);
                        if (selectedProductForAction) setSelectedProductForAction(null);
                      }}
                      onFocus={() => setShowActionDropdown(true)}
                      className={inputClasses + " pl-12 text-base"}
                    />
                  </div>

                  {showActionDropdown && !selectedProductForAction && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto no-scrollbar ring-8 ring-black/5">
                       {filteredActionItems.map(item => (
                         <button key={item.id} onClick={() => { setSelectedProductForAction(item); setShowActionDropdown(false); }} className="w-full text-left p-4 hover:bg-red-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                           <div className="font-black text-gray-800 text-base">{item.name}</div>
                           <Plus size={16} className="text-gray-300" />
                         </button>
                       ))}
                    </div>
                  )}
               </div>

               {selectedProductForAction && (
                 <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">পরিমাণ ({selectedProductForAction.unit})</label>
                           <input 
                             type="number" 
                             value={actionQuantity} 
                             onChange={(e) => {
                               setActionQuantity(e.target.value);
                               setActionSerialNumbers([]);
                             }} 
                             placeholder="0.00" 
                             className={inputClasses + " text-2xl"} 
                             inputMode="numeric"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">একক মূল্য (৳)</label>
                           <input 
                             type="number" 
                             value={actionPrice} 
                             onChange={(e) => setActionPrice(e.target.value)} 
                             placeholder="0.00" 
                             className={inputClasses + " text-2xl"} 
                             inputMode="numeric"
                           />
                        </div>
                     </div>

                     {activeAction === 'IMPORT' && actionQuantity && parseFloat(actionQuantity) > 0 && (
                       <div className="space-y-3">
                         <button 
                           type="button"
                           onClick={() => setShowActionSerialInputs(!showActionSerialInputs)}
                           className="w-full py-2 px-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                         >
                           {showActionSerialInputs ? <X size={14} /> : <Plus size={14} />}
                           {showActionSerialInputs ? 'সিরিয়াল লুকান' : 'সিরিয়াল নাম্বার যোগ করুন'}
                         </button>

                         {showActionSerialInputs && (
                           <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border-2 border-gray-100 no-scrollbar">
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">প্রতিটি পণ্যের সিরিয়াল দিন:</p>
                             {Array.from({ length: Math.min(Math.floor(parseFloat(actionQuantity)), 50) }).map((_, idx) => (
                               <div key={idx} className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300">{idx + 1}</span>
                                 <input
                                   className={inputClasses + " py-2 pl-8 text-xs font-bold"}
                                   placeholder={`সিরিয়াল নাম্বার`}
                                   value={actionSerialNumbers[idx] || ''}
                                   onChange={e => {
                                     const newSerials = [...actionSerialNumbers];
                                     newSerials[idx] = e.target.value;
                                     setActionSerialNumbers(newSerials);
                                   }}
                                 />
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     )}
                    
                    <div className="relative" ref={partyDropdownRef}>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">
                        {activeAction === 'IMPORT' ? 'সাপ্লায়ারের নাম' : 'কাস্টমারের নাম'}
                      </label>
                      <input 
                        type="text" 
                        placeholder="নাম লিখুন..." 
                        value={partyName} 
                        onChange={(e) => { setPartyName(e.target.value); setShowPartyDropdown(true); }}
                        onFocus={() => setShowPartyDropdown(true)}
                        className={inputClasses + " text-base"} 
                      />
                      {showPartyDropdown && partyName && activeAction === 'IMPORT' && filteredSuppliers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl z-50 ring-8 ring-black/5">
                           {filteredSuppliers.map(s => (
                             <button key={s.id} onClick={() => { setPartyName(s.name); setShowPartyDropdown(false); }} className="w-full text-left p-3 px-4 hover:bg-blue-50 border-b last:border-0 font-bold">
                                {s.name}
                             </button>
                           ))}
                        </div>
                      )}
                    </div>

                    {activeAction === 'IMPORT' && (
                      <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100 space-y-5 shadow-inner">
                         <div className="flex items-center justify-between">
                            <span className="font-black text-gray-700">সম্পূর্ণ টাকা দিয়েছেন?</span>
                            <div className="flex p-1 bg-white border border-gray-200 rounded-full">
                               <button onClick={() => setIsFullPaid(true)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${isFullPaid ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}>হ্যাঁ</button>
                               <button onClick={() => setIsFullPaid(false)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${!isFullPaid ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}>না (বাকি)</button>
                            </div>
                         </div>
                         {!isFullPaid && (
                           <div className="animate-in slide-in-from-top-2 duration-200">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">পরিশোধিত টাকা (টাকা দিয়েছেন)</label>
                             <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0.00" className={inputClasses} inputMode="numeric" />
                           </div>
                         )}
                         <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="লেনদেন সংক্রান্ত তথ্য..." className={inputClasses + " text-sm py-3"} />
                         </div>

                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">ইনভয়েস ছবি (Attach File)</label>
                           <div className="flex items-center gap-3">
                             <label className="flex-1 flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                               <div className="flex flex-col items-center justify-center pt-1 pb-1">
                                 <Plus className="w-6 h-6 text-gray-400 mb-1" />
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ছবি যোগ করুন</p>
                               </div>
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*"
                                 onChange={async (e) => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     const reader = new FileReader();
                                     reader.onloadend = async () => {
                                       const compressed = await compressImage(reader.result as string);
                                       setInvoiceImage(compressed);
                                     };
                                     reader.readAsDataURL(file);
                                   }
                                 }}
                               />
                             </label>
                             {invoiceImage && (
                               <div className="relative w-20 h-20">
                                 <DriveImage src={invoiceImage} alt="Invoice" className="w-full h-full object-cover rounded-xl border-2 border-gray-100" token={googleAccessToken} onTokenExpired={onTokenExpired} />
                                 <button 
                                   onClick={() => setInvoiceImage(null)}
                                   className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg"
                                 >
                                   <X size={12} />
                                 </button>
                               </div>
                             )}
                           </div>
                         </div>
                      </div>
                    )}

                    <button 
                      onClick={handleStockAction} 
                      disabled={isUploading}
                      className={`w-full py-5 rounded-[2rem] font-black text-xl text-white shadow-2xl active:scale-95 transition-all bg-[#D32F2F] shadow-red-100 hover:bg-red-700 flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          আপলোড হচ্ছে...
                        </>
                      ) : (
                        'নিশ্চিত করুন'
                      )}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {showSupplierDetail && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[2.2rem] bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                       <Truck size={36} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900 leading-tight">{showSupplierDetail.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full uppercase tracking-tighter">সাপ্লায়ার প্রোফাইল</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setShowSupplierDetail(null)} className="p-2 bg-gray-50 rounded-full text-gray-400"><X size={20} /></button>
              </div>

              <div className="bg-gray-900 text-white p-6 rounded-[2.5rem] shadow-xl mb-6 relative overflow-hidden">
                 <div className="relative z-10">
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">মোট বকেয়া (আপনার কাছে পাবে)</div>
                   <div className="text-3xl font-black text-red-400">
                     ৳{Math.abs(showSupplierDetail.balance).toLocaleString('bn-BD')}
                   </div>
                   <div className="mt-4 flex items-center gap-3">
                      <button 
                        onClick={() => setIsPaying(true)}
                        className="flex-1 bg-white text-gray-900 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                         বকেয়া পরিশোধ
                      </button>
                      <button className="p-3 bg-white/10 rounded-2xl text-white border border-white/10 active:scale-95"><Phone size={20} /></button>
                   </div>
                 </div>
                 <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
              </div>

              {isPaying && (
                <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
                   <div className="flex justify-between items-center mb-4 px-1">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">টাকা পরিশোধ করুন</h4>
                      <button onClick={() => setIsPaying(false)} className="text-blue-400"><X size={16} /></button>
                   </div>
                   <div className="space-y-4">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-600 text-xl">৳</span>
                        <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="পরিমাণ" className={inputClasses + " pl-10 border-blue-100 focus:border-blue-600 text-2xl"} autoFocus inputMode="numeric" />
                      </div>
                      <button onClick={handleSupplierPayment} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 uppercase text-xs tracking-widest active:scale-95 transition-all">
                        পরিশোধ নিশ্চিত করুন
                      </button>
                   </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">লেনদেনের ইতিহাস ও ইনভয়েস</span>
                    <History size={14} className="text-gray-300" />
                 </div>
                 
                 <div className="space-y-4">
                    {transactions.filter(t => t.partyName === showSupplierDetail.name && t.type === 'IN').map(t => (
                      <div key={t.id} className="p-5 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                               <div className="text-base font-black text-gray-900 leading-tight mb-1">{t.itemName}</div>
                               <div className="flex items-center gap-2">
                                 <span className="text-[9px] font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase tracking-widest">স্টক ইন</span>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t.date}</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-sm font-black text-gray-900">{t.quantity} {items.find(i => i.id === t.itemId)?.unit || 'পিস'}</div>
                               <div className="text-xs font-black text-red-600 mt-0.5">৳{(t.quantity * t.price).toLocaleString('bn-BD')}</div>
                            </div>
                         </div>
                         
                         {t.invoiceImage && (
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                 <FileText size={10} /> ইনভয়েস ছবি (Attach File)
                               </p>
                               <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm aspect-video cursor-pointer hover:opacity-90" onClick={() => setSelectedPreviewImage(t.invoiceImage || null)}>
                                 <DriveImage 
                                    src={t.invoiceImage} 
                                    alt="Invoice" 
                                    className="w-full h-full object-cover" 
                                    token={googleAccessToken} 
                                    onTokenExpired={onTokenExpired}
                                 />
                               </div>
                            </div>
                         )}
                      </div>
                    ))}

                    {showSupplierDetail.transactions.map(t => (
                      <div key={t.id} className="p-4 bg-green-50 rounded-[2rem] border border-green-100 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white text-green-600 flex items-center justify-center border border-green-200 shadow-sm"><CheckCircle2 size={20} /></div>
                            <div>
                               <div className="text-sm font-black text-green-800">{t.description}</div>
                               <div className="text-[9px] font-bold text-green-400 uppercase mt-0.5 tracking-tighter">{t.date}</div>
                            </div>
                         </div>
                         <div className="text-base font-black text-green-700">৳{t.amount.toLocaleString('bn-BD')}</div>
                      </div>
                    ))}
                    
                    {transactions.filter(t => t.partyName === showSupplierDetail.name).length === 0 && showSupplierDetail.transactions.length === 0 && (
                       <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                          <History size={40} className="mx-auto mb-3 text-gray-200" />
                          <p className="text-xs text-gray-400 font-black uppercase tracking-widest">কোনো লেনদেন রেকর্ড নেই</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-6 shadow-2xl h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 px-2">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-2xl text-red-600"><History size={24} /></div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">স্টক ট্রানজেকশন</h3>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                 {transactions.length === 0 ? (
                   <div className="text-center py-24 opacity-20">
                      <History size={64} className="mx-auto mb-4" />
                      <p className="font-black text-lg uppercase tracking-widest">খাতা খালি</p>
                   </div>
                 ) : (
                   transactions.map(t => (
                    <div key={t.id} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 relative group active:scale-95 transition-all">
                       <div className="flex justify-between items-start mb-3">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} uppercase tracking-widest`}>
                             {t.type === 'IN' ? 'ক্রয় (ইন)' : 'বিক্রি (আউট)'}
                          </span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={10} /> {t.date}</span>
                       </div>
                       <div className="font-black text-gray-800 text-base mb-2">{t.itemName}</div>
                       {t.invoiceImage && (
                          <div className="mb-3" onClick={() => setSelectedPreviewImage(t.invoiceImage || null)}>
                             <DriveImage 
                                src={t.invoiceImage} 
                                alt="Invoice" 
                                className="w-full h-24 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-all"
                                token={googleAccessToken}
                             />
                          </div>
                       )}
                       <div className="flex justify-between items-end">
                          <div className="text-[10px] text-gray-500 font-bold flex flex-col">
                             <span className="uppercase tracking-widest text-[8px] mb-0.5 opacity-50">{t.type === 'IN' ? 'সাপ্লায়ার' : 'কাস্টমার'}</span>
                             <button 
                                onClick={() => { if(t.type === 'IN') openSupplierProfile(t.partyName); setShowHistory(false); }}
                                className="text-blue-600 hover:underline text-left font-black"
                              >
                                {t.partyName}
                              </button>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-black text-gray-400">{t.quantity} পিস × ৳{t.price}</div>
                             <div className={`text-lg font-black ${t.type === 'IN' ? 'text-[#D32F2F]' : 'text-green-600'}`}>৳{(t.quantity * t.price).toLocaleString('bn-BD')}</div>
                          </div>
                       </div>
                       <button onClick={() => deleteTransaction(t.id)} className="absolute -top-1 -right-1 p-2 bg-white shadow-xl rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                       </button>
                    </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {showProductDetail && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div 
                  className={`w-16 h-16 rounded-[2.2rem] bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm overflow-hidden ${showProductDetail.image ? 'cursor-pointer hover:opacity-90' : ''}`}
                  onClick={() => {
                    if (showProductDetail.image) {
                      setSelectedPreviewImage(showProductDetail.image);
                    }
                  }}
                  title={showProductDetail.image ? "ছবি বড় করে দেখুন" : ""}
                >
                  {showProductDetail.image ? (
                    <DriveImage src={showProductDetail.image} alt="" className="w-full h-full object-cover" token={googleAccessToken} />
                  ) : (
                    <Package size={36} />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">{showProductDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-full uppercase tracking-tighter">পণ্যের তথ্য</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowProductDetail(null)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-4 overflow-y-auto no-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[8px] font-black uppercase text-gray-400 block tracking-widest mb-1">ক্রয় মূল্য (বর্তমান)</span>
                  <div className="text-lg font-black text-gray-900">৳{showProductDetail.buyingPrice}</div>
                  {showProductDetail.previousBuyingPrice !== undefined && showProductDetail.previousBuyingPrice !== showProductDetail.buyingPrice && (
                    <span className="text-[9px] text-gray-400 font-bold block mt-1">আগের ক্রয়মূল্য: ৳{showProductDetail.previousBuyingPrice}</span>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[8px] font-black uppercase text-gray-400 block tracking-widest mb-1">বিক্রয় মূল্য</span>
                  <div className="text-lg font-black text-green-600">৳{showProductDetail.sellingPrice}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black uppercase text-gray-400 block tracking-widest mb-1">স্টক পরিমাণ</span>
                  <div className="text-lg font-black text-gray-900">{showProductDetail.quantity} {showProductDetail.unit}</div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${showProductDetail.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {showProductDetail.quantity > 0 ? 'স্টকে আছে' : 'স্টক শেষ'}
                </div>
              </div>

              {/* Suppliers List with Invoices */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">সাপ্লায়ার ও ইনভয়েস ইতিহাস</h4>
                {(() => {
                  const itemInTransactions = transactions.filter(t => t.itemId === showProductDetail.id && t.type === 'IN');
                  if (itemInTransactions.length === 0) {
                    return (
                      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-[10px] font-bold text-gray-400 uppercase">
                        কোনো সাপ্লায়ারের তথ্য নেই
                      </div>
                    );
                  }

                  // Get unique suppliers
                  const suppliers = Array.from(new Set(itemInTransactions.map(t => t.partyName))) as string[];

                  return suppliers.map(supplierName => {
                    const supplierTransactions = itemInTransactions.filter(t => t.partyName === supplierName);
                    return (
                      <div key={supplierName} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-blue-50/30">
                          <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600" onClick={() => { openSupplierProfile(supplierName); setShowProductDetail(null); }}>
                             <Truck size={14} className="text-blue-500" />
                             <span className="text-sm font-black text-gray-900">{supplierName}</span>
                          </div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{supplierTransactions.length} বার ক্রয়</span>
                        </div>
                        <div className="p-3 space-y-3">
                          {supplierTransactions.map(t => (
                            <div key={t.id} className="space-y-2 pb-2 last:pb-0 last:border-0 border-b border-gray-100/50">
                              <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} />
                                  <span>{t.date}</span>
                                </div>
                                <span>{t.quantity} {showProductDetail.unit} × ৳{t.price}</span>
                              </div>
                              
                              {/* Serial numbers for this specific purchase */}
                              {t.selectedSerials && t.selectedSerials.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {t.selectedSerials.map((sn, snIdx) => {
                                    const isSold = !showProductDetail.serialNumbers?.includes(sn);
                                    return (
                                      <span key={snIdx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSold ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-700 border-green-100'} flex items-center gap-1`}>
                                        {sn}
                                        {isSold && <span className="text-[7px] opacity-70">(Sold)</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {t.invoiceImage && (
                                <div className="relative group mt-2" onClick={() => setSelectedPreviewImage(t.invoiceImage || null)}>
                                  <DriveImage 
                                    src={t.invoiceImage} 
                                    alt="Invoice" 
                                    className="w-full h-24 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-all shadow-sm"
                                    token={googleAccessToken}
                                  />
                                  <div className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye size={12} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {showProductDetail.serialNumbers && showProductDetail.serialNumbers.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <span className="text-[8px] font-black uppercase text-gray-400 block tracking-widest mb-2">স্টকে থাকা সিরিয়াল নাম্বারসমূহ</span>
                   <div className="flex flex-wrap gap-1.5">
                      {showProductDetail.serialNumbers.map((sn, idx) => (
                        <span key={idx} className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 shadow-sm">
                          {sn}
                        </span>
                      ))}
                   </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    handleEditClick(showProductDetail);
                    setShowProductDetail(null);
                  }} 
                  className="flex-1 p-4 bg-blue-600 text-white rounded-2xl font-black active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} /> এডিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl text-gray-900 uppercase">নতুন পণ্য</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
               </div>
                <div className="space-y-4">
                   <div className="relative">
                     <Tag className="absolute left-4 top-4 text-gray-400" size={18} />
                     <input className={inputClasses + " pl-12 py-3 text-base"} placeholder="পণ্যের নাম" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <input type="number" className={inputClasses + " py-3 text-sm"} placeholder="পরিমাণ" value={editForm.quantity || ''} onChange={e => setEditForm({...editForm, quantity: parseFloat(e.target.value)})} inputMode="numeric" />
                      <input className={inputClasses + " py-3 text-sm"} placeholder="একক (পিস)" value={editForm.unit || ''} onChange={e => setEditForm({...editForm, unit: e.target.value})} />
                   </div>

                   <div className="space-y-3">
                    <input className={inputClasses + " py-3 text-sm"} placeholder="সিরিয়াল নাম্বার (ঐচ্ছিক)" value={editForm.serialNumber || ''} onChange={e => setEditForm({...editForm, serialNumber: e.target.value})} />
                   </div>

                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">পণ্যের ছবি (ঐচ্ছিক)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                        <div className="flex flex-col items-center justify-center pt-1 pb-1">
                          <Plus className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ছবি যোগ করুন</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const compressed = await compressImage(reader.result as string);
                                setEditForm({...editForm, image: compressed});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {editForm.image && (
                        <div className="relative w-20 h-20">
                          <DriveImage src={editForm.image} alt="Product" className="w-full h-full object-cover rounded-xl border-2 border-gray-100" token={googleAccessToken} />
                          <button 
                            onClick={() => setEditForm({...editForm, image: undefined})}
                            className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                   <div className="grid grid-cols-2 gap-3">
                      <input type="number" className={inputClasses + " py-3 text-sm"} placeholder="কেনা মূল্য" value={editForm.buyingPrice || ''} onChange={e => setEditForm({...editForm, buyingPrice: parseFloat(e.target.value)})} inputMode="numeric" />
                      <input type="number" className={inputClasses + " py-3 text-sm"} placeholder="বিক্রি মূল্য" value={editForm.sellingPrice || ''} onChange={e => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value)})} inputMode="numeric" />
                   </div>
                   <button onClick={handleSave} className="w-full bg-[#D32F2F] text-white p-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4">
                     পণ্য সেভ করুন
                   </button>
                </div>
            </div>
          </div>
        )}

      {editingId && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 uppercase">
                 <Edit2 size={20} className="text-blue-600" /> তথ্য এডিট
              </h3>
              <div className="space-y-4">
                 <input className={inputClasses + " py-3 text-base"} placeholder="পণ্যের নাম" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                 <input className={inputClasses + " py-3 text-sm"} placeholder="সিরিয়াল নাম্বার" value={editForm.serialNumber || ''} onChange={e => setEditForm({...editForm, serialNumber: e.target.value})} />
                 
                 {editForm.serialNumbers && editForm.serialNumbers.length > 0 && (
                   <div className="space-y-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-2xl border-2 border-gray-100 no-scrollbar">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">সিরিয়াল নাম্বারসমূহ:</p>
                     {editForm.serialNumbers.map((sn, idx) => (
                       <div key={idx} className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300">{idx + 1}</span>
                         <input
                           className={inputClasses + " py-2 pl-8 text-xs font-bold"}
                           placeholder={`সিরিয়াল নাম্বার`}
                           value={sn}
                           onChange={e => {
                             const newSerials = [...(editForm.serialNumbers || [])];
                             newSerials[idx] = e.target.value;
                             setEditForm({...editForm, serialNumbers: newSerials});
                           }}
                         />
                       </div>
                     ))}
                   </div>
                 )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">পণ্যের ছবি (ঐচ্ছিক)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                        <div className="flex flex-col items-center justify-center pt-1 pb-1">
                          <Plus className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ছবি পরিবর্তন করুন</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const compressed = await compressImage(reader.result as string);
                                  setEditForm({...editForm, image: compressed});
                                };
                                reader.readAsDataURL(file);
                              } catch (err) {
                                console.error("Image update failed", err);
                                alert("ছবি আপডেট করতে সমস্যা হয়েছে");
                              }
                            }
                          }}
                        />
                      </label>
                      {editForm.image && (
                        <div className="relative w-20 h-20">
                          <DriveImage src={editForm.image} alt="Product" className="w-full h-full object-cover rounded-xl border-2 border-gray-100" token={googleAccessToken} />
                          <button 
                            onClick={() => setEditForm({...editForm, image: undefined})}
                            className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                 <div className="grid grid-cols-2 gap-3">
                   <input type="number" className={inputClasses + " py-3 text-sm"} placeholder="কেনা মূল্য" value={editForm.buyingPrice || ''} onChange={e => setEditForm({...editForm, buyingPrice: parseFloat(e.target.value)})} inputMode="numeric" />
                   <input type="number" className={inputClasses + " py-3 text-sm"} placeholder="বিক্রি মূল্য" value={editForm.sellingPrice || ''} onChange={e => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value)})} inputMode="numeric" />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button onClick={() => setEditingId(null)} className="flex-1 p-4 bg-gray-100 text-gray-600 rounded-2xl font-black active:scale-95">বাতিল</button>
                    <button onClick={handleSave} className="flex-1 p-4 bg-blue-600 text-white rounded-2xl font-black active:scale-95 shadow-lg">আপডেট</button>
                  </div>
                  <button 
                    onClick={() => handleDelete(editingId || '')} 
                    className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-black active:scale-95 flex items-center justify-center gap-2 border-2 border-red-100 mt-3"
                  >
                    <Trash2 size={18} /> পণ্যটি ডিলিট করুন
                  </button>
              </div>
           </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 text-white">
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">ইমেজ প্রিভিউ</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedPreviewImage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
             <DriveImage 
               src={selectedPreviewImage} 
               className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
               token={googleAccessToken} 
             />
          </div>
          <div className="p-8 flex justify-center">
             <button 
                onClick={() => {
                  const fileId = selectedPreviewImage.startsWith('drive://') ? selectedPreviewImage.replace('drive://', '') : null;
                  if (fileId && googleAccessToken) {
                    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
                    fetch(downloadUrl, {
                      headers: { Authorization: `Bearer ${googleAccessToken}` }
                    })
                    .then(res => res.blob())
                    .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `attachment_${fileId}.png`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    })
                    .catch(e => console.error('Download failed:', e));
                  } else {
                    const a = document.createElement('a');
                    a.href = selectedPreviewImage;
                    a.download = 'attachment.png';
                    a.target = '_blank';
                    a.click();
                  }
                }}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
             >
                <Download size={20} /> ডাউনলোড করুন
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockView;
