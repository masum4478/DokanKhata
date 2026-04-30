
import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Banknote, Calendar, Camera, Info, MapPin } from 'lucide-react';
import { Contact, ContactType } from '../types';
import { compressImage } from '../imageUtils';
import DriveImage from './DriveImage';

interface AddContactFormProps {
  onBack: () => void;
  onSave: (contact: Contact) => void;
  editContact?: Contact;
  googleAccessToken?: string | null;
}

const AddContactForm: React.FC<AddContactFormProps> = ({ onBack, onSave, editContact, googleAccessToken }) => {
  const [name, setName] = useState(editContact?.name || '');
  const [phone, setPhone] = useState(editContact?.phone || '');
  const [address, setAddress] = useState(editContact?.address || '');
  const [photo, setPhoto] = useState(editContact?.photo || '');
  const [type, setType] = useState<ContactType>(editContact?.type || ContactType.CUSTOMER);
  const [initialBalance, setInitialBalance] = useState(editContact ? Math.abs(editContact.balance).toString() : '');
  const [isPickerSupported, setIsPickerSupported] = useState(true);

  const handleSave = () => {
    if (!name || !phone) return;
    
    const balanceValue = parseFloat(initialBalance || '0');
    const finalBalance = type === ContactType.CUSTOMER ? balanceValue : -balanceValue;

    const newContact: Contact = {
      id: editContact?.id || Date.now().toString(),
      name,
      phone,
      type,
      balance: editContact ? editContact.balance : finalBalance,
      lastActivity: editContact ? editContact.lastActivity : 'এখনই',
      transactions: editContact?.transactions || [],
      photo,
      address
    };
    
    onSave(newContact);
  };

  const handleContactPicker = async () => {
    try {
      // Check if we are in an iframe
      const isIframe = window.self !== window.top;
      
      if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
        setIsPickerSupported(false);
        alert('আপনার ব্রাউজারটি ফোনবুক সাপোর্ট করছে না। এটি সাধারণত মোবাইল ব্রাউজারে কাজ করে।');
        return;
      }

      if (isIframe) {
        const confirmOpen = confirm('নিরাপত্তার কারণে আইফ্রেমের ভেতর থেকে ফোনবুক এক্সেস করা সম্ভব নয়। আপনি কি অ্যাপটি নতুন ট্যাবে ওপেন করতে চান?');
        if (confirmOpen) {
          window.open(window.location.href, '_blank');
        }
        return;
      }

      const props = ['name', 'tel', 'icon'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const selectedContact = contacts[0];
        
        // Set Name
        if (selectedContact.name && selectedContact.name.length > 0) {
          setName(selectedContact.name[0]);
        }
        
        // Set Phone
        if (selectedContact.tel && selectedContact.tel.length > 0) {
          const cleanPhone = selectedContact.tel[0].replace(/[^\d+]/g, '');
          setPhone(cleanPhone);
        }

        // Set Photo (Icon)
        if (selectedContact.icon && selectedContact.icon.length > 0) {
          const blob = selectedContact.icon[0];
          const reader = new FileReader();
          reader.onloadend = async () => {
            const compressed = await compressImage(reader.result as string);
            setPhoto(compressed);
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (err: any) {
      console.error('Contact picker error:', err);
      if (err.name === 'SecurityError') {
        alert('নিরাপত্তার কারণে আইফ্রেমের ভেতর থেকে ফোনবুক এক্সেস করা সম্ভব নয়। দয়া করে অ্যাপটি নতুন ট্যাবে ওপেন করে চেষ্টা করুন।');
      } else {
        alert('ফোনবুক এক্সেস করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setPhoto(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full p-4 pl-12 bg-white border-2 border-gray-200 rounded-2xl outline-none text-gray-900 font-bold focus:border-[#D32F2F] focus:ring-4 focus:ring-red-50 transition-all shadow-sm placeholder:text-gray-400";

  return (
    <div className="bg-white min-h-full flex flex-col animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4 p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="text-gray-600 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
        <h2 className="text-lg font-bold">{editContact ? 'কন্টাক্ট এডিট করুন' : 'নতুন কাস্টমার/সাপ্লায়ার'}</h2>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex justify-center relative">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 overflow-hidden">
            {photo ? (
              <DriveImage src={photo} className="w-full h-full object-cover" alt="Profile" token={googleAccessToken} />
            ) : name ? (
              <span className="text-3xl font-black text-gray-400">{name[0].toUpperCase()}</span>
            ) : (
              <User size={48} />
            )}
          </div>
          <label className="absolute bottom-0 translate-x-10 bg-white shadow-lg p-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <Camera size={18} className="text-[#D32F2F]" />
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setType(ContactType.CUSTOMER)}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-black ${
              type === ContactType.CUSTOMER ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]' : 'border-gray-200 text-gray-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              type === ContactType.CUSTOMER ? 'border-[#D32F2F]' : 'border-gray-300'
            }`}>
              {type === ContactType.CUSTOMER && <div className="w-2.5 h-2.5 bg-[#D32F2F] rounded-full" />}
            </div>
            কাস্টমার
          </button>
          <button 
            onClick={() => setType(ContactType.SUPPLIER)}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-black ${
              type === ContactType.SUPPLIER ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]' : 'border-gray-200 text-gray-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              type === ContactType.SUPPLIER ? 'border-[#D32F2F]' : 'border-gray-300'
            }`}>
              {type === ContactType.SUPPLIER && <div className="w-2.5 h-2.5 bg-[#D32F2F] rounded-full" />}
            </div>
            সাপ্লায়ার
          </button>
        </div>

        {!editContact && (
          <button 
            onClick={handleContactPicker}
            className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold border-2 border-blue-200 active:scale-95 transition-all hover:bg-blue-100 shadow-sm"
          >
             <User size={20} /> ফোনবুক থেকে যোগ করি
          </button>
        )}

        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D32F2F] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="নাম" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D32F2F] transition-colors" size={20} />
            <input 
              type="tel" 
              placeholder="মোবাইল নম্বর" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
              inputMode="tel"
            />
          </div>

          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D32F2F] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="ঠিকানা (ঐচ্ছিক)" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClasses}
            />
          </div>

          {!editContact && (
            <div className="relative group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold text-lg group-focus-within:text-[#D32F2F]">৳</div>
              <input 
                type="number" 
                placeholder="পূর্বের বাকি (জের)" 
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className={`${inputClasses} text-2xl font-black`}
                inputMode="numeric"
              />
            </div>
          )}
        </div>

        <button 
          onClick={handleSave}
          disabled={!name || !phone}
          className={`w-full p-5 rounded-full font-black text-lg text-white shadow-xl transition-all transform active:scale-[0.98] ${
            name && phone ? 'bg-[#D32F2F] hover:shadow-red-200' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {editContact ? 'পরিবর্তন সেভ করুন' : 'কন্টাক্ট সেভ করুন'}
        </button>
      </div>
    </div>
  );
};

export default AddContactForm;
