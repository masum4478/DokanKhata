
import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Eye, 
  RefreshCw, 
  ChevronRight, 
  Calendar,
  FileText
} from 'lucide-react';

const CashboxView: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-full">
      {/* Top Header Stats */}
      <div className="bg-white p-4 border-b border-gray-100 mb-2">
        <div className="flex justify-around text-center mb-6">
          <div className="flex-1 border-r border-gray-100">
            <div className="text-xl font-bold">০</div>
            <div className="text-xs text-gray-500 mt-1">আজকের বিক্রি</div>
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold">৩২,২৩০</div>
            <div className="text-xs text-gray-500 mt-1">বর্তমান ক্যাশ</div>
          </div>
        </div>

        <div className="flex justify-around text-center">
          <div className="flex-1 border-r border-gray-100">
            <div className="text-sm font-bold text-green-600">আজ পেলাম ০</div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-[#D32F2F]">আজ দিলাম ০</div>
          </div>
        </div>
      </div>

      {/* Buttons Bar */}
      <div className="p-4 flex gap-2">
        <button className="flex-1 bg-yellow-100 text-gray-800 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
          <FileText size={18} /> রিপোর্ট
        </button>
        <button className="p-2 bg-gray-100 rounded-lg text-gray-600"><RefreshCw size={20} /></button>
        <button className="px-4 bg-gray-100 rounded-lg text-gray-600 font-medium flex items-center gap-2">
          বিক্রি হিসাব মিলাই
        </button>
        <button className="p-2 bg-gray-100 rounded-lg text-gray-600"><Eye size={20} /></button>
      </div>

      {/* Alert Overlay Mimic */}
      <div className="mx-4 mb-4 relative">
        <div className="bg-[#FF8A3D] text-white p-3 rounded-xl shadow-md text-sm text-center">
          গতকাল দিনশেষে বিক্রি হিসাব মিলানো হয়নি।
          <div className="flex justify-center gap-4 mt-2">
            <button className="underline font-bold">মিলাবো না</button>
            <button className="bg-white/20 px-3 py-1 rounded-full font-bold">মিলাতে চাই</button>
          </div>
        </div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FF8A3D] rotate-45"></div>
      </div>

      {/* Category List */}
      <div className="bg-white">
        {[
          { label: 'ক্যাশ বেচা', value: '০.০০', color: 'green', icon: ArrowDownRight },
          { label: 'ক্যাশ কেনা', value: '০.০০', color: 'red', icon: ArrowUpRight },
          { label: 'খরচ', value: '০.০০', color: 'red', icon: ArrowUpRight },
          { label: 'মালিক দিল', value: '০.০০', color: 'green', icon: ArrowDownRight },
          { label: 'মালিক নিল', value: '০.০০', color: 'red', icon: ArrowUpRight },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              item.color === 'green' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <item.icon size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{item.label}</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${item.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                {item.value}
              </span>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CashboxView;
