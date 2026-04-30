
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles, Bot, TrendingUp, Info, Zap, ShoppingBag, Globe, ExternalLink, History, Trash2, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Contact, SalePurchaseRecord } from '../types';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  role: 'user' | 'ai';
  text: string;
  sources?: GroundingChunk[];
}

const FormattedText: React.FC<{ text: string; isAi: boolean }> = ({ text, isAi }) => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <div key={i} className="h-2" />;

        const isBullet = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
        const content = isBullet ? trimmedLine.substring(2) : line;

        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className={`font-black ${isAi ? 'text-purple-900' : 'text-white'}`}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        return (
          <div key={i} className={`${isBullet ? 'pl-4 flex gap-2' : ''}`}>
            {isBullet && <span className={`${isAi ? 'text-purple-500' : 'text-purple-200'} font-bold`}>•</span>}
            <span className="leading-relaxed">{renderedParts}</span>
          </div>
        );
      })}
    </div>
  );
};

interface AIChatViewProps {
  onBack: () => void;
  contacts: Contact[];
  records: SalePurchaseRecord[];
  persistedMessages: Message[];
  onMessagesUpdate: (msgs: Message[]) => void;
  onClearChat: () => void;
  onSendReminders: (targetContacts?: Contact[]) => void;
  onSendInvitations: (targetContacts?: Contact[]) => void;
  onIncrementGeminiUsage?: () => void;
}

const AIChatView: React.FC<AIChatViewProps> = ({ onBack, contacts, records, persistedMessages, onMessagesUpdate, onClearChat, onSendReminders, onSendInvitations, onIncrementGeminiUsage }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentQueries: string[] = Array.from(new Set<string>(
    persistedMessages
      .filter(m => m.role === 'user')
      .map(m => m.text)
  )).reverse().slice(0, 5);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [persistedMessages, isTyping]);

  const generateAIResponse = async (userInput: string) => {
    setIsTyping(true);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    if (onIncrementGeminiUsage) onIncrementGeminiUsage();
    
    const receivable = contacts.reduce((acc, curr) => curr.balance > 0 ? acc + curr.balance : acc, 0);
    const payable = Math.abs(contacts.reduce((acc, curr) => curr.balance < 0 ? acc + curr.balance : acc, 0));
    const totalSales = records.filter(r => r.type === 'SALE').reduce((acc, curr) => acc + curr.amount, 0);

    const context = `Context: Rec=${receivable}, Pay=${payable}, Sales=${totalSales}. User: ${userInput}`;

    // Special handling for invitation requests
    if (userInput.includes('আমন্ত্রণ') || userInput.includes('invitation')) {
      const zeroBalance = contacts.filter(c => c.type === 'CUSTOMER' && c.balance <= 0);
      if (zeroBalance.length > 0) {
        onSendInvitations(zeroBalance);
        setIsTyping(false);
        return;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: context,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are a business AI assistant for Bangladeshi shop owners. Respond in professional Bengali. Use bold text for key insights.
          If you suggest sending reminders, use the phrase "রিমাইন্ডার পাঠাব" so the system can show a button.`
        }
      });
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      onMessagesUpdate([...persistedMessages, { role: 'user', text: userInput }, { 
        role: 'ai', 
        text: response.text || 'দুঃখিত, তথ্য পাওয়া যায়নি।',
        sources: groundingChunks
      }]);
    } catch (error) {
      onMessagesUpdate([...persistedMessages, { role: 'user', text: userInput }, { role: 'ai', text: 'সার্ভারে সমস্যা হয়েছে।' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    onMessagesUpdate([...persistedMessages, { role: 'user', text: userMsg }]);
    setInput('');
    generateAIResponse(userMsg);
  };

  const handleClear = () => {
    if (confirm('চ্যাট হিস্ট্রি মুছে ফেলতে চান?')) onClearChat();
  };

  return (
    <div className="bg-gray-50 min-h-full flex flex-col h-[calc(100vh-64px)]">
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-600 active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-purple-600" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">এআই অ্যাসিস্ট্যান্ট</h2>
          </div>
        </div>
        <button onClick={handleClear} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={20} /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {persistedMessages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl text-[13px] shadow-sm ${
              m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 border border-gray-100'
            }`}>
              <FormattedText text={m.text} isAi={m.role === 'ai'} />
              {m.role === 'ai' && (m.text.includes('রিমাইন্ডার পাঠাব') || m.text.includes('মজার রিমাইন্ডার')) && (
                <button 
                  onClick={() => {
                    if (m.text.includes('এক সপ্তাহ')) {
                      // Filter for weekly pending ones
                      const today = new Date();
                      const pending = contacts.filter(c => {
                        if (c.type !== 'CUSTOMER' || c.balance <= 0) return false;
                        if (!c.lastReminderDate) return true;
                        const lastDate = new Date(c.lastReminderDate);
                        return (today.getTime() - lastDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
                      });
                      onSendReminders(pending);
                    } else {
                      onSendReminders();
                    }
                  }}
                  className="mt-3 w-full bg-purple-600 text-white py-2 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <Zap size={16} /> এখনই পাঠান
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-[10px] text-gray-400 font-black animate-pulse uppercase tracking-widest p-2">এআই চিন্তা করছে...</div>}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 space-y-3 sticky bottom-0">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="কিছু লিখুন..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:border-purple-600 focus:ring-4 focus:ring-purple-50 outline-none transition-all shadow-sm placeholder:text-gray-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`p-4 rounded-2xl shadow-lg active:scale-90 transition-all ${
              !input.trim() || isTyping ? 'bg-gray-300' : 'bg-purple-600 text-white shadow-purple-100'
            }`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatView;
