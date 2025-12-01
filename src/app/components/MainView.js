'use client' // 这句让它变成能互动的组件
import { useState } from 'react';
import { Search, Zap, Star, User, Cookie } from 'lucide-react';
import VoteControl from './VoteControl';

export default function MainView({ initialChips }) {
  const [searchTerm, setSearchTerm] = useState(''); // 搜索词
  const [activeTab, setActiveTab] = useState('admin'); // 'admin'(青蛙榜) 或 'public'(大众榜)

  // 1. 先进行过滤（搜索功能）
  const filteredChips = initialChips.filter(chip => 
    chip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chip.description && chip.description.includes(searchTerm)) || 
    (chip.brand && chip.brand.includes(searchTerm))
  );

  // 2. 再进行排序（榜单切换逻辑）
  const sortedChips = [...filteredChips].sort((a, b) => {
    if (activeTab === 'admin') {
      // 青蛙榜：只按你的打分降序
      return b.admin_rating - a.admin_rating; 
    } else {
      // 大众榜：这里暂时按随机生成的voteCount排序（等你有了真实用户数据再换成真实平均分）
      // 我们在 page.js 里可以暂时给数据加上假的 vote_count，或者先按 ID 排
      return (b.user_votes || 0) - (a.user_votes || 0);
    }
  });

  return (
    <div className="min-h-screen text-gray-800 font-sans pb-10 bg-[#DAE0E6]">
      {/* --- 顶部导航栏 (搜索功能在这里生效) --- */}
      <nav className="sticky top-0 z-50 bg-white h-12 border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setActiveTab('admin')}>
          <div className="bg-orange-500 rounded-full p-1">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg hidden sm:block">Zageh's Chips</span>
        </div>
        
        {/* 搜索框 */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative group">
            <Search className="absolute left-3 top-2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="🔍 搜名字、品牌、口味..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // 这里让搜索生效！
              className="w-full bg-gray-100 hover:bg-white border border-transparent hover:border-blue-500 rounded-full py-1.5 pl-10 pr-4 transition-all"
            />
          </div>
        </div>
        
        <button onClick={()=> alert("登录系统正在施工中...请找Zageh催更！")} className="px-4 py-1 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 text-sm">
            登录 / 注册
        </button>
      </nav>

      {/* --- 榜单切换按钮 --- */}
      <div className="max-w-[1024px] mx-auto pt-6 px-4">
         <div className="flex gap-4 mb-4 border-b border-gray-300 pb-2">
            <button 
                onClick={() => setActiveTab('admin')}
                className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${activeTab==='admin' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                🐸 青蛙推荐榜 <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full text-orange-800">Admin</span>
            </button>
            <button 
                onClick={() => setActiveTab('public')}
                className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${activeTab==='public' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                👥 大众口碑榜 <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-full text-blue-800">Top Rated</span>
            </button>
         </div>

         {/* --- 列表循环 --- */}
        <div className="space-y-3 max-w-[800px] mx-auto">
          {sortedChips.map((chip, index) => (
            <div key={chip.id} className="bg-white rounded border border-gray-300 flex hover:border-gray-400 transition-all shadow-sm overflow-hidden group">
              
              {/* === 左侧：打分系统 (解决了问题3) === */}
              {/* 现在把原来的VoteControl简单集成在这里，之后登录功能做好再抽离 */}
              <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0">
                  <div className="text-xs font-bold text-gray-400 mb-1">大众分</div>
                  
                  {/* 这里是五星/五包薯片打分入口 */}
                  <div className="mt-2 group/rating relative flex flex-col items-center">
                    <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                        <Star size={20} fill="currentColor" className="text-gray-300 group-hover/rating:text-yellow-400"/>
                    </button>
                    <span className="text-[10px] text-gray-400">点我也没用</span>
                  </div>
              </div>

              {/* 内容区 */}
              <div className="p-4 flex gap-5 w-full bg-white relative">
                
                {/* 排名序号 */}
                <div className="absolute top-2 right-4 text-4xl font-black text-gray-100 -z-0">
                    #{index + 1}
                </div>

                {/* 图片 */}
                <div className="relative z-10 shrink-0">
                    {chip.image_url ? (
                    <img src={chip.image_url} alt={chip.name} className="w-24 h-32 object-cover rounded shadow-sm border border-gray-200" />
                    ) : (
                    <div className="w-24 h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">无图</div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0 z-10">
                  {/* 品牌 & 你的打分 (解决问题4) */}
                  <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        <span className="font-bold text-gray-600 flex items-center gap-1"><Cookie size={12}/> {chip.brand || "未知品牌"}</span>
                      </div>
                      
                      {/* === 你的显眼打分 === */}
                      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold border border-green-200 shadow-sm" title="Zageh的评分">
                        🐸 {chip.admin_rating}
                      </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3 truncate pr-8">{chip.name}</h3>
                  
                  {/* 你的评价 */}
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic relative mb-3">
                    <span className="text-gray-300 absolute top-[-5px] left-1 text-2xl font-serif">“</span>
                    {chip.description}
                  </div>
                </div>
              </div>
              
              {/* 底部交互条 (解决问题6的基础) */}
              <div className="flex flex-col border-l border-gray-100 w-12 items-center py-4 gap-4 bg-gray-50 text-gray-400 text-xs">
                 <button title="评论 (施工中)" className="hover:text-blue-500"><i className="lucide-message-square"></i>💬</button>
                 <button title="收藏" className="hover:text-yellow-500">⭐</button>
                 <button title="分享" className="hover:text-green-500">🔗</button>
              </div>
            </div>
          ))}
          
          {(!sortedChips || sortedChips.length === 0) && (
             <div className="text-center p-10 bg-white rounded border border-gray-200">
                <p className="text-gray-500">没找到名叫 “{searchTerm}” 的薯片...</p>
                <p className="text-sm text-gray-400 mt-2">（试试去许愿池让Zageh买一包？）</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}