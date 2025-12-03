'use client'
import { useState, useEffect } from 'react';
import { Search, Zap, Star, Cookie } from 'lucide-react';
import supabase from '../../utils/supabase'


export default function MainView() {
  const [chips, setChips] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('admin');

  // 1. 从 Supabase 拉取数据
  useEffect(() => {
    const fetchChips = async () => {
      const { data, error } = await supabase
        .from('chipWarehouse') // 你的表名
        .select('*');
      if (error) {
        console.error(error);
      } else {
        setChips(data);
      }
    };
    fetchChips();
  }, []);

  // 2. 搜索过滤
  const filteredChips = chips.filter(chip =>
    chip.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chip.description?.includes(searchTerm) ||
    chip.brand?.includes(searchTerm)
  );

  // 3. 排序逻辑
  const sortedChips = [...filteredChips].sort((a, b) => {
    if (activeTab === 'admin') {
      return b.admin_rating - a.admin_rating;
    } else {
      return (b.user_votes || 0) - (a.user_votes || 0);
    }
  });

  return (
    <div className="min-h-screen text-gray-800 font-sans pb-10 bg-[#DAE0E6]">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white h-12 border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setActiveTab('admin')}>
          <div className="bg-orange-500 rounded-full p-1">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg hidden sm:block">Zageh's Chips</span>
        </div>
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative group">
            <Search className="absolute left-3 top-2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="🔍 搜名字、品牌、口味..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 hover:bg-white border border-transparent hover:border-blue-500 rounded-full py-1.5 pl-10 pr-4 transition-all"
            />
          </div>
        </div>
        <button onClick={()=> alert("登录系统正在施工中...")} className="px-4 py-1 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 text-sm">
            登录 / 注册
        </button>
      </nav>

      {/* 榜单切换 */}
      <div className="max-w-[1024px] mx-auto pt-6 px-4">
        <div className="flex gap-4 mb-4 border-b border-gray-300 pb-2">
          <button 
            onClick={() => setActiveTab('admin')}
            className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${activeTab==='admin' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            🐸 青蛙推荐榜
          </button>
          <button 
            onClick={() => setActiveTab('public')}
            className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${activeTab==='public' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            👥 大众口碑榜
          </button>
        </div>

        {/* 列表循环 */}
        <div className="space-y-3 max-w-[800px] mx-auto">
          {sortedChips.map((chip, index) => {
            // 处理图片 URL（如果是 Supabase Storage）
            const { data: publicUrlData } = supabase
              .storage
              .from('images')
              .getPublicUrl(chip.image_url || '');
            const imageUrl = publicUrlData?.publicUrl || chip.image_url;

            return (
              <div key={chip.id} className="bg-white rounded border border-gray-300 flex hover:border-gray-400 transition-all shadow-sm overflow-hidden group">
                <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0">
                  <div className="text-xs font-bold text-gray-400 mb-1">大众分</div>
                  <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                    <Star size={20} fill="currentColor" className="text-gray-300 hover:text-yellow-400"/>
                  </button>
                </div>
                <div className="p-4 flex gap-5 w-full bg-white relative">
                  <div className="absolute top-2 right-4 text-4xl font-black text-gray-100 -z-0">
                    #{index + 1}
                  </div>
                  <div className="relative z-10 shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt={chip.name} className="w-24 h-32 object-cover rounded shadow-sm border border-gray-200" />
                    ) : (
                      <div className="w-24 h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">无图</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 z-10">
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        <span className="font-bold text-gray-600 flex items-center gap-1"><Cookie size={12}/> {chip.brand || "未知品牌"}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold border border-green-200 shadow-sm">
                        🐸 {chip.admin_rating}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3 truncate pr-8">{chip.name}</h3>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic relative mb-3">
                      {chip.description}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
