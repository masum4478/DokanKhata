
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, ShoppingBag, TrendingUp, Info, ChevronRight, Zap, Star } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Contact, SalePurchaseRecord } from '../types';

interface SmartRecommendationsViewProps {
  onBack: () => void;
  contact: Contact | null;
  allRecords: SalePurchaseRecord[];
  onIncrementGeminiUsage?: () => void;
}

const SmartRecommendationsView: React.FC<SmartRecommendationsViewProps> = ({ onBack, contact, allRecords, onIncrementGeminiUsage }) => {
  const [recommendations, setRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRecommendations = async () => {
      setLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      if (onIncrementGeminiUsage) onIncrementGeminiUsage();
      
      const shopHistory = allRecords
        .filter(r => r.type === 'SALE')
        .map(r => r.description)
        .join(', ');

      const customerHistory = contact 
        ? contact.transactions.map(t => t.description).join(', ') 
        : 'New Customer';

      const prompt = `
        Analyze this shop's sales data and this specific customer's purchase history to provide 3 personalized product recommendations.
        
        Shop's Recent Sales: ${shopHistory}
        Customer's Previous Items: ${customerHistory}
        Customer Name: ${contact?.name || 'Guest'}

        Provide the response in Bengali. 
        Format:
        1. **Product Name** - Reason why it's recommended.
        2. **Product Name** - Cross-sell suggestion based on history.
        3. **Product Name** - Seasonal or trending suggestion.

        Make it look professional and encouraging for a shop owner to use.
      `;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            systemInstruction: "You are an expert retail consultant in Bangladesh. You help shop owners increase sales by analyzing customer behavior and suggesting what to recommend next. Use bold text and bullet points."
          }
        });
        setRecommendations(response.text || 'কোনো তথ্য পাওয়া যায়নি।');
      } catch (error) {
        setRecommendations('সুপারিশ লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      } finally {
        setLoading(false);
      }
    };

    getRecommendations();
  }, [contact, allRecords]);

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const isListItem = line.trim().startsWith('* ') || /^\d+\./.test(line.trim());
      const content = line.replace(/^\d+\.\s*/, '').replace(/^\*\s*/, '');
      const parts = content.split(/(\*\*.*?\*\*)/g);

      if (!line.trim()) return <div key={i} className="h-2" />;

      return (
        <div key={i} className={`flex gap-3 mb-3 ${isListItem ? 'bg-white p-4 rounded-2xl shadow-sm border border-gray-100' : ''}`}>
          {isListItem && (
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg h-fit">
              <Star size={18} fill="currentColor" />
            </div>
          )}
          <div className="flex-1">
            {parts.map((part, index) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="text-purple-900 font-black">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="bg-gray-50 min-h-full flex flex-col">
      <header className="flex items-center gap-4 p-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="text-gray-600 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Sparkles size={20} />
          </div>
          <h2 className="text-lg font-bold">এআই পণ্য পরামর্শ</h2>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {contact && (
          <div className="bg-white p-4 rounded-2xl border border-purple-100 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 font-bold">
              {contact.name[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{contact.name}</h3>
              <p className="text-xs text-gray-500">পার্সোনালাইজড সাজেশন</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 px-1">
            <TrendingUp size={16} className="text-purple-500" />
            স্মার্ট এনালাইসিস ফলাফল
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
              <div className="text-center text-xs text-gray-400 animate-bounce">এআই ডাটা বিশ্লেষণ করছে...</div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {renderContent(recommendations)}
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
          <Info size={20} className="text-blue-500 shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            এই পরামর্শগুলো আপনার গত কয়েক দিনের **বেচা-কেনা** এবং এই কাস্টমারের **লেনদেন** বিশ্লেষণ করে তৈরি করা হয়েছে। এটি ব্যবসা বাড়াতে সহায়ক হতে পারে।
          </p>
        </div>
      </div>
      
      <div className="mt-auto p-4">
        <button 
          onClick={onBack}
          className="w-full bg-purple-600 text-white p-4 rounded-full font-bold shadow-lg shadow-purple-200 active:scale-95 transition-all"
        >
          বুঝেছি
        </button>
      </div>
    </div>
  );
};

export default SmartRecommendationsView;
