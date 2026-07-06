
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  User, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  X, 
  RotateCcw,
  Truck,
  ShoppingCart,
  LayoutGrid,
  Wrench,
  ShieldCheck,
  Clock,
  Camera,
  Phone,
  Check,
  Send
} from 'lucide-react';
import { Contact, StockItem, ContactType, SalePurchaseRecord, ShopSettings, WarrantyItem, WarrantyStatus } from '../types';
import { compressImage } from '../imageUtils';

interface ProductReturnViewProps {
  contacts: Contact[];
  stockItems: StockItem[];
  records: SalePurchaseRecord[];
  warranties: WarrantyItem[];
  onUpdateWarranties: (warranties: WarrantyItem[]) => void;
  onBack: () => void;
  onConfirmReturn: (data: {
    type: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
    contactId: string;
    contactName: string;
    items: { productId: string; name: string; quantity: number; price: number }[];
    total: number;
    addToStock: boolean;
    originalId?: string;
  }) => void;
  onDeleteReturn: (id: string) => void;
}

const ProductReturnView: React.FC<ProductReturnViewProps> = ({ 
  contacts, 
  stockItems, 
  records, 
  warranties = [], 
  onUpdateWarranties, 
  onBack, 
  onConfirmReturn, 
  onDeleteReturn 
}) => {
  // Main Navigation tab
  const [mainTab, setMainTab] = useState<'RETURN' | 'WARRANTY'>('RETURN');

  // Existing Return States
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [returnType, setReturnType] = useState<'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'>('RETURN_CUSTOMER');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactName, setContactName] = useState('');
  const [searchTermContact, setSearchTermContact] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [cart, setCart] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [searchTermProduct, setSearchTermProduct] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [addToStock, setAddToStock] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SalePurchaseRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New Warranty States
  const [warrantyTab, setWarrantyTab] = useState<'LIST' | 'ENTRY'>('LIST');
  const [warrantySearch, setWarrantySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WarrantyStatus>('ALL');
  
  // Warranty Form Entry States
  const [wCustomerName, setWCustomerName] = useState('');
  const [wCustomerPhone, setWCustomerPhone] = useState('');
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [wSelectedProductId, setWSelectedProductId] = useState('');
  const [wManualProductName, setWManualProductName] = useState('');
  const [wProductImage, setWProductImage] = useState<string>(''); // base64
  const [wSerialNumber, setWSerialNumber] = useState('');
  const [wIssueDescription, setWIssueDescription] = useState('');
  const [wSelectedSupplierId, setWSelectedSupplierId] = useState('');
  const [wNotes, setWNotes] = useState('');
  
  // Custom suggestion search
  const [wContactSearchTerm, setWContactSearchTerm] = useState('');
  const [showWContactDropdown, setShowWContactDropdown] = useState(false);
  const [showWProductSelector, setShowWProductSelector] = useState(false);
  
  // Status transition popups
  const [assigningSupplierWarranty, setAssigningSupplierWarranty] = useState<WarrantyItem | null>(null);
  const [selectedWarrantyDetail, setSelectedWarrantyDetail] = useState<WarrantyItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wContactDropdownRef = useRef<HTMLDivElement>(null);

  const returnRecords = useMemo(() => {
    return records.filter(r => r.type === 'RETURN_CUSTOMER' || r.type === 'RETURN_SUPPLIER')
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [records]);

  // Click outside handling for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
      if (wContactDropdownRef.current && !wContactDropdownRef.current.contains(event.target as Node)) {
        setShowWContactDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredContacts = useMemo(() => {
    const type = returnType === 'RETURN_CUSTOMER' ? ContactType.CUSTOMER : ContactType.SUPPLIER;
    return contacts.filter(c => 
      c.type === type && 
      (c.name.toLowerCase().includes(searchTermContact.toLowerCase()) || c.phone.includes(searchTermContact))
    );
  }, [contacts, searchTermContact, returnType]);

  // Contacts filtered for warranty customer suggestions
  const warrantyFilteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.type === ContactType.CUSTOMER && 
      (c.name.toLowerCase().includes(wContactSearchTerm.toLowerCase()) || c.phone.includes(wContactSearchTerm))
    );
  }, [contacts, wContactSearchTerm]);

  // Supplier list for warranty dropdowns
  const supplierContacts = useMemo(() => {
    return contacts.filter(c => c.type === ContactType.SUPPLIER);
  }, [contacts]);

  const filteredProducts = useMemo(() => {
    const searchLower = searchTermProduct.toLowerCase();
    
    // Base filter by search term (name or serial number)
    let baseFiltered = stockItems.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      (p.serialNumber && p.serialNumber.toLowerCase().includes(searchLower)) ||
      (p.serialNumbers && p.serialNumbers.some(sn => sn.toLowerCase().includes(searchLower)))
    );

    // If a contact is selected, filter by their history
    if (contactName) {
      const contactRecords = records.filter(r => 
        (returnType === 'RETURN_CUSTOMER' && r.type === 'SALE' && r.customerName === contactName) ||
        (returnType === 'RETURN_SUPPLIER' && r.type === 'PURCHASE' && r.customerName === contactName)
      );

      const productIdsInHistory = new Set<string>();
      contactRecords.forEach(r => {
        r.items?.forEach(item => productIdsInHistory.add(item.productId));
      });

      // Strictly filter by history if a contact is selected
      baseFiltered = baseFiltered.filter(p => productIdsInHistory.has(p.id));
    }

    return baseFiltered;
  }, [stockItems, searchTermProduct, contactName, returnType, records]);

  // Filtering for Warranties List
  const filteredWarranties = useMemo(() => {
    return warranties.filter(item => {
      const matchSearch = item.customerName.toLowerCase().includes(warrantySearch.toLowerCase()) ||
                          item.customerPhone.includes(warrantySearch) ||
                          item.productName.toLowerCase().includes(warrantySearch.toLowerCase()) ||
                          (item.serialNumber && item.serialNumber.toLowerCase().includes(warrantySearch.toLowerCase()));
      
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
      
      return matchSearch && matchStatus;
    }).sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [warranties, warrantySearch, statusFilter]);

  // Existing Return handlers
  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setContactName(contact.name);
    setShowContactDropdown(false);
    setSearchTermContact('');
  };

  const addToCart = (product: StockItem) => {
    const existing = cart.find(item => item.productId === product.id);
    const price = returnType === 'RETURN_CUSTOMER' ? product.sellingPrice : product.buyingPrice;
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, price }]);
    }
    setShowProductSelector(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => setCart(cart.filter(item => item.productId !== productId));
  const totalAmount = cart.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  const handleConfirm = () => {
    if (!contactName.trim()) return alert('কন্টাক্ট সিলেক্ট করুন!');
    if (cart.length === 0) return alert('পণ্য যোগ করুন!');
    
    onConfirmReturn({
      type: returnType,
      contactId: selectedContactId,
      contactName,
      items: cart.map(item => ({ ...item, name: stockItems.find(p => p.id === item.productId)?.name || 'অজানা' })),
      total: totalAmount,
      addToStock,
      originalId: editingRecordId || undefined
    });
    
    setEditingRecordId(null);
    onBack();
  };

  const handleEdit = (record: SalePurchaseRecord) => {
    setReturnType(record.type as 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER');
    const contact = contacts.find(c => c.transactions.some(t => t.recordId === record.id));
    setSelectedContactId(contact?.id || '');
    setContactName(record.customerName || contact?.name || '');
    setCart(record.items?.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })) || []);
    setEditingRecordId(record.id);
    setActiveTab('NEW');
    setSelectedRecord(null);
  };

  // Warranty image picker capturing
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressImage(base64, 600, 600, 0.6);
      setProductImageState(compressed);
    };
    reader.readAsDataURL(file);
  };

  // State wrapper to solve image upload
  const setProductImageState = (imgBase64: string) => {
    setWProductImage(imgBase64);
  };

  // Warranty Creation Submit
  const handleCreateWarranty = () => {
    if (!wCustomerName.trim()) return alert('গ্রাহকের নাম দিন বা বাছাই করুন!');
    if (!wCustomerPhone.trim()) return alert('গ্রাহকের ফন নম্বর দিন!');
    
    // Check product selection
    if (isManualProduct) {
      if (!wManualProductName.trim()) return alert('ম্যানুয়াল পণ্যের নাম দিন!');
    } else {
      if (!wSelectedProductId) return alert('পণ্যের তালিকা থেকে পণ্য সিলেক্ট করুন!');
    }

    if (!wIssueDescription.trim()) return alert('সমস্যা বা নষ্ট হওয়ার বিবরণ দিন!');

    const selectedProduct = stockItems.find(p => p.id === wSelectedProductId);
    const assignedSupplier = supplierContacts.find(c => c.id === wSelectedSupplierId);

    const nowStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

    const newWarranty: WarrantyItem = {
      id: String(Date.now()),
      customerName: wCustomerName,
      customerPhone: wCustomerPhone,
      productId: isManualProduct ? undefined : wSelectedProductId,
      productName: isManualProduct ? wManualProductName : (selectedProduct?.name || 'অজানা পণ্য'),
      productImage: isManualProduct ? wProductImage : undefined,
      serialNumber: wSerialNumber || undefined,
      issueDescription: wIssueDescription,
      supplierId: wSelectedSupplierId || undefined,
      supplierName: assignedSupplier?.name || undefined,
      status: WarrantyStatus.RECEIVED_FROM_CUSTOMER,
      receivedDate: nowStr
    };

    onUpdateWarranties([...warranties, newWarranty]);

    // Reset Form
    setWCustomerName('');
    setWCustomerPhone('');
    setIsManualProduct(false);
    setWSelectedProductId('');
    setWManualProductName('');
    setWProductImage('');
    setWSerialNumber('');
    setWIssueDescription('');
    setWSelectedSupplierId('');
    setWNotes('');
    setWContactSearchTerm('');

    // Switch to status list
    setWarrantyTab('LIST');
  };

  // Updates status contextually
  const handleUpdateWarrantyStatus = (warrantyId: string, newStatus: WarrantyStatus, extraData?: Partial<WarrantyItem>) => {
    const nowStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

    const updated = warranties.map(item => {
      if (item.id === warrantyId) {
        const updateObj: Partial<WarrantyItem> = { status: newStatus, ...extraData };
        if (newStatus === WarrantyStatus.SENT_TO_SUPPLIER) {
          updateObj.sentToSupplierDate = nowStr;
        } else if (newStatus === WarrantyStatus.RECEIVED_FROM_SUPPLIER) {
          updateObj.receivedFromSupplierDate = nowStr;
        } else if (newStatus === WarrantyStatus.DELIVERED_TO_CUSTOMER) {
          updateObj.deliveredToCustomerDate = nowStr;
        }
        return { ...item, ...updateObj };
      }
      return item;
    });

    onUpdateWarranties(updated);
  };

  const handleDeleteWarrantyItem = (id: string) => {
    if (confirm('আপনি কি এই ওয়ারেন্টি এন্ট্রিটি সম্পূর্ণ ডিলিট করতে চান?')) {
      onUpdateWarranties(warranties.filter(item => item.id !== id));
      setSelectedWarrantyDetail(null);
    }
  };

  const handleSelectWContact = (contact: Contact) => {
    setWCustomerName(contact.name);
    setWCustomerPhone(contact.phone);
    setShowWContactDropdown(false);
    setWContactSearchTerm('');
  };

  const handleSelectWStockProduct = (product: StockItem) => {
    setWSelectedProductId(product.id);
    if (product.serialNumber) {
      setWSerialNumber(product.serialNumber);
    }
    setShowWProductSelector(false);
  };

  // Status visual mappings
  const getStatusBadge = (status: WarrantyStatus) => {
    switch (status) {
      case WarrantyStatus.RECEIVED_FROM_CUSTOMER:
        return {
          text: 'কাস্টমার থেকে গৃহীত',
          className: 'bg-amber-50 text-amber-700 border border-amber-200'
        };
      case WarrantyStatus.SENT_TO_SUPPLIER:
        return {
          text: 'সাপ্লায়ারের কাছে প্রেরিত',
          className: 'bg-blue-50 text-blue-700 border border-blue-200'
        };
      case WarrantyStatus.RECEIVED_FROM_SUPPLIER:
        return {
          text: 'সাপ্লায়ার থেকে রিসিভড',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        };
      case WarrantyStatus.DELIVERED_TO_CUSTOMER:
        return {
          text: 'কাস্টমারকে ডেলিভার্ড',
          className: 'bg-gray-100 text-gray-700 border border-gray-300'
        };
    }
  };

  const inputClasses = "w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-orange-600 focus:ring-4 focus:ring-orange-50 transition-all shadow-sm placeholder:text-gray-400";

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col pb-24 duration-300">
      {/* Title Header */}
      <header className="flex items-center gap-4 p-4 bg-orange-600 text-white sticky top-0 z-30 shadow-md">
        <button onClick={onBack} className="p-1 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
        <h2 className="text-lg font-black">প্রোডাক্ট রিটার্ন ও ওয়ারেন্টি</h2>
      </header>

      {/* Main Mode Toggle: Return (রিটার্ন) & Warranty (ওয়ারেন্টি) */}
      <div className="flex bg-orange-850 text-white font-bold text-xs select-none shadow sticky top-[60px] z-20">
        <button 
          onClick={() => setMainTab('RETURN')} 
          className={`flex-1 py-3 text-center border-b-[3px] transition-all flex items-center justify-center gap-1.5 ${mainTab === 'RETURN' ? 'border-white bg-orange-700 font-black' : 'border-transparent bg-orange-800 opacity-80'}`}
        >
          🔄 রিটার্ন ম্যানেজমেন্ট
        </button>
        <button 
          onClick={() => setMainTab('WARRANTY')} 
          className={`flex-1 py-3 text-center border-b-[3px] transition-all flex items-center justify-center gap-1.5 ${mainTab === 'WARRANTY' ? 'border-white bg-orange-700 font-black' : 'border-transparent bg-orange-800 opacity-80'}`}
        >
          🛡️ ওয়ারেন্টি ও সার্ভিসিং
        </button>
      </div>

      {mainTab === 'RETURN' ? (
        // ******************* Return Workspace View *******************
        <>
          <div className="flex bg-white border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('NEW')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'NEW' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
            >
              নতুন রিটার্ন
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'HISTORY' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
            >
              রিটার্ন হিস্ট্রি
            </button>
          </div>

          <div className="p-4 space-y-4">
            {activeTab === 'NEW' ? (
              <>
                {/* Return Type Selector */}
                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <button 
                    onClick={() => { setReturnType('RETURN_CUSTOMER'); setSelectedContactId(''); setContactName(''); setCart([]); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${returnType === 'RETURN_CUSTOMER' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400'}`}
                  >
                    <User size={16} /> কাস্টমার রিটার্ন
                  </button>
                  <button 
                    onClick={() => { setReturnType('RETURN_SUPPLIER'); setSelectedContactId(''); setContactName(''); setCart([]); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${returnType === 'RETURN_SUPPLIER' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400'}`}
                  >
                    <Truck size={16} /> সাপ্লায়ার রিটার্ন
                  </button>
                </div>

                {/* Contact Selector */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3 relative" ref={dropdownRef}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                    {returnType === 'RETURN_CUSTOMER' ? 'কাস্টমার সিলেক্ট করুন' : 'সাপ্লায়ার সিলেক্ট করুন'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder={returnType === 'RETURN_CUSTOMER' ? "কাস্টমার নাম খুঁজুন..." : "সাপ্লায়ার নাম খুঁজুন..."}
                      value={contactName || searchTermContact}
                      onChange={(e) => {
                        setContactName('');
                        setSearchTermContact(e.target.value);
                        setShowContactDropdown(true);
                      }}
                      onClick={() => setShowContactDropdown(true)}
                      className={`${inputClasses} pl-9 py-3 text-sm`}
                    />
                    {showContactDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[50] max-h-56 overflow-y-auto">
                        {filteredContacts.map(c => (
                          <button key={c.id} onClick={() => handleSelectContact(c)} className="w-full text-left p-3.5 hover:bg-orange-50 flex items-center gap-3 border-b border-gray-50 last:border-0">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-400">{c.name[0]}</div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs">{c.name}</div>
                              <div className="text-[9px] text-gray-400 font-bold">{c.phone}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product List */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[150px]">
                  <div className="flex justify-between items-center mb-4 px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পণ্যের তালিকা</label>
                    <button onClick={() => setShowProductSelector(true)} className="bg-orange-600 text-white p-2 px-4 rounded-full text-[10px] font-black flex items-center gap-1">
                      <Plus size={14} /> পণ্য যোগ
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                        <div className="flex-1 pr-2">
                          <h4 className="font-bold text-gray-900 text-xs truncate">{stockItems.find(p => p.id === item.productId)?.name}</h4>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">৳{item.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 p-0.5">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-red-500"><Minus size={12} /></button>
                            <span className="w-5 text-center font-black text-[11px]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-green-500"><Plus size={12} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.productId)} className="text-gray-300 ml-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-300">
                        <ShoppingCart size={32} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">কোনো পণ্য যোগ করা হয়নি</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">মোট রিটার্ন মূল্য</span>
                    <span className="text-2xl font-black text-orange-600">৳{totalAmount.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Stock Update Toggle */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">স্টক আপডেট করুন?</h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">রিটার্ন করা পণ্য কি স্টকে যোগ হবে?</p>
                  </div>
                  <button 
                    onClick={() => setAddToStock(!addToStock)}
                    className={`w-12 h-6 rounded-full transition-all relative ${addToStock ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${addToStock ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button 
                  onClick={handleConfirm}
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> {editingRecordId ? 'রিটার্ন আপডেট করুন' : 'রিটার্ন নিশ্চিত করুন'}
                </button>

                {editingRecordId && (
                  <button 
                    onClick={() => {
                      setEditingRecordId(null);
                      setContactName('');
                      setSelectedContactId('');
                      setCart([]);
                    }}
                    className="w-full bg-gray-200 text-gray-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all mt-2"
                  >
                    এডিট বাতিল করুন
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {returnRecords.length > 0 ? returnRecords.map(record => (
                  <button 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className="w-full bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between text-left active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.type === 'RETURN_CUSTOMER' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        <RotateCcw size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{record.customerName || 'সাপ্লায়ার'}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{record.date}</div>
                        <div className="text-[10px] text-gray-500 font-medium mt-0.5 truncate max-w-[180px]">{record.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-orange-600">৳{record.amount.toLocaleString('bn-BD')}</div>
                      <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{record.type === 'RETURN_CUSTOMER' ? 'কাস্টমার' : 'সাপ্লায়ার'}</div>
                    </div>
                  </button>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <RotateCcw size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">কোনো রিটার্ন হিস্ট্রি নেই</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        // ******************* Warranty Workspace View *******************
        <>
          <div className="flex bg-white border-b border-gray-100 sticky top-[100px] z-10 shadow-xs">
            <button 
              onClick={() => setWarrantyTab('LIST')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 ${warrantyTab === 'LIST' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
            >
              <ShieldCheck size={16} /> ওয়ারেন্টি তালিকা
            </button>
            <button 
              onClick={() => setWarrantyTab('ENTRY')}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-1.5 ${warrantyTab === 'ENTRY' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
            >
              <Plus size={16} /> নতুন ওয়ারেন্টি এন্ট্রি
            </button>
          </div>

          <div className="p-4 space-y-4">
            {warrantyTab === 'ENTRY' ? (
              // ********* CREATE NEW WARRANTY FROM CUSTOMER *********
              <div className="space-y-4">
                {/* Customer Section */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4" ref={wContactDropdownRef}>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <User className="text-orange-600" size={18} />
                    <h3 className="font-black text-sm text-gray-800">১. কাস্টমার তথ্য</h3>
                  </div>

                  {/* Searchable input list */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">কাস্টমার খুঁজুন (ঐচ্ছিক পরামর্শ)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="কাস্টমার তালিকা থেকে খুঁজুন..."
                        value={wContactSearchTerm}
                        onChange={(e) => {
                          setWContactSearchTerm(e.target.value);
                          setShowWContactDropdown(true);
                        }}
                        onClick={() => setShowWContactDropdown(true)}
                        className={`${inputClasses} pl-9 py-2.5 text-xs`}
                      />
                      {showWContactDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-150 rounded-xl shadow-2xl z-[60] max-h-48 overflow-y-auto">
                          {warrantyFilteredContacts.map(c => (
                            <button key={c.id} onClick={() => handleSelectWContact(c)} className="w-full text-left p-2.5 hover:bg-orange-50 flex items-center gap-2.5 border-b border-gray-50 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[9px]">{c.name[0]}</div>
                              <div>
                                <div className="font-bold text-gray-800 text-xs">{c.name}</div>
                                <div className="text-[8px] text-gray-400 font-bold">{c.phone}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">গ্রাহকের নাম *</label>
                      <input 
                        type="text" 
                        placeholder="কাস্টমার নাম"
                        value={wCustomerName}
                        onChange={(e) => setWCustomerName(e.target.value)}
                        className={`${inputClasses} py-2 px-3 text-xs`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">ফোন নম্বর *</label>
                      <input 
                        type="text" 
                        placeholder="01xxxxxxxxx"
                        value={wCustomerPhone}
                        onChange={(e) => setWCustomerPhone(e.target.value)}
                        className={`${inputClasses} py-2 px-3 text-xs`}
                      />
                    </div>
                  </div>
                </div>

                {/* Product Section */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Package className="text-orange-600" size={18} />
                      <h3 className="font-black text-sm text-gray-800">২. পণ্যের বিবরণ</h3>
                    </div>
                    
                    {/* Toggle Selector */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-100 text-[10px] font-black">
                      <button 
                        onClick={() => setIsManualProduct(false)}
                        className={`px-2.5 py-1 rounded-md transition-all ${!isManualProduct ? 'bg-orange-600 text-white shadow-xs' : 'text-gray-500'}`}
                      >
                        স্টক থেকে
                      </button>
                      <button 
                        onClick={() => setIsManualProduct(true)}
                        className={`px-2.5 py-1 rounded-md transition-all ${isManualProduct ? 'bg-orange-600 text-white shadow-xs' : 'text-gray-500'}`}
                      >
                        ম্যানুয়াল এন্ট্রি
                      </button>
                    </div>
                  </div>

                  {!isManualProduct ? (
                    // Stock option
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">স্টকের পণ্য সিলেক্ট করুন *</label>
                      <button 
                        onClick={() => setShowWProductSelector(true)}
                        className="w-full text-left p-3.5 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-700"
                      >
                        {wSelectedProductId ? (
                          <span className="text-orange-600 font-extrabold flex items-center gap-2">
                            <CheckCircle2 size={16} /> 
                            {stockItems.find(p => p.id === wSelectedProductId)?.name}
                          </span>
                        ) : 'ক্লিক করে স্টকের পণ্য সিলেক্ট করুন...'}
                        <Plus size={16} className="text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    // Manual form with picture taking!
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">পণ্যের নাম লিখুন *</label>
                        <input 
                          type="text" 
                          placeholder="উদাঃ Samsung Galaxy M31"
                          value={wManualProductName}
                          onChange={(e) => setWManualProductName(e.target.value)}
                          className={`${inputClasses} py-2.5 px-3 text-xs`}
                        />
                      </div>

                      {/* Manual Photo attachments list */}
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">ম্যানুয়ালি পিকচার তুলুন বা নিন (ঐচ্ছিক)</label>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-4 bg-orange-50 hover:bg-orange-100 border border-dashed border-orange-300 rounded-2xl text-orange-600 text-[10px] font-black flex flex-col items-center justify-center gap-1.5 transition-all w-24 h-24"
                          >
                            <Camera size={24} />
                            পিকচার তুলুন
                          </button>
                          
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*" 
                            capture="environment" 
                            onChange={handleImageCapture}
                            className="hidden"
                          />

                          {wProductImage ? (
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
                              <img 
                                src={wProductImage} 
                                alt="Manual item" 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover" 
                              />
                              <button 
                                onClick={() => setWProductImage('')}
                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full transition-transform active:scale-90"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300 text-[9px] font-bold">
                              <span>কোনো ছবি নেই</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">সিরিয়াল/IMEI নম্বর (যদি থাকে)</label>
                      <input 
                        type="text" 
                        placeholder="যেমনঃ SN-293810293"
                        value={wSerialNumber}
                        onChange={(e) => setWSerialNumber(e.target.value)}
                        className={`${inputClasses} py-2.5 px-3 text-xs`}
                      />
                    </div>
                  </div>
                </div>

                {/* Problem Description & Suppliers */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Wrench className="text-orange-600" size={18} />
                    <h3 className="font-black text-sm text-gray-800">৩. সমস্যা ও সাপ্লায়ার</h3>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">পণ্যের সমস্যা বা ত্রুটির বিবরণ *</label>
                    <textarea 
                      placeholder="যেমনঃ ডিসপ্লে ফাটা, চার্জিং পোর্ট ও অন হয় না..."
                      value={wIssueDescription}
                      onChange={(e) => setWIssueDescription(e.target.value)}
                      rows={2}
                      className="w-full p-3.5 bg-white border border-gray-200 rounded-2xl outline-none text-gray-950 font-semibold focus:border-orange-600 focus:ring-4 focus:ring-orange-50 text-xs shadow-sm placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">সাপ্লায়ার সিলেক্ট করুন (পরবর্তীতেও পাঠানো যাবে)</label>
                    <select 
                      value={wSelectedSupplierId}
                      onChange={(e) => setWSelectedSupplierId(e.target.value)}
                      className="w-full p-3 bg-white border border-gray-200 rounded-2xl outline-none text-gray-900 font-bold text-xs focus:border-orange-600 shadow-sm"
                    >
                      <option value="">নির্বাচন করুন (সাপ্লায়ার ঐচ্ছিক)</option>
                      {supplierContacts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleCreateWarranty}
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} /> ওয়ারেন্টি এন্ট্রি নিশ্চিত করুন
                </button>
              </div>
            ) : (
              // ********* LIST AND TRACK RUNNING WARRANTIES *********
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Search and status filters */}
                <div className="space-y-3 bg-white p-4 rounded-3xl border border-gray-150/70 shadow-xs">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="কাস্টমার, পণ্য বা সিরিয়াল খুজুন..." 
                      value={warrantySearch} 
                      onChange={(e) => setWarrantySearch(e.target.value)} 
                      className={`${inputClasses} pl-9 py-2.5 text-xs`} 
                    />
                  </div>

                  {/* Status pills strip */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] uppercase font-bold text-nowrap select-none">
                    <button 
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-full transition-all border ${statusFilter === 'ALL' ? 'bg-orange-600 text-white border-orange-600 font-extrabold' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                    >
                      সব ({warranties.length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter(WarrantyStatus.RECEIVED_FROM_CUSTOMER)}
                      className={`px-3 py-1.5 rounded-full transition-all border ${statusFilter === WarrantyStatus.RECEIVED_FROM_CUSTOMER ? 'bg-orange-600 text-white border-orange-600 font-extrabold' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                    >
                      কাস্টমার থেকে প্রাপ্ত ({warranties.filter(w => w.status === WarrantyStatus.RECEIVED_FROM_CUSTOMER).length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter(WarrantyStatus.SENT_TO_SUPPLIER)}
                      className={`px-3 py-1.5 rounded-full transition-all border ${statusFilter === WarrantyStatus.SENT_TO_SUPPLIER ? 'bg-orange-600 text-white border-orange-600 font-extrabold' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                    >
                      সাপ্লায়ারে প্রেরিত ({warranties.filter(w => w.status === WarrantyStatus.SENT_TO_SUPPLIER).length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter(WarrantyStatus.RECEIVED_FROM_SUPPLIER)}
                      className={`px-3 py-1.5 rounded-full transition-all border ${statusFilter === WarrantyStatus.RECEIVED_FROM_SUPPLIER ? 'bg-orange-600 text-white border-orange-600 font-extrabold' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                    >
                      সাপ্লায়ার থেকে রিসিভড ({warranties.filter(w => w.status === WarrantyStatus.RECEIVED_FROM_SUPPLIER).length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter(WarrantyStatus.DELIVERED_TO_CUSTOMER)}
                      className={`px-3 py-1.5 rounded-full transition-all border ${statusFilter === WarrantyStatus.DELIVERED_TO_CUSTOMER ? 'bg-orange-600 text-white border-orange-600 font-extrabold' : 'bg-gray-100 text-gray-600 border-gray-250'}`}
                    >
                      ডেলিভার্ড ({warranties.filter(w => w.status === WarrantyStatus.DELIVERED_TO_CUSTOMER).length})
                    </button>
                  </div>
                </div>

                {/* Warranty Cards */}
                <div className="space-y-3.5">
                  {filteredWarranties.length > 0 ? (
                    filteredWarranties.map(item => {
                      const badge = getStatusBadge(item.status);
                      return (
                        <div 
                          key={item.id}
                          className="w-full bg-white p-4.5 rounded-[2rem] border border-gray-150/70 shadow-xs hover:shadow-md transition-all space-y-3.5"
                        >
                          {/* Info Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-gray-50 pb-3">
                            <div className="flex items-center gap-3">
                              {/* Picture or Fallback icon */}
                              {item.productImage ? (
                                <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden shadow-xs shrink-0">
                                  <img 
                                    src={item.productImage} 
                                    alt={item.productName} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
                                  <Wrench size={22} />
                                </div>
                              )}
                              
                              <div className="min-w-0">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${item.productId ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                  {item.productId ? 'স্টক প্রোডাক্ট' : 'ম্যানুয়াল এন্ট্রি'}
                                </span>
                                <h3 className="font-extrabold text-gray-900 text-sm mt-1 leading-tight truncate">{item.productName}</h3>
                                {item.serialNumber && (
                                  <p className="text-[10px] text-gray-500 font-bold mt-0.5 truncate bg-gray-55 px-1 rounded-sm inline-block">SN: {item.serialNumber}</p>
                                )}
                              </div>
                            </div>

                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${badge.className}`}>
                              {badge.text}
                            </span>
                          </div>

                          {/* Customer and problem overview */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">গ্রাহক</p>
                              <div className="font-bold text-gray-800 leading-tight">
                                <div className="truncate text-xs">{item.customerName}</div>
                                <a href={`tel:${item.customerPhone}`} className="text-[10px] text-blue-600 flex items-center gap-0.5 font-bold mt-0.5 hover:underline decoration-blue-400">
                                  <Phone size={10} /> {item.customerPhone}
                                </a>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">পণ্যের সমস্যা</p>
                              <div className="font-bold text-red-650 text-[11px] leading-tight truncate-two-lines italic">
                                "{item.issueDescription}"
                              </div>
                            </div>
                          </div>

                          {/* Supplier tracking line */}
                          <div className="bg-gray-50 p-2.5 rounded-xl text-[10px] text-gray-500 font-bold">
                            <div className="flex justify-between">
                              <span>সাপ্লায়ারঃ <span className="text-gray-900 font-extrabold">{item.supplierName || 'নির্ধারিত হয়নি'}</span></span>
                              <span className="text-gray-400">{item.receivedDate.split(' ')[0]}</span>
                            </div>
                          </div>

                          {/* Action flows */}
                          <div className="flex items-center justify-between gap-2.5 pt-1.5">
                            {/* Left context helper dates or click details */}
                            <button 
                              onClick={() => setSelectedWarrantyDetail(item)}
                              className="text-[10px] font-black text-orange-600 underline underline-offset-2 hover:text-orange-850 px-1 py-1"
                            >
                              ইতিহাস ও ডিটেইলস ➔
                            </button>

                            {/* Prominent status update buttons */}
                            <div className="flex gap-1.5 shrink-0">
                              {item.status === WarrantyStatus.RECEIVED_FROM_CUSTOMER && (
                                <>
                                  <button 
                                    onClick={() => {
                                      // If already has supplier, easily transition, else open modal to choose supplier
                                      if (item.supplierId) {
                                        handleUpdateWarrantyStatus(item.id, WarrantyStatus.SENT_TO_SUPPLIER);
                                      } else {
                                        setAssigningSupplierWarranty(item);
                                      }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] tracking-tight px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                                  >
                                    <Truck size={12} /> সাপ্লায়ারে পাঠান
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateWarrantyStatus(item.id, WarrantyStatus.DELIVERED_TO_CUSTOMER)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-tight px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                                  >
                                    <Check size={12} /> কাস্টমারকে বুঝিয়ে দিন
                                  </button>
                                </>
                              )}

                              {item.status === WarrantyStatus.SENT_TO_SUPPLIER && (
                                <button 
                                  onClick={() => handleUpdateWarrantyStatus(item.id, WarrantyStatus.RECEIVED_FROM_SUPPLIER)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] tracking-tight px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                                >
                                  <Check size={12} /> রিসিভড (সাপ্লায়ার হতে)
                                </button>
                              )}

                              {item.status === WarrantyStatus.RECEIVED_FROM_SUPPLIER && (
                                <button 
                                  onClick={() => handleUpdateWarrantyStatus(item.id, WarrantyStatus.DELIVERED_TO_CUSTOMER)}
                                  className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] tracking-tight px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                                >
                                  <Check size={12} /> কাস্টমারকে বুঝিয়ে দিন
                                </button>
                              )}

                              {item.status === WarrantyStatus.DELIVERED_TO_CUSTOMER && (
                                <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 py-1 bg-gray-50 px-2 rounded-md">
                                  <Check className="text-green-500" size={14} /> সমাধান ও ডেলিভার্ড
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                      <ShieldCheck size={52} className="mb-4 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">কোনো ওয়ারেন্টি পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* **************** Existing Return detail Modal popup **************** */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900">রিটার্ন ডিটেইলস</h3>
              <button onClick={() => setSelectedRecord(null)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">কন্টাক্ট</p>
                    <h4 className="font-black text-gray-900">{selectedRecord.customerName || 'সাপ্লায়ার'}</h4>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${selectedRecord.type === 'RETURN_CUSTOMER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {selectedRecord.type === 'RETURN_CUSTOMER' ? 'কাস্টমার রিটার্ন' : 'সাপ্লায়ার রিটার্ন'}
                  </div>
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">তারিখ: {selectedRecord.date}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">পণ্যের তালিকা</p>
                {selectedRecord.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl">
                    <div className="text-xs font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs font-black text-gray-400">৳{item.price} × {item.quantity}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <span className="text-xs font-black text-orange-800 uppercase tracking-widest">মোট মূল্য</span>
                <span className="text-xl font-black text-orange-600">৳{selectedRecord.amount.toLocaleString('bn-BD')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => handleEdit(selectedRecord)}
                className="flex-1 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-blue-100 active:scale-95 transition-all"
              >
                এডিট করুন
              </button>
              <button 
                onClick={() => {
                  if (confirm('আপনি কি এই রিটার্নটি ডিলিট করতে চান? এটি স্টক এবং ব্যালেন্স পুনরায় সমন্বয় করবে।')) {
                    onDeleteReturn(selectedRecord.id);
                    setSelectedRecord(null);
                  }
                }}
                className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
              >
                ডিলিট করুন
              </button>
            </div>
            <button 
              onClick={() => setSelectedRecord(null)}
              className="w-full mt-3 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* **************** Existing Return Product Search modal **************** */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-250">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">পণ্য সিলেক্ট করুন</h3>
                <button onClick={() => setShowProductSelector(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
             </div>
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="পণ্যের নাম বা সিরিয়াল খুঁজুন..." value={searchTermProduct} onChange={(e) => setSearchTermProduct(e.target.value)} className={`${inputClasses} pl-9 py-3 text-sm`} autoFocus />
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-orange-50 text-left">
                      <div className="flex-1 pr-2">
                        <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <div className="text-[10px] text-gray-400 font-black bg-white px-1.5 py-0.5 rounded border border-gray-100">স্টক: {p.quantity} {p.unit}</div>
                          {p.serialNumber && (
                            <div className="text-[9px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">SN: {p.serialNumber}</div>
                          )}
                          {p.serialNumbers && p.serialNumbers.length > 0 && (
                            <div className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.serialNumbers.length} সিরিয়াল</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-black text-orange-600">৳{returnType === 'RETURN_CUSTOMER' ? p.sellingPrice : p.buyingPrice}</div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="text-gray-300" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-500">কোনো পণ্য পাওয়া যায়নি</p>
                    {contactName && (
                      <p className="text-[10px] text-gray-400 mt-1">এই {returnType === 'RETURN_CUSTOMER' ? 'কাস্টমারের কাছে কোনো পণ্য বিক্রি' : 'সাপ্লায়ারের কাছ থেকে কোনো পণ্য ক্রয়'} করা হয়নি।</p>
                    )}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* **************** Warranty Stock Product Search modal **************** */}
      {showWProductSelector && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-250">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">স্টকের পণ্য সিলেক্ট করুন</h3>
                <button onClick={() => setShowWProductSelector(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
             </div>
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="স্টকের পণ্য বা সিরিয়াল খুঁজুন..." 
                  value={searchTermProduct} 
                  onChange={(e) => setSearchTermProduct(e.target.value)} 
                  className={`${inputClasses} pl-9 py-3 text-sm`} 
                  autoFocus 
                />
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {stockItems.filter(p => p.name.toLowerCase().includes(searchTermProduct.toLowerCase()) || (p.serialNumber && p.serialNumber.toLowerCase().includes(searchTermProduct.toLowerCase()))).length > 0 ? (
                  stockItems.filter(p => p.name.toLowerCase().includes(searchTermProduct.toLowerCase()) || (p.serialNumber && p.serialNumber.toLowerCase().includes(searchTermProduct.toLowerCase()))).map(p => (
                    <button key={p.id} onClick={() => handleSelectWStockProduct(p)} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-orange-50 text-left">
                      <div className="flex-1 pr-2">
                        <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <div className="text-[10px] text-gray-400 font-black bg-white px-1.5 py-0.5 rounded border border-gray-100">স্টক: {p.quantity} {p.unit}</div>
                          {p.serialNumber && (
                            <div className="text-[9px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">SN: {p.serialNumber}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-black text-orange-600">৳{p.sellingPrice}</div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="text-gray-300" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-500 font-black">কোনো পণ্য পাওয়া যায়নি</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* **************** Assign Supplier transition popup **************** */}
      {assigningSupplierWarranty && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-gray-900 mb-2">সাপ্লায়ার সিলেক্ট করুন</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mb-4">কোন সাপ্লায়ারের কাছে পণ্যটি ওয়ারেন্টির জন্য পাঠাচ্ছেন?</p>
            
            <div className="space-y-4 mb-6">
              <select 
                value={wSelectedSupplierId}
                onChange={(e) => setWSelectedSupplierId(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none text-gray-900 font-bold text-xs focus:border-orange-600 shadow-sm"
              >
                <option value="">নির্বাচন করুন...</option>
                {supplierContacts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setAssigningSupplierWarranty(null)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-650 rounded-xl font-bold text-[11px] uppercase tracking-wider"
              >
                বাতিল
              </button>
              <button 
                onClick={() => {
                  const assignedSup = supplierContacts.find(c => c.id === wSelectedSupplierId);
                  if (!assignedSup) return alert('দয়া করে একজন সাপ্লায়ার সিলেক্ট করুন!');
                  
                  handleUpdateWarrantyStatus(assigningSupplierWarranty.id, WarrantyStatus.SENT_TO_SUPPLIER, {
                    supplierId: wSelectedSupplierId,
                    supplierName: assignedSup.name
                  });
                  setWSelectedSupplierId('');
                  setAssigningSupplierWarranty(null);
                }}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md"
              >
                প্রেরণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* **************** Detailed Warranty History timeline popup **************** */}
      {selectedWarrantyDetail && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="text-orange-600" size={20} /> ওয়ারেন্টি ট্র্যাক ইতিহাস
              </h3>
              <button onClick={() => setSelectedWarrantyDetail(null)} className="p-2 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>

            {/* Content summary */}
            <div className="space-y-4 mb-6">
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl space-y-1.5">
                <div className="font-extrabold text-orange-900 text-sm leading-tight">{selectedWarrantyDetail.productName}</div>
                {selectedWarrantyDetail.serialNumber && (
                  <div className="text-[10px] text-gray-500 font-black">সিরিয়াল: {selectedWarrantyDetail.serialNumber}</div>
                )}
                <div className="text-xs text-red-650 font-bold italic mt-1 bg-white inline-block px-2 py-1 rounded">"সমস্যা: {selectedWarrantyDetail.issueDescription}"</div>
              </div>

              {/* History timeline */}
              <div className="space-y-4 relative pl-3 border-l-2 border-dashed border-gray-200 ml-2">
                {/* 1. Customer Received */}
                <div className="relative space-y-0.5">
                  <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-amber-500 border border-white" />
                  <div className="text-[10px] font-black text-amber-700">কাস্টমার থেকে গ্রহণ করা হয়েছে</div>
                  <div className="text-[11px] font-extrabold text-gray-800">গ্রাহক: {selectedWarrantyDetail.customerName} ({selectedWarrantyDetail.customerPhone})</div>
                  <div className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {selectedWarrantyDetail.receivedDate}</div>
                </div>

                {/* 2. Sent to Supplier */}
                {selectedWarrantyDetail.sentToSupplierDate ? (
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-blue-500 border border-white" />
                    <div className="text-[10px] font-black text-blue-700">সাপ্লায়ারের নিকট মেরামত করতে পাঠানো হয়েছে</div>
                    <div className="text-[11px] font-extrabold text-gray-800">সাপ্লায়ার: {selectedWarrantyDetail.supplierName}</div>
                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {selectedWarrantyDetail.sentToSupplierDate}</div>
                  </div>
                ) : (
                  <div className="relative opacity-40">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-gray-200 border border-white" />
                    <div className="text-[10px] font-black text-gray-400">সাপ্লায়ারে পাঠানো হয়নি</div>
                  </div>
                )}

                {/* 3. Received from Supplier */}
                {selectedWarrantyDetail.receivedFromSupplierDate ? (
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-emerald-500 border border-white" />
                    <div className="text-[10px] font-black text-emerald-700">সাপ্লায়ার থেকে মেরামত সম্পন্ন হয়ে ফেরত এসেছে (রিসিভড)</div>
                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {selectedWarrantyDetail.receivedFromSupplierDate}</div>
                  </div>
                ) : (
                  <div className="relative opacity-45">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-gray-200 border border-white" />
                    <div className="text-[10px] font-black text-gray-400">সাপ্লায়ার থেকে এখনো রিসিভ করা হয়নি</div>
                  </div>
                )}

                {/* 4. Delivered back to customer */}
                {selectedWarrantyDetail.deliveredToCustomerDate ? (
                  <div className="relative space-y-0.5">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-gray-900 border border-white" />
                    <div className="text-[10px] font-black text-gray-900">কাস্টমারকে বুঝিয়ে দেওয়া হয়েছে ও কাজ সমাপ্ত</div>
                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {selectedWarrantyDetail.deliveredToCustomerDate}</div>
                  </div>
                ) : (
                  <div className="relative opacity-45">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-gray-200 border border-white" />
                    <div className="text-[10px] font-black text-gray-400">কাস্টমারকে ফেরত দেয়া বাকি আছে</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button 
                onClick={() => handleDeleteWarrantyItem(selectedWarrantyDetail.id)}
                className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-95 transition-all text-[11px] font-black tracking-normal uppercase shrink-0"
              >
                <Trash2 size={16} />
              </button>
              
              <button 
                onClick={() => setSelectedWarrantyDetail(null)}
                className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all text-center"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductReturnView;
