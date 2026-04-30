
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  Calendar, 
  Camera, 
  Plus, 
  Minus, 
  MessageSquare, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronDown,
  Sparkles,
  Edit2,
  Trash2,
  User,
  X,
  Truck,
  Phone,
  CheckCircle2,
  Printer,
  Download,
  History,
  Book,
  MapPin,
  Banknote,
  ClipboardCheck,
  Zap,
  Loader2
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { GoogleGenAI } from "@google/genai";
import { Contact, Transaction, SalePurchaseRecord, StockTransaction, ContactType, ShopSettings } from '../types';
import DriveImage from './DriveImage';

interface ContactDetailsProps {
  contact: Contact;
  records: SalePurchaseRecord[];
  stockTransactions: StockTransaction[];
  contacts: Contact[];
  onBack: () => void;
  onAddTransaction: (t: Transaction) => void;
  onShowRecommendations?: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onUpdateContacts: (contacts: Contact[]) => void;
  shopSettings: ShopSettings;
  onIncrementGeminiUsage?: () => void;
  geminiUsageCount?: number;
  googleAccessToken?: string | null;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ 
  contact, 
  records,
  stockTransactions,
  contacts,
  onBack, 
  onAddTransaction, 
  onShowRecommendations,
  onEditContact,
  onDeleteContact,
  onUpdateContacts,
  shopSettings,
  onIncrementGeminiUsage,
  geminiUsageCount,
  googleAccessToken
}) => {
  const [dilamAmount, setDilamAmount] = useState('');
  const [pelamAmount, setPelamAmount] = useState('');
  const [description, setDescription] = useState('');
  const [ledgerName, setLedgerName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalePurchaseRecord | null>(null);
  const [showSupplierDetail, setShowSupplierDetail] = useState<Contact | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{ amount: number; date: string; supplierName: string; remainingBalance: number; phone: string } | null>(null);
  const [showCustomerReceipt, setShowCustomerReceipt] = useState<{ amount: number; date: string; customerName: string; remainingBalance?: number; phone: string; isDueEntry?: boolean } | null>(null);
  const [showActionArea, setShowActionArea] = useState(false);
  const [activeAction, setActiveAction] = useState<'RECEIVED' | 'DUE_GIVEN'>('RECEIVED');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  
  const inputClasses = "w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none text-sm font-bold text-slate-900 focus:border-gray-200 focus:bg-white transition-all";
  
  const historyRef = useRef<HTMLDivElement>(null);
  const actionAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const supplierReceiptRef = useRef<HTMLDivElement>(null);
  const customerReceiptRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAIReminder = async () => {
    setIsGenerating(true);
    try {
      const currentCount = contact.reminderCount || 0;
      let responseText = '';

      // Check for manual templates first
      if (shopSettings.reminderTemplates && shopSettings.reminderTemplates.length > 0) {
        const index = currentCount % shopSettings.reminderTemplates.length;
        const template = shopSettings.reminderTemplates[index];
        
        // Replace placeholders if they exist
        let processed = template
          .replace(/{নাম}|{name}/g, contact.name)
          .replace(/{বকেয়া}|{balance}/g, contact.balance.toLocaleString('bn-BD'));
          
        // If no placeholders were used, automatically prepend name and balance as requested
        if (processed === template) {
           processed = `${contact.name} ভাই, আপনার মোট বকেয়া ৳${contact.balance.toLocaleString('bn-BD')}। ${template}`;
        }
        responseText = processed;
      } else {
        // Fallback to AI if no manual templates
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey || '' });
        if (onIncrementGeminiUsage) onIncrementGeminiUsage();
        
        // Select a random style to ensure variety and engagement
        const styles = [
          'joke-based', 
          'standard-but-witty', 
          'story-telling', 
          'brotherly-love', 
          'poetic-humor', 
          'gentle-reminder',
          'riddle-style'
        ];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are a legendary, super-friendly, and witty shopkeeper in Bangladesh who everyone loves. 
          A customer named ${contact.name} has a due balance of ৳${contact.balance}. 
          This is reminder number ${currentCount + 1}.
          
          Style to use: ${randomStyle}
          Random Seed: ${Math.random()}
          Current Time: ${new Date().toISOString()}
          
          Generate a unique, attractive, and funny WhatsApp reminder message in Bengali that makes the customer smile and NOT feel annoyed.
          
          Requirements:
          1. Tone: Extremely polite, professional, yet hilarious. It should feel like a friendly chat, not a collection notice.
          2. Humor: Include a small joke, a funny observation about "forgetfulness", or a witty riddle. 
          3. Standard Quality: Even when funny, it must maintain a standard of respect (using "আপনি" or "তুমি" based on context, but default to polite).
          4. Content: Must naturally mention the due amount (৳${contact.balance}).
          5. Variety: Use the style "${randomStyle}". If it's a joke, make it a clean, relatable one for a Bangladeshi context.
          6. Non-Annoying: The message should be so good that the customer enjoys reading it.
          
          Return ONLY the message text.`,
        });

        responseText = response.text || '';
      }

      if (!responseText) throw new Error('Empty response');

      // Update contact reminder metadata
      const today = new Date().toISOString();
      const updatedContacts = contacts.map(c => {
        if (c.id === contact.id) {
          return {
            ...c,
            lastReminderDate: today,
            reminderCount: currentCount + 1
          };
        }
        return c;
      });
      onUpdateContacts(updatedContacts);

      const url = `https://wa.me/88${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(responseText)}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error('AI Reminder Error:', e);
      const currentCount = contact.reminderCount || 0;
      
      // Large variety of fallback messages to ensure uniqueness even if AI fails
      const fallbacks = [
        `আসসালামু আলাইকুম, ${contact.name}—আপনার কাছে ৳${contact.balance} বকেয়া আছে। টাকাটা দিলে এক কাপ চা খাওয়াবো ইনশাআল্লাহ!`,
        `প্রিয় ${contact.name}, আপনার ৳${contact.balance} বকেয়াটা কি মনে আছে? সময় করে দিয়ে দিলে খুব উপকার হতো। ধন্যবাদ!`,
        `আসসালামু আলাইকুম, ${contact.name}। আপনার ৳${contact.balance} বকেয়াটা পরিশোধের জন্য অনুরোধ করছি। ভালো থাকবেন।`,
        `ভাই ${contact.name}, ৳${contact.balance} বকেয়াটা কি আজ দেওয়া সম্ভব? দোকানের স্টক তুলতে হবে। ধন্যবাদ!`,
        `আসসালামু আলাইকুম ${contact.name} সাহেব, আপনার হিসাবের খাতা বলছে ৳${contact.balance} বাকি। একটু দেখে দেবেন কি?`,
        `${contact.name} ভাই, চা তো পাওনা রইলোই, সাথে ৳${contact.balance} বকেয়াটাও যদি আজ ক্লিয়ার করতেন!`,
        `শুভেচ্ছা জানবেন ${contact.name}। আপনার বকেয়া ৳${contact.balance} পরিশোধের জন্য একটি বন্ধুত্বপূর্ণ রিমাইন্ডার।`,
        `কি খবর ${contact.name} ভাই? পকেটে কি ৳${contact.balance} আছে? থাকলে দোকানে এসে দিয়ে যান, আড্ডা হবে!`,
        `আসসালামু আলাইকুম, ${contact.name}। আপনার বকেয়া ৳${contact.balance} পরিশোধের অনুরোধ রইলো। দিনটি ভালো কাটুক।`,
        `${contact.name} ভাই, আপনার জন্য একটি স্পেশাল অফার! ৳${contact.balance} বকেয়া পরিশোধ করুন আর এক গাল হাসি নিয়ে যান।`,
        `প্রিয় ${contact.name}, ব্যবসার খাতিরে মনে করিয়ে দেওয়া—আপনার কাছে ৳${contact.balance} পাওনা আছে।`,
        `আসসালামু আলাইকুম ${contact.name}। আপনার ৳${contact.balance} বকেয়াটা কি আজ পাঠানো যাবে? খুব দরকার ছিল।`,
        `${contact.name} ভাই, ভুলবেন না কিন্তু! ৳${contact.balance} বকেয়াটা আপনার অপেক্ষায় আছে।`,
        `কেমন আছেন ${contact.name}? আপনার হিসাবের ৳${contact.balance} বকেয়াটা পরিশোধের জন্য অনুরোধ করছি।`,
        `আসসালামু আলাইকুম। ${contact.name} ভাই, ৳${contact.balance} বকেয়াটা দিলে দোকানের নতুন মাল তুলতে পারতাম।`,
        `${contact.name} সাহেব, আপনার ৳${contact.balance} বকেয়া পরিশোধের জন্য এই রিমাইন্ডারটি পাঠানো হলো। ধন্যবাদ।`,
        `ভাই ${contact.name}, ৳${contact.balance} বকেয়াটা কি পকেটে আছে? থাকলে দোকানে এসে এক কাপ চা খেয়ে যান!`,
        `আসসালামু আলাইকুম ${contact.name}। আপনার বকেয়া ৳${contact.balance} পরিশোধের জন্য বিনীত অনুরোধ।`,
        `প্রিয় ${contact.name}, আপনার সাথে লেনদেন সবসময় আনন্দের। ৳${contact.balance} বকেয়াটা একটু দেখে দেবেন।`,
        `কি খবর ${contact.name} ভাই? আপনার ৳${contact.balance} বকেয়াটা কি আজ ক্লিয়ার হচ্ছে?`
      ];
      
      // Use reminderCount to pick a message so it's different on each click even without AI
      const index = (currentCount) % fallbacks.length;
      const fallbackMsg = fallbacks[index];
      
      const url = `https://wa.me/88${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(fallbackMsg)}`;
      window.open(url, '_blank');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInvitation = async () => {
    setIsGenerating(true);
    try {
      const currentCount = contact.invitationCount || 0;
      let responseText = '';

      // Check for manual invitation templates first
      if (shopSettings.invitationTemplates && shopSettings.invitationTemplates.length > 0) {
        const index = currentCount % shopSettings.invitationTemplates.length;
        const template = shopSettings.invitationTemplates[index];
        
        // Replace placeholders if they exist
        let processed = template.replace(/{নাম}|{name}/g, contact.name);
        
        // If no placeholders were used, automatically prepend name as requested
        if (processed === template) {
           processed = `${contact.name} ভাই, ${template}`;
        }
        responseText = processed;
      } else {
        // Default invitation fallbacks
        const fallbacks = [
          `আসসালামু আলাইকুম, ${contact.name}। কেমন আছেন? অনেকদিন আপনার দেখা নেই। সময় পেলে আমাদের দোকানে একবার আসবেন।`,
          `প্রিয় ${contact.name}, আমাদের দোকানে নতুন কিছু কালেকশন এসেছে। আপনার আমন্ত্রন রইলো।`,
          `আসসালামু আলাইকুম ${contact.name} ভাই। আপনার সাথে আড্ডা দেওয়া মিস করছি। দোকানে আসবেন কিন্তু!`,
          `শুভেচ্ছা জানবেন ${contact.name}। আমাদের দোকানে আসার জন্য আপনাকে সাদর আমন্ত্রণ জানাচ্ছি।`
        ];
        responseText = fallbacks[currentCount % fallbacks.length];
      }

      if (!responseText) throw new Error('Empty response');

      // Update contact invitation metadata
      const updatedContacts = contacts.map(c => {
        if (c.id === contact.id) {
          return {
            ...c,
            invitationCount: currentCount + 1
          };
        }
        return c;
      });
      onUpdateContacts(updatedContacts);

      const url = `https://wa.me/88${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(responseText)}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error('Invitation Error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (type: 'DUE_GIVEN' | 'RECEIVED') => {
    const amount = parseFloat(type === 'DUE_GIVEN' ? dilamAmount : pelamAmount);
    if (!amount || isNaN(amount)) return;

    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type,
      amount,
      description: ledgerName ? `[${ledgerName}] ${description}` : description,
      date: today
    };

    onAddTransaction(newTransaction);

    if (type === 'RECEIVED') {
      setShowCustomerReceipt({
        amount,
        date: today,
        customerName: contact.name,
        remainingBalance: contact.balance - amount,
        phone: contact.phone
      });
    } else {
      setShowCustomerReceipt({
        amount,
        date: today,
        customerName: contact.name,
        remainingBalance: contact.balance + amount,
        phone: contact.phone,
        isDueEntry: true
      });
    }

    setDilamAmount('');
    setPelamAmount('');
    setDescription('');
    setLedgerName('');
    setShowActionArea(false);
  };

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToActionArea = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
    onDeleteContact(contact.id);
    setIsDeleteModalOpen(false);
    setIsMenuOpen(false);
  };

  const handleTransactionClick = (t: Transaction) => {
    if (t.recordId) {
      const record = records.find(r => r.id === t.recordId);
      if (record) {
        setSelectedRecord(record);
      }
    } else {
      setShowCustomerReceipt({
        amount: t.amount,
        date: t.date,
        customerName: contact.name,
        remainingBalance: undefined,
        phone: contact.phone,
        isDueEntry: t.type === 'DUE_GIVEN'
      });
    }
  };

  const getSupplierForItem = (productId: string) => {
    const lastInTransaction = stockTransactions
      .filter(t => t.itemId === productId && t.type === 'IN')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return lastInTransaction ? lastInTransaction.partyName : 'অজানা সাপ্লায়ার';
  };

  const openSupplierProfile = (name: string) => {
    const foundContact = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (foundContact) {
      setShowSupplierDetail(foundContact);
    } else {
      setShowSupplierDetail({
        id: 'tmp-' + Date.now(),
        name,
        phone: 'অনিবন্ধিত',
        type: ContactType.SUPPLIER,
        balance: 0,
        transactions: [],
        lastActivity: 'রেকর্ড নেই'
      });
    }
  };

  const handleSupplierPayment = () => {
    if (!showSupplierDetail || !paymentAmount) return;
    const payAmt = parseFloat(paymentAmount);
    const today = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const ledgerTransaction: Transaction = {
      id: Date.now().toString() + "-pay",
      type: 'RECEIVED',
      amount: payAmt,
      description: `বকেয়া পরিশোধ (সাপ্লায়ার পেমেন্ট)`,
      date: today
    };

    const updatedContacts = contacts.map(c => {
      if (c.id === showSupplierDetail.id) {
        return { 
          ...c, 
          balance: c.balance - payAmt, 
          transactions: [ledgerTransaction, ...c.transactions],
          lastActivity: today
        };
      }
      return c;
    });

    onUpdateContacts(updatedContacts);
    setIsPaying(false);
    setPaymentAmount('');
    setShowReceipt({ 
      amount: payAmt, 
      date: today, 
      supplierName: showSupplierDetail.name,
      remainingBalance: showSupplierDetail.balance - payAmt,
      phone: showSupplierDetail.phone
    });
    setShowSupplierDetail(null);
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSaveImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (ref.current === null) return;
    try {
      const dataUrl = await htmlToImage.toPng(ref.current, { 
        backgroundColor: '#ffffff',
        style: { borderRadius: '0' }
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
কাস্টমার: ${receiptData.customerName || receiptData.supplierName}
তারিখ: ${receiptData.date}
পরিমাণ: ৳${receiptData.amount.toLocaleString('bn-BD')}
${receiptData.remainingBalance !== undefined ? (receiptData.remainingBalance > 0 ? `অবশিষ্ট বকেয়া: ৳${receiptData.remainingBalance.toLocaleString('bn-BD')}` : 'বকেয়া নেই') : ''}
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

  const handleUpdateProfile = (updates: Partial<Contact>) => {
    const updatedContacts = contacts.map(c => {
      if (c.id === contact.id) {
        return { ...c, ...updates };
      }
      return c;
    });
    onUpdateContacts(updatedContacts);
  };

  const salesHistory = useMemo(() => {
    return records.filter(r => r.customerName === contact.name && r.type === 'SALE');
  }, [records, contact.name]);

  return (
    <div className="bg-slate-50 min-h-full flex flex-col relative font-sans pb-24">
      {/* Header Section */}
      <div className="p-6 bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              {contact.balance > 0 && (
                <button 
                  onClick={handleAIReminder}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
                  রিমাইন্ডার
                </button>
              )}
              {contact.balance <= 0 && contact.type === ContactType.CUSTOMER && (
                <button 
                  onClick={handleInvitation}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />} 
                  আমন্ত্রণ
                </button>
              )}
              <a href={`https://wa.me/88${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <MessageSquare size={20} />
              </a>
              <a href={`tel:${contact.phone}`} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <Phone size={20} />
              </a>
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => { onEditContact(contact); setIsMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                      <Edit2 size={16} className="text-blue-500" /> ইডিট প্রোফাইল
                    </button>
                    <button onClick={() => { setIsDeleteModalOpen(true); setIsMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3">
                      <Trash2 size={16} className="text-red-500" /> ডিলিট কন্টাক্ট
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-4">
            <div 
              onClick={() => setShowStatement(true)}
              className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden relative shadow-md cursor-pointer active:scale-95 transition-transform"
            >
              {contact.photo ? (
                <DriveImage src={contact.photo} className="w-full h-full object-cover" alt={contact.name} token={googleAccessToken} />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <User size={48} />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center w-full px-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{contact.name}</h2>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                <Phone size={12} />
                <span className="text-sm font-bold tracking-tight">{contact.phone}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                <MapPin size={12} />
                <span className="text-xs font-bold tracking-tight">{contact.address || 'ঠিকানা নেই'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Financial Summary Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-2">
              <ArrowUpRight size={16} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট বিক্রি</p>
            <p className="text-sm font-black text-slate-900 tracking-tighter">
              ৳{salesHistory.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('bn-BD')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট আদায়</p>
            <p className="text-sm font-black text-slate-900 tracking-tighter">
              ৳{contact.transactions.filter(t => t.type === 'RECEIVED').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('bn-BD')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-2">
              <Minus size={16} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">বকেয়া</p>
            <p className="text-sm font-black text-red-600 tracking-tighter">
              ৳{contact.balance.toLocaleString('bn-BD')}
            </p>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="space-y-4" onClick={() => setShowStatement(true)}>
          <div className="flex items-center justify-between px-1 cursor-pointer">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">লেনদেনের ইতিহাস</h4>
            <div className="flex items-center gap-1 text-blue-600">
              <span className="text-[10px] font-bold">সব দেখুন</span>
              <ChevronDown size={14} className="-rotate-90" />
            </div>
          </div>

          <div className="space-y-3">
            {contact.transactions.map((t) => (
              <div 
                key={t.id} 
                className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                onClick={() => handleTransactionClick(t)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'RECEIVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {t.type === 'RECEIVED' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 leading-tight">{t.description || (t.type === 'RECEIVED' ? 'টাকা আদায়' : 'বাকি বিক্রয়')}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black tracking-tighter ${t.type === 'RECEIVED' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'RECEIVED' ? '+' : '-'} ৳{t.amount.toLocaleString('bn-BD')}
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Transaction</div>
                </div>
              </div>
            ))}
            
            {contact.transactions.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                <History size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 font-bold text-xs">এখনো কোনো লেনদেন করা হয়নি।</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Area (Bottom Sheet) */}
      {showActionArea && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowActionArea(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
            
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xl font-black text-slate-900">
                {activeAction === 'RECEIVED' ? 'টাকা আদায় করুন' : 'বাকি এন্ট্রি করুন'}
              </h4>
              <button onClick={() => setShowActionArea(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl ${
                  activeAction === 'DUE_GIVEN' ? 'text-red-600' : 'text-emerald-600'
                }`}>৳</div>
                <input 
                  type="number" 
                  placeholder="পরিমাণ"
                  value={activeAction === 'DUE_GIVEN' ? dilamAmount : pelamAmount}
                  onChange={(e) => {
                    if (activeAction === 'DUE_GIVEN') {
                      setDilamAmount(e.target.value);
                      setPelamAmount('');
                    } else {
                      setPelamAmount(e.target.value);
                      setDilamAmount('');
                    }
                  }}
                  className={`w-full pl-14 pr-6 py-6 bg-slate-50 border-2 border-transparent rounded-2xl outline-none text-4xl font-black text-slate-900 focus:bg-white transition-all ${
                    activeAction === 'DUE_GIVEN' ? 'focus:border-red-500' : 'focus:border-emerald-500'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="খাতা"
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-200 transition-all"
                  />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="নোট"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-200 transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={() => handleSubmit(activeAction)}
                className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl active:scale-[0.98] transition-all ${
                  activeAction === 'DUE_GIVEN' ? 'bg-red-600 shadow-red-100' : 'bg-emerald-600 shadow-emerald-100'
                }`}
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">আপনি কি নিশ্চিত?</h3>
            <p className="text-sm font-bold text-slate-500 mb-8">
              আপনি কি সত্যিই <span className="text-slate-900">"{contact.name}"</span>-কে ডিলিট করতে চান? এই কাজটি আর ফেরত নেওয়া যাবে না।
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-100 active:scale-95 transition-all"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg active:scale-95 transition-all"
              >
                না, ফিরে যান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Statement View */}
      {showStatement && (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          {/* Statement Header */}
          <div className="p-6 bg-white border-b border-slate-100 sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowStatement(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">{contact.name}</h3>
                <p className="text-xs font-bold text-slate-400">{contact.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`tel:${contact.phone}`} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <Phone size={20} />
              </a>
              <button onClick={handlePrint} className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <Printer size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
            {/* Highlighted Balance */}
            <div className={`bg-gradient-to-br p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden ${
              contact.balance >= 0 ? 'from-slate-900 to-slate-800' : 'from-red-900 to-red-800'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">
                      {contact.balance >= 0 ? 'মোট বকেয়া পরিমাণ' : 'আপনার কাছে পাবে'}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-5xl font-black tracking-tighter ${contact.balance >= 0 ? 'text-red-400' : 'text-white'}`}>
                        ৳{Math.abs(contact.balance).toLocaleString('bn-BD')}
                      </span>
                      <span className="text-xl font-bold opacity-50">.০০</span>
                    </div>
                  </div>
                  {/* Removed Due Collection button as per request */}
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <Calendar size={12} />
                  সর্বশেষ আপডেট: {contact.lastActivity}
                </div>
              </div>
            </div>

            {/* Detailed Transaction List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">লেনদেন ও ইনভয়েস তালিকা</h4>
                <div className="text-[10px] font-bold text-slate-400">{contact.transactions.length} টি রেকর্ড</div>
              </div>

              <div className="space-y-3">
                {contact.transactions.slice().reverse().map((t) => {
                  const record = t.recordId ? records.find(r => r.id === t.recordId) : null;
                  const isDue = record ? (record.dueAmount && record.dueAmount > 0) : (t.type === 'DUE_GIVEN');
                  const isFullyPaid = record ? (record.dueAmount === 0) : (t.type === 'RECEIVED');

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTransactionClick(t)}
                      className={`p-5 rounded-3xl border-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm ${
                        isDue 
                          ? 'bg-red-50/50 border-red-100' 
                          : isFullyPaid 
                            ? 'bg-emerald-50/50 border-emerald-100'
                            : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                            t.type === 'RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {t.type === 'RECEIVED' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-tight">
                              {t.description || (t.type === 'RECEIVED' ? 'টাকা আদায়' : 'বাকি বিক্রয়')}
                              {t.recordId && (
                                <span className="ml-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                  #{t.recordId.slice(-6)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {t.date}
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          isDue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isDue ? 'বাকি আছে' : 'পরিশোধিত'}
                        </div>
                      </div>

                      <div className="flex justify-between items-end pt-3 border-t border-slate-100/50">
                        <div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-black tracking-tighter ${
                            t.type === 'RECEIVED' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {t.type === 'RECEIVED' ? '+' : '-'} ৳{t.amount.toLocaleString('bn-BD')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Statement Footer Actions */}
          <div className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setShowStatement(false); setActiveAction('DUE_GIVEN'); setShowActionArea(true); }}
              className="py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Minus size={18} /> বাকি এন্ট্রি
            </button>
            <button 
              onClick={() => { setShowStatement(false); setActiveAction('RECEIVED'); setShowActionArea(true); }}
              className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> টাকা আদায়
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 flex gap-4 z-40 no-print">
        <button 
          onClick={() => { setActiveAction('DUE_GIVEN'); setShowActionArea(true); }}
          className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Minus size={20} /> বাকি দিলাম
        </button>
        <button 
          onClick={() => { setActiveAction('RECEIVED'); setShowActionArea(true); }}
          className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> টাকা পেলাম
        </button>
      </div>
      {/* Invoice Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedRecord(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] relative animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 sm:hidden"></div>
            
            <div ref={invoiceRef} className="bg-white">
              <header className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white print:hidden">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">ইনভয়েস ডিটেইলস</h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Invoice ID: #{selectedRecord.id.slice(-6)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </header>

              {/* Print-only header */}
              <div className="hidden print:block p-8 border-b border-slate-100 text-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান'}
                </h2>
                {shopSettings.shopPhone && <p className="text-sm font-bold text-slate-500 mt-1">ফোন: {shopSettings.shopPhone}</p>}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">ইনভয়েস (Invoice)</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">ID: #{selectedRecord.id.slice(-8)} | তারিখ: {selectedRecord.date}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Total Amount</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">৳{selectedRecord.amount.toLocaleString('bn-BD')}</span>
                    <span className="text-xl font-bold text-slate-300">.০০</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedRecord.isCash ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                      {selectedRecord.isCash ? 'Cash Sale' : 'Credit Sale'}
                    </span>
                    {selectedRecord.dueAmount && selectedRecord.dueAmount > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                        Due: ৳{selectedRecord.dueAmount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Items List</h4>
                    <div className="h-[1px] flex-1 bg-slate-100 mx-4"></div>
                    <div className="text-[10px] font-black text-slate-900">{selectedRecord.items?.length || 0} Items</div>
                  </div>
                  <div className="space-y-3">
                    {selectedRecord.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{item.quantity} পিস × ৳{item.price}</p>
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-900">৳{(item.quantity * item.price).toLocaleString('bn-BD')}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRecord.invoiceImage && (
                  <div className="space-y-4 print:hidden">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">সংযুক্ত ইনভয়েস ছবি</h4>
                    <div className="rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-xl">
                      <DriveImage src={selectedRecord.invoiceImage} alt="Invoice" className="w-full h-auto object-contain max-h-96" token={googleAccessToken} />
                    </div>
                  </div>
                )}

                <div className="hidden print:block pt-12 text-center">
                  <p className="text-[10px] font-black text-slate-400 italic">"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"</p>
                </div>
              </div>
            </div>

            <footer className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 print:hidden">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Printer size={16} /> প্রিন্ট
                </button>
                <button 
                  onClick={() => handleSaveImage(invoiceRef, `Invoice_${selectedRecord.id.slice(-8)}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download size={16} /> সেভ করুন
                </button>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedRecord(null)} 
                  className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  বন্ধ করুন
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Invoice',
                        text: `Invoice from ${shopSettings.shopName}\nAmount: ৳${selectedRecord.amount}\nDate: ${selectedRecord.date}`,
                        url: window.location.href
                      }).catch(console.error);
                    } else {
                      alert('Sharing is not supported on this browser');
                    }
                  }}
                  className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest active:scale-95 shadow-2xl flex items-center justify-center gap-3"
                >
                  <MessageSquare size={18} />
                  শেয়ার
                </button>
              </div>
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
                        onClick={() => setIsPaying(true)}
                        className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-red-700"
                      >
                         বকেয়া পরিশোধ
                      </button>
                      <a 
                        href={`tel:${showSupplierDetail.phone}`}
                        className="p-4 bg-white/10 rounded-2xl text-white border border-white/10 active:scale-95 hover:bg-white/20 transition-colors"
                      >
                        <Phone size={20} />
                      </a>
                   </div>
                 </div>
                 {/* Decorative blur */}
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl"></div>
                 <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
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
                        <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="পরিমাণ" className={inputClasses + " pl-10 border-blue-100 focus:border-blue-600 text-2xl"} autoFocus />
                      </div>
                      <button onClick={handleSupplierPayment} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 uppercase text-xs tracking-widest active:scale-95 transition-all">
                        পরিশোধ নিশ্চিত করুন
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
                    {stockTransactions.filter(t => t.partyName === showSupplierDetail.name && t.type === 'IN').map(t => (
                      <div key={t.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                         <div className="flex justify-between items-center">
                           <div>
                              <div className="text-sm font-black text-gray-800 leading-tight">{t.itemName}</div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{t.date}</div>
                           </div>
                           <div className="text-right">
                              <div className="text-xs font-black text-gray-900">{t.quantity} পিস</div>
                              <div className="text-[10px] font-black text-red-600">৳{(t.quantity * t.price).toLocaleString('bn-BD')}</div>
                           </div>
                         </div>
                         {t.invoiceImage && (
                           <div className="relative group">
                             <DriveImage 
                               src={t.invoiceImage} 
                               alt="Invoice" 
                               className="w-full h-32 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-all"
                               token={googleAccessToken}
                             />
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl pointer-events-none">
                               <span className="bg-white/90 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest text-gray-900">বড় করে দেখুন</span>
                             </div>
                           </div>
                         )}
                      </div>
                    ))}
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
                    {stockTransactions.filter(t => t.partyName === showSupplierDetail.name).length === 0 && showSupplierDetail.transactions.length === 0 && (
                       <div className="text-center py-10 text-xs text-gray-300 italic font-bold">কোনো রেকর্ড নেই</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      {showReceipt && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-[340px] sm:max-w-sm rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 max-h-[95vh]">
            <div ref={supplierReceiptRef} className="bg-white overflow-y-auto no-scrollbar">
              <header className="p-5 sm:p-6 bg-blue-600 text-white text-center">
                <div className="mb-2">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">{shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান'}</h2>
                  {shopSettings.shopPhone && <p className="text-[9px] sm:text-[10px] font-bold opacity-80">ফোন: {shopSettings.shopPhone}</p>}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">পেমেন্ট সফল হয়েছে</h3>
                <p className="text-[9px] sm:text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">রশিদ (Receipt)</p>
              </header>

              <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রাপক (সাপ্লায়ার)</div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900">{showReceipt.supplierName}</div>
                  <div className="text-[11px] sm:text-xs font-bold text-gray-500">{showReceipt.phone}</div>
                </div>

                <div className="bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 space-y-3 sm:space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-400">তারিখ:</span>
                    <span className="text-[11px] sm:text-xs font-black text-gray-900">{showReceipt.date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 sm:pt-4 border-t border-dashed border-gray-200">
                    <span className="text-xs sm:text-sm font-black text-gray-900">পরিশোধিত পরিমাণ:</span>
                    <span className="text-lg sm:text-xl font-black text-blue-600">৳{showReceipt.amount.toLocaleString('bn-BD')}</span>
                  </div>
                  {showReceipt.remainingBalance !== undefined && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] sm:text-xs font-bold text-gray-400">অবশিষ্ট বকেয়া:</span>
                      <span className={`text-xs sm:text-sm font-black ${showReceipt.remainingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {showReceipt.remainingBalance > 0 
                          ? `৳${Math.abs(showReceipt.remainingBalance).toLocaleString('bn-BD')}`
                          : 'বকেয়া নেই'
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                   <p className="text-[9px] sm:text-[10px] font-black text-gray-400 italic">"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-4 sm:pb-8 space-y-2 sm:space-y-3 no-print">
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-gray-900 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Printer size={14} className="sm:w-4 sm:h-4" /> প্রিন্ট
                </button>
                <button 
                  onClick={() => handleSaveImage(supplierReceiptRef, `Supplier_Receipt_${showReceipt.date}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download size={14} className="sm:w-4 sm:h-4" /> সেভ করুন
                </button>
              </div>
              <button 
                onClick={() => shareToWhatsApp(showReceipt)}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                <MessageSquare size={14} className="sm:w-4 sm:h-4" /> হোয়াটসঅ্যাপে শেয়ার করুন
              </button>
            </div>

            <footer className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 no-print">
              <button 
                onClick={() => setShowReceipt(null)}
                className="w-full py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest active:scale-95 shadow-sm"
              >
                বন্ধ করুন
              </button>
            </footer>
          </div>
        </div>
      )}
      {/* CUSTOMER PAYMENT RECEIPT MODAL */}
      {showCustomerReceipt && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-[340px] sm:max-w-sm rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 max-h-[95vh]">
            <div ref={customerReceiptRef} className="bg-white overflow-y-auto no-scrollbar">
              <header className={`p-5 sm:p-6 ${showCustomerReceipt.isDueEntry ? 'bg-red-600' : 'bg-green-600'} text-white text-center`}>
                <div className="mb-2">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">{shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'আমার দোকান'}</h2>
                  {shopSettings.shopPhone && <p className="text-[9px] sm:text-[10px] font-bold opacity-80">ফোন: {shopSettings.shopPhone}</p>}
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  {showCustomerReceipt.isDueEntry ? <ArrowUpRight size={24} className="sm:w-8 sm:h-8" /> : <CheckCircle2 size={24} className="sm:w-8 sm:h-8" />}
                </div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                  {showCustomerReceipt.isDueEntry ? 'বাকি এন্ট্রি সফল' : 'টাকা আদায় সফল'}
                </h3>
                <p className="text-[9px] sm:text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">রশিদ (Receipt)</p>
              </header>

              <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">কাস্টমার</div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900">{showCustomerReceipt.customerName}</div>
                  <div className="text-[11px] sm:text-xs font-bold text-gray-500">{showCustomerReceipt.phone}</div>
                </div>

                <div className="bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 space-y-3 sm:space-y-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] sm:text-xs font-bold text-gray-400">তারিখ:</span>
                    <span className="text-[11px] sm:text-xs font-black text-gray-900">{showCustomerReceipt.date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 sm:pt-4 border-t border-dashed border-gray-200">
                    <span className="text-xs sm:text-sm font-black text-gray-900">
                      {showCustomerReceipt.isDueEntry ? 'বাকির পরিমাণ:' : 'আদায়কৃত পরিমাণ:'}
                    </span>
                    <span className={`text-lg sm:text-xl font-black ${showCustomerReceipt.isDueEntry ? 'text-red-600' : 'text-green-600'}`}>
                      ৳{showCustomerReceipt.amount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  {showCustomerReceipt.remainingBalance !== undefined && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] sm:text-xs font-bold text-gray-400">বর্তমান বকেয়া:</span>
                      <span className={`text-xs sm:text-sm font-black ${showCustomerReceipt.remainingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {showCustomerReceipt.remainingBalance > 0 
                          ? `৳${Math.abs(showCustomerReceipt.remainingBalance).toLocaleString('bn-BD')}`
                          : 'বকেয়া নেই'
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                   <p className="text-[9px] sm:text-[10px] font-black text-gray-400 italic">"হিসাব হোক স্বচ্ছ, ব্যবসা হোক লাভবান"</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-4 sm:pb-8 space-y-2 sm:space-y-3 no-print">
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-gray-900 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Printer size={14} className="sm:w-4 sm:h-4" /> প্রিন্ট
                </button>
                <button 
                  onClick={() => handleSaveImage(customerReceiptRef, `Customer_Receipt_${showCustomerReceipt.date}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download size={14} className="sm:w-4 sm:h-4" /> সেভ করুন
                </button>
              </div>
              <button 
                onClick={() => shareToWhatsApp(showCustomerReceipt)}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                <MessageSquare size={14} className="sm:w-4 sm:h-4" /> হোয়াটসঅ্যাপে শেয়ার করুন
              </button>
            </div>

            <footer className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 no-print">
              <button 
                onClick={() => setShowCustomerReceipt(null)}
                className="w-full py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest active:scale-95 shadow-sm"
              >
                বন্ধ করুন
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          /* Professional adjustments for A4 */
          .bg-gray-900 {
            background-color: #111827 !important;
            -webkit-print-color-adjust: exact;
          }
          .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact;
          }
          .bg-gray-50 {
            background-color: #F9FAFB !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactDetails;
