
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
  LayoutGrid
} from 'lucide-react';
import { Contact, StockItem, ContactType, SalePurchaseRecord, ShopSettings } from '../types';

interface ProductReturnViewProps {
  contacts: Contact[];
  stockItems: StockItem[];
  records: SalePurchaseRecord[];
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

const ProductReturnView: React.FC<ProductReturnViewProps> = ({ contacts, stockItems, records, onBack, onConfirmReturn, onDeleteReturn }) => {
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

  const returnRecords = useMemo(() => {
    return records.filter(r => r.type === 'RETURN_CUSTOMER' || r.type === 'RETURN_SUPPLIER')
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [records]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
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

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-[#D32F2F] focus:ring-4 focus:ring-red-50 transition-all shadow-sm placeholder:text-gray-400";

  return (
    <div className="bg-gray-50 min-h-full flex flex-col pb-24 animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4 p-4 bg-orange-600 text-white sticky top-0 z-30 shadow-md">
        <button onClick={onBack} className="p-1 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
        <h2 className="text-lg font-black">প্রোডাক্ট রিটার্ন</h2>
      </header>

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
                    <h4 className="font-black text-gray-900">{selectedRecord.customerName || 'সাপ্লায়ার'}</h4>
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

      {showProductSelector && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 h-[70vh] flex flex-col">
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
    </div>
  );
};

export default ProductReturnView;
