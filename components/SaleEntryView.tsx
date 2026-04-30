
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  User, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CheckCircle2, 
  X, 
  MapPin, 
  Phone,
  Contact as ContactIcon,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { Contact, StockItem, ContactType, SalePurchaseRecord, ShopSettings } from '../types';
import InvoiceView from './InvoiceView';
import DriveImage from './DriveImage';

interface SaleEntryViewProps {
  contacts: Contact[];
  stockItems: StockItem[];
  onBack: () => void;
  onConfirmSale: (data: { 
    contactId: string; 
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: { 
      productId: string; 
      name: string; 
      quantity: number; 
      price: number; 
      selectedSerials?: string[];
      discount?: number;
    }[]; 
    total: number; 
    paidAmount: number;
    dueAmount: number;
    isCash: boolean;
    discount?: number;
    discountType?: 'FIXED' | 'PERCENT';
  }) => SalePurchaseRecord | void;
  shopSettings: ShopSettings;
  googleAccessToken?: string | null;
}

const SaleEntryView: React.FC<SaleEntryViewProps> = ({ contacts, stockItems, onBack, onConfirmSale, shopSettings, googleAccessToken }) => {
  const [selectedContactId, setSelectedContactId] = useState<string>('CASH_CUSTOMER');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [cart, setCart] = useState<{ productId: string; quantity: number; price: number; selectedSerials?: string[]; discount?: number }[]>([]);
  const [totalDiscountInput, setTotalDiscountInput] = useState<string>('');
  const [totalDiscountType, setTotalDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isCash, setIsCash] = useState(true);
  const [searchTermContact, setSearchTermContact] = useState('');
  const [searchTermProduct, setSearchTermProduct] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectingSerialsFor, setSelectingSerialsFor] = useState<string | null>(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [latestRecord, setLatestRecord] = useState<SalePurchaseRecord | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    return contacts.filter(c => 
      c.type === ContactType.CUSTOMER && 
      (c.name.toLowerCase().includes(searchTermContact.toLowerCase()) || c.phone.includes(searchTermContact))
    );
  }, [contacts, searchTermContact]);

  const filteredProducts = useMemo(() => {
    return stockItems.filter(p => p.name.toLowerCase().includes(searchTermProduct.toLowerCase()));
  }, [stockItems, searchTermProduct]);

  const handleSelectExistingContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setCustomerName(contact.name);
    setCustomerPhone(contact.phone);
    if (contact.address) setCustomerAddress(contact.address);
    setShowContactDropdown(false);
    setSearchTermContact('');
  };

  const handlePhonebookPicker = async () => {
    try {
      const nav = navigator as any;
      if (nav.contacts && typeof nav.contacts.select === 'function') {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contactsResult = await nav.contacts.select(props, opts);
        if (contactsResult && contactsResult.length > 0) {
          const selected = contactsResult[0];
          if (selected.name && selected.name.length > 0) setCustomerName(selected.name[0]);
          if (selected.tel && selected.tel.length > 0) setCustomerPhone(selected.tel[0].replace(/[^\d+]/g, ''));
        }
      }
    } catch (err) {}
  };

  const addToCart = (product: StockItem) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, price: product.sellingPrice, selectedSerials: [], discount: 0 }]);
    }
    
    if ((product.serialNumber || (product.serialNumbers && product.serialNumbers.length > 0))) {
      setSelectingSerialsFor(product.id);
    }
    
    setShowProductSelector(false);
  };

  const toggleSerialSelection = (productId: string, serial: string) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const currentSerials = item.selectedSerials || [];
        if (currentSerials.includes(serial)) {
          return { ...item, selectedSerials: currentSerials.filter(s => s !== serial) };
        } else {
          // If quantity is 1, replace. If more, allow up to quantity.
          if (item.quantity === 1) {
            return { ...item, selectedSerials: [serial] };
          } else if (currentSerials.length < item.quantity) {
            return { ...item, selectedSerials: [...currentSerials, serial] };
          } else {
            alert(`আপনি সর্বোচ্চ ${item.quantity}টি সিরিয়াল সিলেক্ট করতে পারবেন!`);
            return item;
          }
        }
      }
      return item;
    }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        const stock = stockItems.find(p => p.id === productId)?.quantity || 0;
        if (newQty > stock) { alert(`স্টক শেষ! (সর্বোচ্চ: ${stock})`); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => setCart(cart.filter(item => item.productId !== productId));
  
  const updateItemDiscount = (productId: string, discount: number) => {
    setCart(cart.map(item => item.productId === productId ? { ...item, discount } : item));
  };

  const subTotal = cart.reduce((acc, item) => acc + (item.quantity * item.price) - (item.discount || 0), 0);
  
  const totalDiscountValue = useMemo(() => {
    const val = parseFloat(totalDiscountInput) || 0;
    if (totalDiscountType === 'PERCENT') {
      return (subTotal * val) / 100;
    }
    return val;
  }, [totalDiscountInput, totalDiscountType, subTotal]);

  const totalAmount = Math.max(0, subTotal - totalDiscountValue);
  
  const currentPaidAmount = paidAmountInput === '' ? (isCash ? totalAmount : 0) : parseFloat(paidAmountInput);
  const dueAmount = totalAmount - currentPaidAmount;

  const handleConfirm = () => {
    if (!customerName.trim() || !customerPhone.trim()) return alert('নাম ও ফোন নম্বর দিন!');
    if (cart.length === 0) return alert('পণ্য যোগ করুন!');
    
    const record = onConfirmSale({
      contactId: selectedContactId,
      customerName,
      customerPhone,
      customerAddress,
      items: cart.map(item => ({ 
        ...item, 
        name: stockItems.find(p => p.id === item.productId)?.name || 'অজানা',
        discount: item.discount || 0
      })),
      total: totalAmount,
      paidAmount: currentPaidAmount,
      dueAmount: dueAmount,
      isCash,
      discount: parseFloat(totalDiscountInput) || 0,
      discountType: totalDiscountType
    });

    if (record) setLatestRecord(record);
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-[#D32F2F] focus:ring-4 focus:ring-red-50 transition-all shadow-sm placeholder:text-gray-400";

  return (
    <div className="bg-gray-50 min-h-full flex flex-col pb-24 animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4 p-4 bg-[#D32F2F] text-white sticky top-0 z-30 shadow-md">
        <button onClick={onBack} className="p-1 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
        <h2 className="text-lg font-black">নতুন বিক্রি</h2>
      </header>

      <div className="p-4 space-y-3">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3 relative" ref={dropdownRef}>
          <div className="flex justify-between items-center px-1">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">কাস্টমার তথ্য</label>
             <button onClick={handlePhonebookPicker} className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                <ContactIcon size={12} /> ফোনবুক
             </button>
          </div>
          
          <div className="relative">
             <div className="flex gap-2">
                <div className="flex-1 relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                   <input 
                    type="text" 
                    placeholder="কাস্টমার নাম" 
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSearchTermContact(e.target.value);
                      setShowContactDropdown(true);
                      if (selectedContactId !== 'CASH_CUSTOMER') setSelectedContactId('');
                    }}
                    onClick={() => setShowContactDropdown(true)}
                    className={`${inputClasses} pl-9 py-3 text-sm`}
                  />
                </div>
                <div className="w-1/3">
                   <input type="tel" placeholder="ফোন" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={`${inputClasses} py-3 text-sm`} inputMode="tel" />
                </div>
             </div>

             <div className="relative mt-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="ঠিকানা (ঐচ্ছিক)" 
                  value={customerAddress} 
                  onChange={(e) => setCustomerAddress(e.target.value)} 
                  className={`${inputClasses} py-3 pl-9 text-sm`} 
                />
              </div>

             {showContactDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[50] max-h-56 overflow-y-auto ring-1 ring-black/5">
                {filteredContacts.length > 0 ? filteredContacts.map(c => (
                  <button key={c.id} onClick={() => handleSelectExistingContact(c)} className="w-full text-left p-3.5 hover:bg-red-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-400">{c.name[0]}</div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">{c.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold">{c.phone}</div>
                      </div>
                    </div>
                  </button>
                )) : null}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[150px]">
          <div className="flex justify-between items-center mb-4 px-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পণ্যের তালিকা</label>
            <button onClick={() => setShowProductSelector(true)} className="bg-[#D32F2F] text-white p-2 px-4 rounded-full text-[10px] font-black flex items-center gap-1">
              <Plus size={14} /> পণ্য যোগ
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-gray-900 text-xs truncate">{stockItems.find(p => p.id === item.productId)?.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">৳{item.price} × {item.quantity}</p>
                  {item.selectedSerials && item.selectedSerials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedSerials.filter(s => s.trim() !== '').map((s, i) => (
                        <span key={i} className="text-[7px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">#{s}</span>
                      ))}
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectingSerialsFor(item.productId)}
                    className="text-[8px] font-black text-blue-600 mt-1 uppercase tracking-tighter hover:underline flex items-center gap-1"
                  >
                    <Plus size={8} /> সিরিয়াল নাম্বার যোগ করুন
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase">ডিসকাউন্ট (৳):</label>
                    <input 
                      type="number" 
                      value={item.discount || ''} 
                      onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 p-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:border-red-500"
                      inputMode="numeric"
                    />
                  </div>
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
          </div>
          
          <div className="mt-4 pt-3 border-t border-dashed border-gray-100 space-y-3">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট ডিসকাউন্ট</span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button 
                    onClick={() => setTotalDiscountType('FIXED')}
                    className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all ${totalDiscountType === 'FIXED' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                  >৳</button>
                  <button 
                    onClick={() => setTotalDiscountType('PERCENT')}
                    className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all ${totalDiscountType === 'PERCENT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                  >%</button>
                </div>
              </div>
              <input 
                type="number" 
                value={totalDiscountInput}
                onChange={(e) => setTotalDiscountInput(e.target.value)}
                placeholder="0"
                className="w-24 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-right outline-none focus:border-red-500"
                inputMode="numeric"
              />
            </div>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">সর্বমোট</span>
              <div className="text-right">
                {totalDiscountValue > 0 && (
                  <div className="text-[10px] font-bold text-red-500 line-through opacity-50">৳{subTotal.toLocaleString('bn-BD')}</div>
                )}
                <span className="text-2xl font-black text-gray-900">৳{totalAmount.toLocaleString('bn-BD')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
           <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পেমেন্ট হিসাব</label>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase ml-1">জমা টাকা</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">৳</span>
                    <input 
                      type="number" 
                      placeholder={isCash ? totalAmount.toString() : "0"} 
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className={`${inputClasses} pl-7 py-3 text-sm border-blue-100 bg-blue-50/30`}
                      inputMode="numeric"
                    />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase ml-1">বাকি/ফেরত</label>
                 <div className={`p-3 rounded-2xl border-2 flex items-center justify-center h-[46px] ${dueAmount > 0 ? 'border-orange-100 bg-orange-50 text-orange-600' : dueAmount < 0 ? 'border-green-100 bg-green-50 text-green-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                    <span className="text-sm font-black">৳{Math.abs(dueAmount).toLocaleString('bn-BD')}</span>
                    <span className="text-[8px] ml-1 font-bold uppercase">{dueAmount > 0 ? 'বাকি' : dueAmount < 0 ? 'ফেরত' : ''}</span>
                 </div>
              </div>
           </div>

           <div className="flex gap-2 items-center">
              <div className="flex-1 flex gap-1 p-1 bg-gray-50 rounded-2xl">
                 <button onClick={() => { setIsCash(true); setPaidAmountInput(''); }} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${isCash ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>নগদ</button>
                 <button onClick={() => { setIsCash(false); setPaidAmountInput(''); }} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${!isCash ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>বাকি</button>
              </div>
              <button onClick={handleConfirm} className="flex-[1.5] bg-[#D32F2F] text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">সেভ করুন</button>
           </div>
        </div>
      </div>

      {showProductSelector && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 h-[70vh] flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">পণ্য সিলেক্ট করুন</h3>
                <button onClick={() => setShowProductSelector(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
             </div>
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="পণ্যের নাম খুঁজুন..." value={searchTermProduct} onChange={(e) => setSearchTermProduct(e.target.value)} className={`${inputClasses} pl-9 py-3 text-sm`} autoFocus />
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-red-50 text-left">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                      <div className="text-[10px] text-gray-400 font-black">স্টক: {p.quantity} {p.unit}</div>
                      {(p.serialNumber || (p.serialNumbers && p.serialNumbers.length > 0)) && (
                        <div className="text-[8px] text-blue-500 font-bold mt-0.5 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={10} /> সিরিয়াল আছে
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-black text-red-600">৳{p.sellingPrice}</div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {selectingSerialsFor && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">সিরিয়াল নাম্বার দিন</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {stockItems.find(p => p.id === selectingSerialsFor)?.name}
                </p>
              </div>
              <button onClick={() => setSelectingSerialsFor(null)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
            </div>

            <div className="bg-blue-50 p-3 rounded-2xl mb-4 border border-blue-100">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">
                মোট পরিমাণ: {cart.find(item => item.productId === selectingSerialsFor)?.quantity}টি
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar mb-6 pr-1">
              <div className="space-y-3">
                {Array.from({ length: cart.find(item => item.productId === selectingSerialsFor)?.quantity || 0 }).map((_, idx) => (
                  <div key={idx} className="relative">
                    <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block ml-1">পণ্য {idx + 1}-এর সিরিয়াল</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">#</span>
                      <input
                        className={inputClasses + " py-2.5 pl-7 text-xs font-bold"}
                        placeholder="সিরিয়াল লিখুন..."
                        value={cart.find(item => item.productId === selectingSerialsFor)?.selectedSerials?.[idx] || ''}
                        onChange={e => {
                          const newSerials = [...(cart.find(item => item.productId === selectingSerialsFor)?.selectedSerials || [])];
                          // Fill up to idx with empty strings if needed
                          while(newSerials.length <= idx) newSerials.push('');
                          newSerials[idx] = e.target.value;
                          setCart(cart.map(item => item.productId === selectingSerialsFor ? { ...item, selectedSerials: newSerials } : item));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions from Stock */}
              {(() => {
                const product = stockItems.find(p => p.id === selectingSerialsFor);
                const allStockSerials = [];
                if (product?.serialNumber) allStockSerials.push(product.serialNumber);
                if (product?.serialNumbers) allStockSerials.push(...product.serialNumbers);
                
                if (allStockSerials.length === 0) return null;

                return (
                  <div className="pt-4 border-t border-dashed border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">স্টক থেকে নিন (সাজেশন):</p>
                    <div className="flex flex-wrap gap-2">
                      {allStockSerials.map((sn, idx) => {
                        const isAlreadyUsed = cart.find(item => item.productId === selectingSerialsFor)?.selectedSerials?.includes(sn);
                        return (
                          <button 
                            key={idx} 
                            disabled={isAlreadyUsed}
                            onClick={() => {
                              const currentItem = cart.find(item => item.productId === selectingSerialsFor);
                              if (!currentItem) return;
                              const currentSerials = [...(currentItem.selectedSerials || [])];
                              // Find first empty slot or append
                              let emptyIdx = currentSerials.findIndex(s => !s || s.trim() === '');
                              if (emptyIdx === -1) {
                                if (currentSerials.length < currentItem.quantity) {
                                  currentSerials.push(sn);
                                } else {
                                  alert('সবগুলো বক্স পূরণ করা হয়েছে!');
                                  return;
                                }
                              } else {
                                currentSerials[emptyIdx] = sn;
                              }
                              setCart(cart.map(item => item.productId === selectingSerialsFor ? { ...item, selectedSerials: currentSerials } : item));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${isAlreadyUsed ? 'bg-gray-100 text-gray-300 border-gray-100' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}
                          >
                            #{sn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <button 
              onClick={() => setSelectingSerialsFor(null)}
              className="w-full bg-[#D32F2F] text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
            >
              সম্পন্ন
            </button>
          </div>
        </div>
      )}

      {latestRecord && <InvoiceView record={latestRecord} onClose={() => { setLatestRecord(null); onBack(); }} shopSettings={shopSettings} googleAccessToken={googleAccessToken} />}
    </div>
  );
};

export default SaleEntryView;
