
import React, { useRef } from 'react';
import { Printer, Download, Share2, X, CheckCircle2, QrCode, Store, Phone, Image as ImageIcon, FileText } from 'lucide-react';
import { SalePurchaseRecord, ShopSettings } from '../types';
import { toPng } from 'html-to-image';
import DriveImage from './DriveImage';

interface InvoiceViewProps {
  record: SalePurchaseRecord;
  onClose: () => void;
  shopSettings?: ShopSettings;
  googleAccessToken?: string | null;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ record, onClose, shopSettings, googleAccessToken }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const downloadImage = async () => {
    if (invoiceRef.current === null) return;
    
    try {
      // A4 dimensions in pixels at 96 DPI are 794x1123. 
      // We use a higher scale for better quality (e.g., 2x = 1588x2246)
      const dataUrl = await toPng(invoiceRef.current, { 
        cacheBust: true, 
        backgroundColor: '#fff',
        width: 794 * 2,
        height: 1123 * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: '794px',
          height: '1123px'
        }
      });
      const link = document.createElement('a');
      link.download = `memo-${record.id.slice(-6)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      alert('ছবি ডাউনলোড করতে সমস্যা হয়েছে।');
    }
  };

  const name = shopSettings && shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'ডিজিটাল মেমো';
  const address = shopSettings?.shopAddress || '';
  const phone = shopSettings?.shopPhone || '';
  const description = shopSettings?.shopDescription || 'Business Design';
  const paymentMethod = shopSettings?.paymentMethod || '';
  const signatureName = shopSettings?.signatureName || name;
  const terms = shopSettings?.termsAndConditions || 'Please send payment within 30 days of receiving this invoice. There will be 10% interest charge per month on late invoice.';
  const themeColor = shopSettings?.invoiceColor || '#002147';
  const secondaryColor = '#A1045A'; // Keeping magenta as secondary for contrast

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center p-4 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto no-scrollbar">
      {/* Action Buttons (Visible only on screen) */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 mt-4 print:hidden sticky top-0 z-[210] bg-black/20 p-2 rounded-2xl backdrop-blur-lg">
        <button onClick={onClose} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
          <X size={24} />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={downloadImage}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full font-black text-xs shadow-xl active:scale-95 transition-all"
            title="ছবি হিসেবে সেভ করুন"
          >
            <ImageIcon size={16} /> ছবি
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-black text-xs shadow-xl active:scale-95 transition-all"
            title="পিডিএফ হিসেবে সেভ বা প্রিন্ট করুন"
          >
            <FileText size={16} /> পিডিএফ / প্রিন্ট
          </button>
        </div>
      </div>

      {/* The Actual Invoice Card */}
      <div className="w-full flex-1 flex items-start justify-center overflow-auto p-2 sm:p-8 no-scrollbar">
        <div 
          ref={invoiceRef}
          id="invoice-content" 
          onClick={downloadImage}
          className="bg-white shadow-2xl animate-in zoom-in-95 duration-300 print:shadow-none print:m-0 mb-10 flex-shrink-0 flex flex-col cursor-pointer origin-top"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            transform: typeof window !== 'undefined' && window.innerWidth < 794 ? `scale(${window.innerWidth / 850})` : 'none'
          }}
          title="ক্লিক করে A4 সাইজে সেভ করুন"
        >
        {/* Invoice Header - Image Style */}
        <div className="relative h-48 overflow-hidden print:h-48">
          {/* Theme Color Background */}
          <div className="absolute inset-0" style={{ backgroundColor: themeColor }}></div>
          
          {/* Magenta Diagonal Shape */}
          <div 
            className="absolute top-0 left-0 w-2/3 h-full bg-[#A1045A] print:bg-[#A1045A]" 
            style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }}
          ></div>

          <div className="relative z-10 flex justify-between items-center h-full px-12 text-white">
            <div className="flex items-center gap-4">
              {shopSettings?.shopLogo ? (
                <DriveImage src={shopSettings.shopLogo} className="w-16 h-16 bg-white rounded-full object-cover shadow-lg" alt="Logo" token={googleAccessToken} />
              ) : (
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#A1045A] font-black text-4xl shadow-lg">
                  {name[0]}
                </div>
              )}
              <div className="text-left">
                <h1 className="text-2xl font-black tracking-tight uppercase leading-tight">{name}</h1>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{description}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-6xl font-black tracking-tighter opacity-20 absolute right-12 top-1/2 -translate-y-1/2 select-none">INVOICE</h2>
              <div className="relative">
                <h2 className="text-5xl font-black tracking-tighter mb-1">INVOICE</h2>
                <p className="text-xs font-bold opacity-80">Invoice No : {record.id.slice(-5)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-12 flex-1 flex flex-col">
          {/* Customer & Memo Info */}
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-black text-[#A1045A] uppercase tracking-widest mb-2">Invoice To:</p>
                <h3 className="text-3xl font-black leading-tight" style={{ color: themeColor }}>{record.customerName}</h3>
              </div>
              <div className="space-y-1 text-xs font-bold text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-[#A1045A]" /> {record.customerPhone}
                </div>
                {address && (
                  <div className="flex items-center gap-2">
                    <Store size={12} className="text-[#A1045A]" /> {address}
                  </div>
                )}
                {record.customerAddress && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#A1045A]/10 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-[#A1045A]"></div>
                    </div>
                    {record.customerAddress}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>Total Due :</p>
                <h3 className="text-4xl font-black text-[#A1045A]">৳{Math.abs(record.dueAmount || 0).toLocaleString('bn-BD')}</h3>
                <div className="w-12 h-1 ml-auto mt-2" style={{ backgroundColor: themeColor }}></div>
              </div>
              <p className="text-xs font-bold text-gray-500">Invoice Date : {record.date}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-white text-xs font-black uppercase tracking-widest">
                  <th className="bg-[#A1045A] p-4 rounded-l-none" style={{ clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0% 100%)' }}>Description</th>
                  <th className="p-4 text-center" style={{ backgroundColor: themeColor }}>Qty</th>
                  <th className="p-4 text-center" style={{ backgroundColor: themeColor }}>Price</th>
                  <th className="p-4 text-right pr-8" style={{ backgroundColor: themeColor }}>Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {record.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-4 py-5 font-bold" style={{ color: themeColor }}>{item.name}</td>
                    <td className="p-4 py-5 text-center font-bold text-gray-600">{item.quantity}</td>
                    <td className="p-4 py-5 text-center font-bold text-gray-600">৳{item.price}</td>
                    <td className="p-4 py-5 text-right pr-8 font-black" style={{ color: themeColor }}>
                      ৳{(item.quantity * item.price) - (item.discount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="mt-8 ml-auto w-64 space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Sub-total :</span>
                <span style={{ color: themeColor }}>৳{(record.items?.reduce((acc, i) => acc + (i.quantity * i.price), 0) || 0).toLocaleString('bn-BD')}</span>
              </div>
              
              {(record.discount || record.items?.some(i => i.discount && i.discount > 0)) && (
                <div className="flex justify-between text-xs font-bold text-red-500 uppercase tracking-widest">
                  <span>Discount :</span>
                  <span>- ৳{(
                    (record.items?.reduce((acc, i) => acc + (i.discount || 0), 0) || 0) + 
                    (record.discountType === 'PERCENT' ? ((record.items?.reduce((acc, i) => acc + (i.quantity * i.price) - (i.discount || 0), 0) || 0) * (record.discount || 0) / 100) : (record.discount || 0))
                  ).toLocaleString('bn-BD')}</span>
                </div>
              )}

              <div 
                className="text-white p-4 flex justify-between items-center mt-6"
                style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)', backgroundColor: themeColor }}
              >
                <span className="text-xs font-black uppercase tracking-widest pl-4">Total :</span>
                <span className="text-xl font-black">৳{record.amount.toLocaleString('bn-BD')}</span>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 grid grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>Payment Method :</h4>
                <div className="text-xs font-bold text-gray-600 space-y-1">
                  {paymentMethod ? (
                    <p className="whitespace-pre-line">{paymentMethod}</p>
                  ) : (
                    <>
                      <p>Bank Name : {name}</p>
                      <p>Account Number : {phone}</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>Term and Conditions</h4>
                <p className="text-[10px] font-bold text-gray-400 leading-relaxed whitespace-pre-line">
                  {terms}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end justify-end">
              <div className="text-center w-48">
                <div className="mb-2 italic font-serif text-2xl opacity-80" style={{ color: themeColor }}>Signature</div>
                <div className="h-px w-full mb-2" style={{ backgroundColor: themeColor }}></div>
                <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: themeColor }}>{signatureName}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Administrator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Shape */}
        <div className="h-12 relative overflow-hidden print:h-12">
          <div 
            className="absolute bottom-0 right-0 w-1/2 h-full bg-[#A1045A] print:bg-[#A1045A]" 
            style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}
          ></div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content *, .print-content, .print-content * {
            visibility: visible;
          }
          #invoice-content, .print-content {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
          /* Professional adjustments for A4 */
          .bg-[#A1045A] {
            background-color: #A1045A !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .text-[#A1045A] {
            color: #A1045A !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Dynamic Theme Color Printing */
          [style*="background-color: ${themeColor}"] {
            background-color: ${themeColor} !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          [style*="color: ${themeColor}"] {
            color: ${themeColor} !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      </div>
    </div>
  );
};

export default InvoiceView;
