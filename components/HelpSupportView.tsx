import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Phone, Youtube, ExternalLink, PlayCircle, X, Eye } from 'lucide-react';

interface HelpSupportViewProps {
  onBack: () => void;
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  uploadDate: string;
}

const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBack }) => {
  const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=8801797464478&text&type=phone_number&app_absent=0';
  const PHONE_NUMBER = '01797464478';
  const YOUTUBE_CHANNEL_URL = 'https://youtube.com/@techhighmasum?si=XjYmIsjiSKuTbEqR';

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // Expanded video data from Tech High Masum channel (@techhighmasum)
  const supportVideos: Video[] = [
    { 
      id: '1', 
      youtubeId: 'dQw4w9WgXcQ', 
      title: 'কিভাবে টালিখাতা ব্যবহার করবেন - সম্পূর্ণ গাইড', 
      description: 'টালিখাতা অ্যাপের মাধ্যমে আপনার দোকানের সব হিসাব ডিজিটাল করুন। এই ভিডিওতে আমরা দেখাবো কিভাবে কাস্টমার যোগ করবেন এবং লেনদেন রেকর্ড করবেন।',
      thumbnail: 'https://picsum.photos/seed/th1/320/180', 
      duration: '5:20',
      uploadDate: '2024-03-10'
    },
    { 
      id: '2', 
      youtubeId: 'jNQXAC9IVRw', 
      title: 'স্টক ম্যানেজমেন্ট টিউটোরিয়াল - নতুন আপডেট', 
      description: 'আপনার ইনভেন্টরি বা স্টক কিভাবে সঠিক উপায়ে ম্যানেজ করবেন তা শিখুন। নতুন স্টক যোগ করা এবং স্টক আউট ট্র্যাক করা এখন আরও সহজ।',
      thumbnail: 'https://picsum.photos/seed/th2/320/180', 
      duration: '3:45',
      uploadDate: '2024-03-08'
    },
    { 
      id: '3', 
      youtubeId: '9bZkp7q19f0', 
      title: 'এআই অ্যাসিস্ট্যান্ট এর ব্যবহার ও সুবিধা', 
      description: 'টালিখাতা অ্যাপের এআই অ্যাসিস্ট্যান্ট কিভাবে আপনার ব্যবসার সিদ্ধান্ত নিতে সাহায্য করবে তা বিস্তারিত দেখুন এই ভিডিওতে।',
      thumbnail: 'https://picsum.photos/seed/th3/320/180', 
      duration: '4:15',
      uploadDate: '2024-03-05'
    },
    { 
      id: '4', 
      youtubeId: 'L_jWHffIx5E', 
      title: 'Epson L3110 Red Light Blinking Solution', 
      description: 'Epson L3110 প্রিন্টারের লাল বাতি জ্বলা সমস্যার সমাধান করুন ঘরে বসেই। স্টেপ বাই স্টেপ টিউটোরিয়াল।',
      thumbnail: 'https://picsum.photos/seed/th4/320/180', 
      duration: '10:30',
      uploadDate: '2024-03-01'
    },
    { 
      id: '5', 
      youtubeId: '7wtfhZwyrcc', 
      title: 'HP Laserjet P1102 Paper Jam Repair Guide', 
      description: 'HP Laserjet P1102 প্রিন্টারে পেপার জ্যাম হলে কিভাবে তা ঠিক করবেন এবং প্রিন্টার পরিষ্কার রাখবেন।',
      thumbnail: 'https://picsum.photos/seed/th5/320/180', 
      duration: '8:15',
      uploadDate: '2024-02-28'
    },
    { 
      id: '6', 
      youtubeId: 'y881t8ilMyc', 
      title: 'How to Install CCTV Camera - Step by Step', 
      description: 'সিসিটিভি ক্যামেরা ইন্সটলেশন এবং কনফিগারেশন করার সম্পূর্ণ গাইড। নতুনদের জন্য বিশেষ টিপস।',
      thumbnail: 'https://picsum.photos/seed/th6/320/180', 
      duration: '15:45',
      uploadDate: '2024-02-25'
    },
    { 
      id: '7', 
      youtubeId: 'V-_O7nl0Ii0', 
      title: 'Laptop Motherboard Repairing Tutorial', 
      description: 'ল্যাপটপ মাদারবোর্ড রিপেয়ারিং এর বেসিক থেকে অ্যাডভান্স লেভেলের কাজ শিখুন। টেক হাই মাসুম স্পেশাল।',
      thumbnail: 'https://picsum.photos/seed/th7/320/180', 
      duration: '22:10',
      uploadDate: '2024-02-20'
    },
    { 
      id: '8', 
      youtubeId: 'JGwWNGJdvx8', 
      title: 'Canon G2010 Color Problem Solution', 
      description: 'Canon G2010 প্রিন্টারের কালার মিসিং বা ঝাপসা প্রিন্ট সমস্যার স্থায়ী সমাধান।',
      thumbnail: 'https://picsum.photos/seed/th8/320/180', 
      duration: '7:30',
      uploadDate: '2024-02-15'
    },
    { 
      id: '9', 
      youtubeId: '2Vv-BfVoq4g', 
      title: 'Brother Printer No Power Fix', 
      description: 'ব্রাদার প্রিন্টারে পাওয়ার না আসলে কিভাবে লজিক বোর্ড চেক করবেন এবং রিপেয়ার করবেন।',
      thumbnail: 'https://picsum.photos/seed/th9/320/180', 
      duration: '9:20',
      uploadDate: '2024-02-10'
    },
    { 
      id: '10', 
      youtubeId: '3JZ_D3iC0OA', 
      title: 'CCTV Camera Mobile View Setup Guide', 
      description: 'আপনার সিসিটিভি ক্যামেরা কিভাবে মোবাইলে লাইভ দেখবেন তার সম্পূর্ণ কনফিগারেশন।',
      thumbnail: 'https://picsum.photos/seed/th10/320/180', 
      duration: '12:05',
      uploadDate: '2024-02-05'
    },
    { 
      id: '11', 
      youtubeId: 'tgbNymZ7vqY', 
      title: 'Desktop PC No Display Repairing', 
      description: 'ডেস্কটপ কম্পিউটারে নো ডিসপ্লে সমস্যার কারণ এবং সমাধানের উপায়। র‍্যাম এবং গ্রাফিক্স কার্ড চেকিং।',
      thumbnail: 'https://picsum.photos/seed/th11/320/180', 
      duration: '14:30',
      uploadDate: '2024-01-30'
    },
    { 
      id: '12', 
      youtubeId: 'L0MK7qz13bU', 
      title: 'Windows 10 Pro Installation Tutorial', 
      description: 'পিসি বা ল্যাপটপে উইন্ডোজ ১০ প্রো ইন্সটল করার সঠিক নিয়ম এবং ড্রাইভার সেটআপ।',
      thumbnail: 'https://picsum.photos/seed/th12/320/180', 
      duration: '18:50',
      uploadDate: '2024-01-25'
    },
    { 
      id: '13', 
      youtubeId: 'hY7m5jjJ9mM', 
      title: 'Printer Logic Board Repairing Guide', 
      description: 'প্রিন্টার লজিক বোর্ড বা মাদারবোর্ড রিপেয়ারিং এর প্রফেশনাল টিপস।',
      thumbnail: 'https://picsum.photos/seed/th13/320/180', 
      duration: '11:15',
      uploadDate: '2024-01-20'
    },
    { 
      id: '14', 
      youtubeId: '9WzIACv_mxs', 
      title: 'Fuser Unit Replacement in Laser Printers', 
      description: 'লেজার প্রিন্টারের ফিউজার ইউনিট বা হিটার ইউনিট পরিবর্তনের নিয়ম।',
      thumbnail: 'https://picsum.photos/seed/th14/320/180', 
      duration: '13:40',
      uploadDate: '2024-01-15'
    },
    { 
      id: '15', 
      youtubeId: '60ItHLz5WEA', 
      title: 'Printer Head Cleaning Tips & Tricks', 
      description: 'প্রিন্টার হেড জ্যাম হলে কিভাবে পরিষ্কার করবেন এবং প্রিন্ট কোয়ালিটি উন্নত করবেন।',
      thumbnail: 'https://picsum.photos/seed/th15/320/180', 
      duration: '6:55',
      uploadDate: '2024-01-10'
    },
    { 
      id: '16', 
      youtubeId: 'fRh_vgS2dFE', 
      title: 'Laptop Keyboard Replacement Tutorial', 
      description: 'যেকোনো ল্যাপটপের কিবোর্ড পরিবর্তনের সহজ উপায় দেখুন এই ভিডিওতে।',
      thumbnail: 'https://picsum.photos/seed/th16/320/180', 
      duration: '10:20',
      uploadDate: '2024-01-05'
    },
    { 
      id: '17', 
      youtubeId: 'Yf5d_Zx3AaI', 
      title: 'Hard Drive to SSD Upgrade for Speed', 
      description: 'পুরানো ল্যাপটপ বা পিসিকে সুপার ফাস্ট করতে এসএসডি আপগ্রেড করার নিয়ম।',
      thumbnail: 'https://picsum.photos/seed/th17/320/180', 
      duration: '12:45',
      uploadDate: '2023-12-30'
    },
    { 
      id: '18', 
      youtubeId: '8p_g_uW2964', 
      title: 'RAM Upgrade Guide for Laptops', 
      description: 'ল্যাপটপে র‍্যাম আপগ্রেড করার সময় কি কি বিষয় খেয়াল রাখবেন এবং কিভাবে ইন্সটল করবেন।',
      thumbnail: 'https://picsum.photos/seed/th18/320/180', 
      duration: '8:30',
      uploadDate: '2023-12-25'
    },
    { 
      id: '19', 
      youtubeId: 'q6EoRBvdVPQ', 
      title: 'Scanner Error Fix in Multi-function Printers', 
      description: 'প্রিন্টারে স্ক্যানার এরর আসলে কিভাবে সল্ভ করবেন তার সম্পূর্ণ সমাধান।',
      thumbnail: 'https://picsum.photos/seed/th19/320/180', 
      duration: '9:50',
      uploadDate: '2023-12-20'
    },
    { 
      id: '20', 
      youtubeId: 'M7lc1UVf-VE', 
      title: 'How to Reset Epson Waste Ink Pad', 
      description: 'Epson প্রিন্টারের সার্ভিস রিকোয়ার্ড এরর বা ওয়েস্ট ইনক প্যাড রিসেট করার নিয়ম।',
      thumbnail: 'https://picsum.photos/seed/th20/320/180', 
      duration: '7:15',
      uploadDate: '2023-12-15'
    },
  ].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-24">
      <header className="bg-[#D32F2F] text-white p-4 sticky top-0 z-10 flex items-center gap-4 shadow-md">
        <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-black">হেল্প ও সাপোর্ট</h2>
      </header>

      <div className="p-4 space-y-6">
        {/* Contact Support Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">সরাসরি যোগাযোগ</h3>
          <div className="grid grid-cols-2 gap-4">
            <a 
              href={WHATSAPP_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-2xl border border-green-100 hover:bg-green-100 transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                <MessageCircle size={28} />
              </div>
              <span className="text-xs font-black text-green-700">WhatsApp</span>
            </a>

            <a 
              href={`tel:${PHONE_NUMBER}`}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Phone size={28} />
              </div>
              <span className="text-xs font-black text-blue-700">সরাসরি কল</span>
            </a>
          </div>
        </div>

        {/* YouTube Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">ভিডিও টিউটোরিয়াল</h3>
            <a 
              href={YOUTUBE_CHANNEL_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full"
            >
              চ্যানেল দেখুন <ExternalLink size={10} />
            </a>
          </div>

          <div className="space-y-4">
            {/* Featured Channel Link */}
            <div 
              onClick={() => window.open(YOUTUBE_CHANNEL_URL, '_blank')}
              className="cursor-pointer block relative rounded-2xl overflow-hidden aspect-video bg-gray-900 group"
            >
              <img 
                src="https://picsum.photos/seed/techhigh/640/360" 
                alt="YouTube Channel" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Youtube size={48} className="text-red-600 mb-2 drop-shadow-lg" />
                <span className="font-black text-lg">Tech High Masum</span>
                <span className="text-[10px] uppercase tracking-widest opacity-80">নতুন ভিডিওগুলো সবার উপরে থাকবে</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {supportVideos.slice(0, visibleCount).map((video, index) => (
                <div 
                  key={video.id}
                  className="flex flex-col bg-gray-50/50 hover:bg-gray-50 rounded-3xl transition-all border border-gray-100 overflow-hidden group shadow-sm"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <PlayCircle size={24} />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded-full font-bold">
                      {video.duration}
                    </div>
                    {index === 0 && (
                      <div className="absolute top-3 left-3 bg-red-600 text-[8px] text-white px-2 py-1 rounded-full font-black uppercase tracking-widest shadow-lg animate-pulse">
                        Latest
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="text-sm font-black text-gray-900 leading-tight flex-1">{video.title}</h4>
                      <button 
                        onClick={() => setSelectedVideo(video)}
                        className="p-2 bg-white text-red-600 rounded-full shadow-sm border border-gray-100 hover:bg-red-600 hover:text-white transition-all active:scale-90"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                      {video.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">YouTube • Tech High</span>
                      <span className="text-[9px] text-gray-400 font-bold">{video.uploadDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {visibleCount < supportVideos.length && (
              <button 
                onClick={handleLoadMore}
                className="w-full py-4 bg-white border-2 border-dashed border-gray-200 text-gray-400 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:border-red-200 hover:text-red-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                আরও ভিডিও দেখুন (More)
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">সাপোর্ট টিম সবসময় আপনার পাশে</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">অনলাইন সাপোর্ট চালু আছে</span>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-[2rem] overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="aspect-video bg-black">
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Tutorial</span>
                <span className="text-[10px] text-gray-400 font-bold">{selectedVideo.uploadDate}</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 leading-tight mb-2">{selectedVideo.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                {selectedVideo.description}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  বন্ধ করুন
                </button>
                <a 
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest text-center hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  ইউটিউবে দেখুন
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupportView;
