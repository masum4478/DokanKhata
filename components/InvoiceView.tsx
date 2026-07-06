import React, { useRef, useEffect, useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Phone, 
  Store, 
  FileText, 
  Image as ImageIcon,
  MapPin,
  Calendar,
  Hash,
  User,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import { SalePurchaseRecord, ShopSettings } from '../types';
import { toPng } from 'html-to-image';
import DriveImage from './DriveImage';
import { getOrCreateFolder, uploadFileToDrive, FOLDER_NAME } from '../services/driveService';

interface InvoiceViewProps {
  record: SalePurchaseRecord;
  onClose: () => void;
  shopSettings?: ShopSettings;
  googleAccessToken?: string | null;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ record, onClose, shopSettings, googleAccessToken }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadAttempted = useRef(false);

  const items = record.items || [];
  const itemCount = items.length;
  const numPages = itemCount > 20 ? 2 : 1;
  const pixelWidth = 794;
  const pixelHeight = 1123 * numPages;
  const mmWidth = '210mm';
  const mmHeight = `${297 * numPages}mm`;

  const getPageStyles = (n: number) => {
    const isC = n > 5;
    const isSC = n > 11;
    const isMega = n > 15;

    return {
      headerHeight: isMega ? 'h-24' : isSC ? 'h-28' : isC ? 'h-36' : 'h-48',
      logoSize: isMega ? 'w-14 h-14 text-2xl' : isSC ? 'w-16 h-16 text-3xl' : isC ? 'w-20 h-20 text-4xl' : 'w-24 h-24 text-5xl',
      shopNameText: isMega ? 'text-xl' : isSC ? 'text-2xl' : isC ? 'text-2xl' : 'text-3xl',
      shopDescText: isSC ? 'text-[8px]' : 'text-[10px]',

      customerPadding: isMega ? 'py-1 px-12' : isSC ? 'py-2 px-12' : isC ? 'py-4 px-12' : 'py-6 px-12',
      customerNameText: isMega ? 'text-2xl' : isSC ? 'text-3xl' : isC ? 'text-4xl' : 'text-5xl',
      customerLabelText: isMega ? 'text-[10px]' : 'text-[12px]',

      tableMargin: isMega ? 'mt-1' : isSC ? 'mt-2' : isC ? 'mt-3' : 'mt-4',
      tableHeaderPadding: isMega ? 'py-2 px-6 text-[10px]' : isSC ? 'py-2.5 px-6 text-[10px]' : isC ? 'py-3.5 px-8 text-[11px]' : 'py-5 px-8 text-[12px]',
      tabCellPadding: isMega ? 'py-1 px-6' : isSC ? 'py-1.5 px-6' : isC ? 'py-2.5 px-6' : 'py-4 px-8',
      itemTitleText: isMega ? 'text-[11px]' : isSC ? 'text-[12px]' : isC ? 'text-sm' : 'text-base',
      itemTextSize: isMega ? 'text-[11px]' : isSC ? 'text-xs' : 'text-sm',

      footerPadding: isMega ? 'pb-2' : isSC ? 'pb-3' : isC ? 'pb-4' : 'pb-8',
      footerGridGap: isSC ? 'gap-6 pt-2' : 'gap-16 pt-6',
      sellerInfoMargin: isSC ? 'mb-1' : 'mb-3',
      totalBoxHeight: isMega ? 'h-10 px-6' : isSC ? 'h-12 px-8' : isC ? 'h-16 px-8' : 'h-24 px-10',
      totalBoxLabel: isSC ? 'text-sm' : 'text-2xl',
      totalBoxValue: isMega ? 'text-lg' : isSC ? 'text-xl' : isC ? 'text-3xl' : 'text-5xl', 
      signaturePt: isMega ? 'pt-2' : isSC ? 'pt-4' : 'pt-8',
      signatureWidth: isSC ? 'w-56' : 'w-72',
      signatureLineMargin: isMega ? 'mb-1' : 'mb-2',
      signatureText: isSC ? 'text-xs' : 'text-sm',
    };
  };

  const pageOneItems = items.slice(0, 20);
  const pageOneStyles = getPageStyles(itemCount > 20 ? 20 : itemCount);
  const pageTwoStyles = getPageStyles(items.slice(20, 40).length);

  useEffect(() => {
    // Auto-upload to Drive if logged in and it's a SALE record
    if (googleAccessToken && record.type === 'SALE' && !uploadAttempted.current) {
      uploadAttempted.current = true;
      autoUploadToDrive();
    }
  }, [googleAccessToken]);

  const autoUploadToDrive = async () => {
    if (!invoiceRef.current || !googleAccessToken) return;
    
    try {
      setIsUploadingToDrive(true);
      setUploadProgress(10);
      
      // Wait for rendering to complete (especially fonts and images)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUploadProgress(30);

      // Store original scroll position and transform
      const element = invoiceRef.current;
      
      // Capture high-quality image for Drive
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        backgroundColor: '#fff',
        pixelRatio: 3, 
        quality: 1,
        width: pixelWidth, 
        height: pixelHeight,
        canvasWidth: pixelWidth,
        canvasHeight: pixelHeight,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: mmWidth,
          height: mmHeight,
          margin: '0',
          padding: '0',
          position: 'static',
          boxShadow: 'none',
          top: '0',
          left: '0'
        }
      });
      setUploadProgress(60);

      // 1. Get or Create Main Folder
      const mainFolderId = await getOrCreateFolder(googleAccessToken, FOLDER_NAME);
      if (!mainFolderId) throw new Error('FOLDER_FAILED');

      // 2. Get or Create Invoices Folder
      const invoicesFolderId = await getOrCreateFolder(googleAccessToken, 'Invoices', mainFolderId);
      if (!invoicesFolderId) throw new Error('INVOICES_FOLDER_FAILED');

      // 3. Upload
      const friendlyName = record.customerName ? record.customerName.replace(/[^a-zA-Z0-9]/g, '_') : 'Customer';
      const fileName = `Invoice_${friendlyName}_${record.id.slice(-6).toUpperCase()}.png`;
      await uploadFileToDrive(googleAccessToken, fileName, 'image/png', dataUrl, invoicesFolderId);
      
      setUploadProgress(100);
      // Keep showing "saved" for 3 seconds
      setTimeout(() => setIsUploadingToDrive(false), 3000);
    } catch (e) {
      console.error("Auto-upload failed:", e);
      setIsUploadingToDrive(false);
      // Optional: show a mini error toast if needed
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadImage = async () => {
    if (invoiceRef.current === null) return;
    
    try {
      // Small delay to ensure any dynamic assets are ready
      await new Promise(resolve => setTimeout(resolve, 100));
      const element = invoiceRef.current;

      // For high quality A4 download
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        backgroundColor: '#fff',
        pixelRatio: 3, 
        quality: 1,
        width: pixelWidth,
        height: pixelHeight,
        canvasWidth: pixelWidth,
        canvasHeight: pixelHeight,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: mmWidth,
          height: mmHeight,
          margin: '0',
          padding: '0',
          position: 'static',
          boxShadow: 'none',
          top: '0',
          left: '0'
        },
        // Filter out problematic elements if any
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.noImage === 'true') return false;
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `${record.type === 'SALE' ? 'Invoice' : 'Purchase'}-${record.id.slice(-6).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      // Fallback: try without checking fonts if fonts were the issue
      try {
         const element = invoiceRef.current;
         if (!element) return;
         const dataUrl = await toPng(element, { 
            cacheBust: true, 
            backgroundColor: '#fff',
            pixelRatio: 2,
            quality: 1,
            skipFonts: true, 
            width: pixelWidth,
            height: pixelHeight,
            canvasWidth: pixelWidth,
            canvasHeight: pixelHeight,
            style: {
              transform: 'none',
              transformOrigin: 'top left',
              width: mmWidth,
              height: mmHeight,
              margin: '0',
              padding: '0',
              position: 'relative',
              boxShadow: 'none',
              top: '0',
              left: '0'
            }
         });
         const link = document.createElement('a');
         link.download = `${record.type === 'SALE' ? 'Invoice' : 'Purchase'}-${record.id.slice(-6).toUpperCase()}_no_fonts.png`;
         link.href = dataUrl;
         link.click();
         alert('কিছু ফন্ট ছাড়াই ছবিটি ডাউনলোড করা হয়েছে।');
      } catch (innerErr) {
         console.error('Inner error:', innerErr);
         alert('ছবি ডাউনলোড করতে সমস্যা হয়েছে। দয়াকরে স্ক্রিনশট নিন অথবা প্রিন্ট/PDF সেভ করুন।');
      }
    }
  };

  const shopName = shopSettings?.shopName || 'ডিজিটাল দোকান';
  const address = shopSettings?.shopAddress || '';
  const phone = shopSettings?.shopPhone || '';
  const description = shopSettings?.shopDescription || 'একটি আধুনিক ব্যবসায়িক সমাধান';
  const paymentMethod = shopSettings?.paymentMethod || '';
  const signatureName = shopSettings?.signatureName || shopName;
  const terms = shopSettings?.termsAndConditions || 'বিক্রিত মাল ফেরত নেওয়া হয় না। ধন্যবাদ আবার আসবেন।';
  
  // Custom Colors from reference image
  const Navy = '#002D5B';
  const Magenta = '#9b216c';

  // Calculations
  const subTotal = record.items?.reduce((acc, i) => acc + (i.quantity * i.price), 0) || 0;
  const itemDiscounts = record.items?.reduce((acc, i) => acc + (i.discount || 0), 0) || 0;
  const baseForGlobalDiscount = subTotal - itemDiscounts;
  const globalDiscount = record.discountType === 'PERCENT' 
    ? (baseForGlobalDiscount * (record.discount || 0) / 100) 
    : (record.discount || 0);
  const totalDiscount = itemDiscounts + globalDiscount;

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-[200] flex flex-col items-center backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto no-scrollbar py-10 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Floating Action Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 px-4 print:hidden sticky top-4 z-[210]">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-3 bg-white shadow-xl text-gray-700 rounded-full hover:bg-gray-100 transition-all transform hover:scale-110 active:scale-90"
          >
            <X size={24} />
          </button>
          {isUploadingToDrive && (
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl border border-blue-100 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="relative w-6 h-6">
                 <svg className="w-full h-full -rotate-90">
                   <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-gray-100" />
                   <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-blue-500 transition-all duration-500" 
                     style={{ strokeDasharray: 62.8, strokeDashoffset: 62.8 - (62.8 * uploadProgress / 100) }} />
                 </svg>
                 {uploadProgress === 100 && <div className="absolute inset-0 flex items-center justify-center text-green-500"><Cloud size={14} /></div>}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                 {uploadProgress === 100 ? 'ড্রাইভে সেভ হয়েছে' : 'ড্রাইভে আপলোড হচ্ছে...'}
               </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={downloadImage}
            className="flex items-center gap-2 text-white px-6 py-2.5 rounded-full font-black text-sm shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
            style={{ backgroundColor: Magenta }}
          >
            <ImageIcon size={18} /> ছবি ডাউনলোড
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 text-white px-6 py-2.5 rounded-full font-black text-sm shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
            style={{ backgroundColor: Navy }}
          >
            <Printer size={18} /> প্রিন্ট / PDF
          </button>
        </div>
      </div>

      {/* The Actual Invoice Card - A4 Dimensions */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-0 print:p-0 w-full print:block">
        <div 
          ref={invoiceRef}
          id="invoice-content" 
          className="print:shadow-none flex-shrink-0 flex flex-col relative print:static overflow-visible"
          style={{ 
            width: '210mm', 
            height: `${297 * numPages}mm`,
            minHeight: `${297 * numPages}mm`,
            backgroundColor: 'transparent',
          }}
        >
          {/* PAGE 1 */}
          <div 
            className="bg-white shadow-2xl print:shadow-none flex-shrink-0 flex flex-col relative print:static overflow-hidden invoice-page mb-6 print:mb-0"
            style={{
              width: '210mm',
              height: '297mm',
              minHeight: '297mm',
            }}
          >
            {/* HEADER SECTION WITH MODERN SHAPES */}
            <div className={`relative ${pageOneStyles.headerHeight} w-full overflow-hidden shrink-0 transition-all duration-300`}>
              <div className="absolute inset-0 z-0" style={{ backgroundColor: Navy }} />
              <div 
                className="absolute left-0 top-0 h-full w-[45%] z-10"
                style={{ 
                  backgroundColor: Magenta,
                  clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)',
                }}
              />
   
              <div className="relative z-20 h-full w-full flex justify-between items-center px-12 pt-2">
                 <div className="flex items-center gap-8">
                    {shopSettings?.shopLogo ? (
                      <DriveImage src={shopSettings.shopLogo} className={`${pageOneStyles.logoSize} bg-white rounded-full object-cover shadow-2xl border-4 border-white transition-all`} alt="Logo" token={googleAccessToken} />
                    ) : (
                      <div className={`${pageOneStyles.logoSize} bg-white rounded-full flex items-center justify-center text-gray-900 font-black shadow-2xl border-4 border-white transition-all`}>
                        {shopName[0]}
                      </div>
                    )}
                    <div className="text-white">
                      <h1 className={`${pageOneStyles.shopNameText} font-black tracking-tight leading-none mb-1 uppercase transition-all`}>{shopName}</h1>
                      <p className={`${pageOneStyles.shopDescText} font-bold opacity-90 tracking-[0.2em] transition-all`}>{description}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* CUSTOMER & DATE SUMMARY BAR */}
            <div className={`${pageOneStyles.customerPadding} flex justify-between items-start transition-all`}>
              <div className="space-y-4">
                 <div>
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoice To:</p>
                    <h3 className={`${pageOneStyles.customerNameText} font-black tracking-tighter transition-all`} style={{ color: Magenta }}>{record.customerName || 'গেস্ট কাস্টমার'}</h3>
                 </div>
                 
                 <div className="space-y-2">
                   {record.customerPhone && (
                     <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                       <Phone size={14} style={{ color: Magenta }} /> {record.customerPhone}
                     </div>
                   )}
                   {(record as any).customerAddress && (
                     <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                       <MapPin size={14} style={{ color: Magenta }} /> {(record as any).customerAddress}
                     </div>
                   )}
                 </div>
              </div>

              <div className="text-right space-y-4">
                 <div>
                    <p className={`${pageOneStyles.customerLabelText} font-black text-gray-400 uppercase tracking-widest leading-none mb-1`}>Invoice No :</p>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tighter transition-all">#{record.id.slice(-6).toUpperCase()}</h4>
                    <div className="h-2 w-16 bg-gray-900 ml-auto mt-2" />
                 </div>
                 <div>
                    <p className={`${pageOneStyles.customerLabelText} font-black text-gray-400 uppercase tracking-widest leading-none mb-1`}>Invoice Date :</p>
                    <h4 className="text-lg font-black text-gray-700 tracking-tighter transition-all">{record.date}</h4>
                 </div>
              </div>
            </div>

            {/* TABLE SECTION */}
            <div className={`px-12 ${pageOneStyles.tableMargin} flex-1 overflow-hidden`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-white">
                    <th className={`${pageOneStyles.tableHeaderPadding} rounded-l-3xl uppercase tracking-widest w-[40%] transition-all`} style={{ backgroundColor: Magenta }}>Description</th>
                    <th className={`${pageOneStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Qty</th>
                    <th className={`${pageOneStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Price</th>
                    <th className={`${pageOneStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Discount</th>
                    <th className={`${pageOneStyles.tableHeaderPadding} rounded-r-3xl text-right transition-all`} style={{ backgroundColor: Navy }}>Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pageOneItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className={`${pageOneStyles.tabCellPadding} transition-all`}>
                        <div className={`font-black text-gray-900 ${pageOneStyles.itemTitleText} mb-0.5`}>{item.name}</div>
                        {item.selectedSerials && item.selectedSerials.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.selectedSerials.map((sn, sidx) => (
                              <span key={sidx} className="text-[8px] font-black text-gray-400 bg-white border border-gray-200 px-1 py-0.2 rounded">
                                SN: {sn}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`${pageOneStyles.tabCellPadding} text-center font-bold text-gray-600 ${pageOneStyles.itemTextSize} tabular-nums transition-all`}>{item.quantity}</td>
                      <td className={`${pageOneStyles.tabCellPadding} text-center font-bold text-gray-600 ${pageOneStyles.itemTextSize} tabular-nums transition-all`}>৳{item.price.toLocaleString('bn-BD')}</td>
                      <td className={`${pageOneStyles.tabCellPadding} text-center font-black text-red-500 ${pageOneStyles.itemTextSize} tabular-nums transition-all`}>
                        {item.discount && item.discount > 0 ? `-৳${item.discount.toLocaleString('bn-BD')}` : '—'}
                      </td>
                      <td className={`${pageOneStyles.tabCellPadding} text-right font-black text-gray-900 ${pageOneStyles.itemTitleText} tabular-nums transition-all`}>
                        ৳{((item.quantity * item.price) - (item.discount || 0)).toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  ))}
                  
                  {pageOneItems.length < 3 && Array.from({ length: 3 - pageOneItems.length }).map((_, i) => (
                     <tr key={`empty-${i}`} className="h-12 border-none"><td colSpan={5}></td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGE 1 FOOTER: IF MULTIPAGE, SHOW "CONTINUED" AND BOTTOM SHAPES */}
            {itemCount > 20 ? (
              <div className="px-12 pb-4 mt-auto shrink-0 space-y-4">
                <div className="py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex justify-between items-center px-6 text-xs text-gray-500 font-bold">
                  <span>* মোট আইটেম: {itemCount} টি</span>
                  <span className="text-orange-600 font-black animate-pulse">চলবে... পরবর্তী পৃষ্ঠা দেখুন (পাতা ১/২)</span>
                </div>
                {/* BOTTOM DECORATIVE SHAPES PAGE 1 */}
                <div className="relative h-14 w-full overflow-hidden shrink-0 -mx-12" style={{ width: 'calc(100% + 96px)' }}>
                  <div 
                     className="absolute inset-0 z-0 h-full" 
                     style={{ 
                       backgroundColor: Navy,
                       clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)'
                     }} 
                  />
                  <div 
                     className="absolute inset-0 z-10 translate-y-4" 
                     style={{ 
                       backgroundColor: Magenta,
                       clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%)'
                     }} 
                  />
                </div>
              </div>
            ) : (
              /* Standard single-page Footer */
              <>
                <div className={`px-12 ${pageOneStyles.footerPadding} mt-auto shrink-0`}>
                  <div className={`grid grid-cols-2 ${pageOneStyles.footerGridGap} transition-all`}>
                    <div className="space-y-4">
                      <div>
                         <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-2">Seller Info :</h5>
                         <div className={`text-[10px] font-bold text-gray-600 border-l-4 border-gray-100 pl-4 space-y-0.5 ${pageOneStyles.sellerInfoMargin} transition-all`}>
                            <p className="text-gray-900 font-black">{shopName}</p>
                            {address && <p>{address}</p>}
                            {phone && <p>Phone: {phone}</p>}
                         </div>

                         <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Payment Method :</h5>
                         <p className="text-xs font-bold text-gray-500 border-l-4 border-gray-100 pl-4 whitespace-pre-line leading-relaxed">
                           {paymentMethod || 'নগদ / বিকাশ / ব্যাংক'}
                         </p>
                      </div>

                      {itemCount <= 12 && (
                        <div>
                          <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Term and Conditions</h5>
                          <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic border-l-4 border-gray-100 pl-4">
                            {terms}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end transition-all">
                      <div className="w-full space-y-2">
                         <div className="flex justify-between items-center text-sm font-bold text-gray-500 px-4">
                            <span>Sub-total :</span>
                            <span>৳{subTotal.toLocaleString('bn-BD')}</span>
                         </div>
                         {totalDiscount > 0 && (
                           <div className="flex justify-between items-center text-sm font-bold text-red-500 px-4">
                              <span>Discount :</span>
                              <span>- ৳{totalDiscount.toLocaleString('bn-BD')}</span>
                           </div>
                         )}
                      </div>

                      {/* THE BLUE TOTAL CALLOUT BOX */}
                      <div 
                        className={`w-full ${pageOneStyles.totalBoxHeight} flex items-center justify-between text-white shadow-2xl relative overflow-hidden shrink-0 transition-all`}
                        style={{ 
                          backgroundColor: Navy,
                          clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)',
                          borderRadius: '0 0 40px 0'
                        }}
                      >
                         <span className={`${pageOneStyles.totalBoxLabel} font-black tracking-widest uppercase opacity-90 transition-all`}>Total :</span>
                         <span className={`${pageOneStyles.totalBoxValue} font-black tracking-tighter transition-all`}>৳{record.amount.toLocaleString('bn-BD')}</span>
                      </div>
                      
                      <div className="w-full flex justify-between px-4 text-[11px] font-black uppercase tracking-widest mt-1">
                         <span className="text-green-600">Paid: ৳{(record.paidAmount || 0).toLocaleString('bn-BD')}</span>
                         <span className="text-red-500">Due: ৳{(record.dueAmount || 0).toLocaleString('bn-BD')}</span>
                      </div>

                      <div className={`${pageOneStyles.signaturePt} w-full flex justify-end transition-all`}>
                         <div className={`text-center ${pageOneStyles.signatureWidth}`}>
                            <div className={`${pageOneStyles.signatureLineMargin} italic text-3xl text-gray-400 opacity-60 transition-all`} style={{ fontFamily: '"Dancing Script", cursive' }}>Signature</div>
                            <div className="h-0.5 w-full bg-gray-900 mb-2" />
                            <p className={`${pageOneStyles.signatureText} font-black uppercase tracking-[0.2em]`}>{signatureName}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Authorized Person</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM DECORATIVE SHAPES PAGE 1 */}
                <div className="relative h-14 w-full mt-auto overflow-hidden shrink-0">
                  <div 
                     className="absolute inset-0 z-0 h-full" 
                     style={{ 
                       backgroundColor: Navy,
                       clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)'
                     }} 
                  />
                  <div 
                     className="absolute inset-0 z-10 translate-y-4" 
                     style={{ 
                       backgroundColor: Magenta,
                       clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%)'
                     }} 
                  />
                </div>
              </>
            )}
          </div>

          {/* PAGE 2 */}
          {itemCount > 20 && (
            <div 
              className="bg-white shadow-2xl print:shadow-none flex-shrink-0 flex flex-col relative print:static overflow-hidden invoice-page mb-6 print:mb-0"
              style={{ 
                width: '210mm', 
                height: '297mm',
                minHeight: '297mm',
              }}
            >
              {/* Mini Header for Page 2 */}
              <div className="relative h-16 w-full overflow-hidden shrink-0" style={{ backgroundColor: Navy }}>
                <div 
                  className="absolute left-0 top-0 h-full w-[40%] z-10"
                  style={{ 
                    backgroundColor: Magenta,
                    clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)',
                  }}
                />
                <div className="relative z-20 h-full w-full flex justify-between items-center px-12 text-white">
                  <div className="flex items-center gap-4">
                     {shopSettings?.shopLogo ? (
                       <DriveImage src={shopSettings.shopLogo} className="w-8 h-8 bg-white rounded-full object-cover shadow border-2 border-white" alt="Logo" token={googleAccessToken} />
                     ) : (
                       <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 font-black text-xs">
                         {shopName[0]}
                       </div>
                     )}
                     <div>
                       <h1 className="text-sm font-black tracking-tight leading-none mb-0.5 uppercase">{shopName}</h1>
                       <p className="text-[7px] font-bold opacity-90 tracking-widest leading-none">{description}</p>
                     </div>
                  </div>
                  <div className="text-right text-[10px] font-bold opacity-90 uppercase tracking-wider">
                     Invoice: #{record.id.slice(-6).toUpperCase()} | পৃষ্ঠা - ২
                  </div>
                </div>
              </div>

              {/* Minimal Customer & Invoice Bar */}
              <div className="px-12 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-xs font-bold text-gray-600">
                <div>গ্রাহক: <span className="text-gray-900 font-extrabold">{record.customerName || 'গেস্ট কাস্টমার'}</span> {record.customerPhone && `(${record.customerPhone})`}</div>
                <div>তারিখ: {record.date}</div>
              </div>

              {/* TABLE SECTION PAGE 2 */}
              <div className={`px-12 ${pageTwoStyles.tableMargin} flex-1 overflow-hidden`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-white">
                      <th className={`${pageTwoStyles.tableHeaderPadding} rounded-l-3xl uppercase tracking-widest w-[40%] transition-all`} style={{ backgroundColor: Magenta }}>Description</th>
                      <th className={`${pageTwoStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Qty</th>
                      <th className={`${pageTwoStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Price</th>
                      <th className={`${pageTwoStyles.tableHeaderPadding} text-center transition-all`} style={{ backgroundColor: Magenta }}>Discount</th>
                      <th className={`${pageTwoStyles.tableHeaderPadding} rounded-r-3xl text-right transition-all`} style={{ backgroundColor: Navy }}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {items.slice(20, 40).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className={`${pageTwoStyles.tabCellPadding} transition-all`}>
                          <div className={`font-black text-gray-900 ${pageTwoStyles.itemTitleText} mb-0.5`}>{item.name}</div>
                          {item.selectedSerials && item.selectedSerials.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.selectedSerials.map((sn, sidx) => (
                                <span key={sidx} className="text-[8px] font-black text-gray-400 bg-white border border-gray-200 px-1 py-0.2 rounded">
                                  SN: {sn}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={`${pageTwoStyles.tabCellPadding} text-center font-bold text-gray-600 ${pageTwoStyles.itemTextSize} tabular-nums transition-all`}>{item.quantity}</td>
                        <td className={`${pageTwoStyles.tabCellPadding} text-center font-bold text-gray-600 ${pageTwoStyles.itemTextSize} tabular-nums transition-all`}>৳{item.price.toLocaleString('bn-BD')}</td>
                        <td className={`${pageTwoStyles.tabCellPadding} text-center font-black text-red-500 ${pageTwoStyles.itemTextSize} tabular-nums transition-all`}>
                          {item.discount && item.discount > 0 ? `-৳${item.discount.toLocaleString('bn-BD')}` : '—'}
                        </td>
                        <td className={`${pageTwoStyles.tabCellPadding} text-right font-black text-gray-900 ${pageTwoStyles.itemTitleText} tabular-nums transition-all`}>
                          ৳{((item.quantity * item.price) - (item.discount || 0)).toLocaleString('bn-BD')}
                        </td>
                      </tr>
                    ))}
                    
                    {items.slice(20, 40).length < 3 && Array.from({ length: 3 - items.slice(20, 40).length }).map((_, i) => (
                       <tr key={`empty-${i}`} className="h-12 border-none"><td colSpan={5}></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TOTALS SECTION ON PAGE 2 */}
              <div className={`px-12 ${pageTwoStyles.footerPadding} mt-auto shrink-0`}>
                <div className={`grid grid-cols-2 ${pageTwoStyles.footerGridGap} transition-all`}>
                  <div className="space-y-4">
                    <div>
                       <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-2">Seller Info :</h5>
                       <div className={`text-[10px] font-bold text-gray-600 border-l-4 border-gray-100 pl-4 space-y-0.5 ${pageTwoStyles.sellerInfoMargin} transition-all`}>
                          <p className="text-gray-900 font-black">{shopName}</p>
                          {address && <p>{address}</p>}
                          {phone && <p>Phone: {phone}</p>}
                       </div>

                       <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Payment Method :</h5>
                       <p className="text-xs font-bold text-gray-500 border-l-4 border-gray-100 pl-4 whitespace-pre-line leading-relaxed">
                         {paymentMethod || 'নগদ / বিকাশ / ব্যাংক'}
                       </p>
                    </div>

                    {items.slice(20, 40).length <= 15 && (
                      <div>
                        <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-3">Term and Conditions</h5>
                        <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic border-l-4 border-gray-100 pl-4">
                          {terms}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end transition-all">
                    <div className="w-full space-y-2">
                       <div className="flex justify-between items-center text-sm font-bold text-gray-500 px-4">
                          <span>Sub-total :</span>
                          <span>৳{subTotal.toLocaleString('bn-BD')}</span>
                       </div>
                       {totalDiscount > 0 && (
                         <div className="flex justify-between items-center text-sm font-bold text-red-500 px-4">
                            <span>Discount :</span>
                            <span>- ৳{totalDiscount.toLocaleString('bn-BD')}</span>
                         </div>
                       )}
                    </div>

                    {/* THE BLUE TOTAL CALLOUT BOX */}
                    <div 
                      className={`w-full ${pageTwoStyles.totalBoxHeight} flex items-center justify-between text-white shadow-2xl relative overflow-hidden shrink-0 transition-all`}
                      style={{ 
                        backgroundColor: Navy,
                        clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)',
                        borderRadius: '0 0 40px 0'
                      }}
                    >
                       <span className={`${pageTwoStyles.totalBoxLabel} font-black tracking-widest uppercase opacity-90 transition-all`}>Total :</span>
                       <span className={`${pageTwoStyles.totalBoxValue} font-black tracking-tighter transition-all`}>৳{record.amount.toLocaleString('bn-BD')}</span>
                    </div>
                    
                    <div className="w-full flex justify-between px-4 text-[11px] font-black uppercase tracking-widest mt-1">
                       <span className="text-green-600">Paid: ৳{(record.paidAmount || 0).toLocaleString('bn-BD')}</span>
                       <span className="text-red-500">Due: ৳{(record.dueAmount || 0).toLocaleString('bn-BD')}</span>
                    </div>

                    <div className={`${pageTwoStyles.signaturePt} w-full flex justify-end transition-all`}>
                       <div className={`text-center ${pageTwoStyles.signatureWidth}`}>
                          <div className={`${pageTwoStyles.signatureLineMargin} italic text-3xl text-gray-400 opacity-60 transition-all`} style={{ fontFamily: '"Dancing Script", cursive' }}>Signature</div>
                          <div className="h-0.5 w-full bg-gray-900 mb-2" />
                          <p className={`${pageTwoStyles.signatureText} font-black uppercase tracking-[0.2em]`}>{signatureName}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Authorized Person</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM DECORATIVE SHAPES PAGE 2 */}
              <div className="relative h-14 w-full mt-auto overflow-hidden shrink-0">
                <div 
                   className="absolute inset-0 z-0 h-full" 
                   style={{ 
                     backgroundColor: Navy,
                     clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)'
                   }} 
                />
                <div 
                   className="absolute inset-0 z-10 translate-y-4" 
                   style={{ 
                     backgroundColor: Magenta,
                     clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%)'
                   }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" crossOrigin="anonymous" />
      <style>{`
        @media screen {
          #invoice-content {
            transform: scale(0.35);
            transform-origin: top center;
          }
          @media (min-width: 400px) { #invoice-content { transform: scale(0.4); } }
          @media (min-width: 500px) { #invoice-content { transform: scale(0.5); } }
          @media (min-width: 640px) { #invoice-content { transform: scale(0.6); } }
          @media (min-width: 768px) { #invoice-content { transform: scale(0.75); } }
          @media (min-width: 1000px) { #invoice-content { transform: scale(1); } }
        }
        
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > * {
            visibility: hidden !important;
          }
          div[class*="bg-gray-900/60"] {
            background-color: transparent !important;
            visibility: visible !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
          }
          .print:hidden, button {
            display: none !important;
            visibility: hidden !important;
          }
          #invoice-content {
            visibility: visible !important;
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: 210mm !important;
            height: ${numPages * 297}mm !important;
            min-height: ${numPages * 297}mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 9999 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          #invoice-content * {
            visibility: visible !important;
          }
          .invoice-page {
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default InvoiceView;
