'use client'
import supabase from '../../utils/supabase'
import { useState } from 'react'
import { Search, Zap, Cookie } from 'lucide-react'

export default function MainView({ initialChips, onDeleteSuccess }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('admin')

  const filteredChips = initialChips.filter(chip =>
    chip.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chip.description?.includes(searchTerm) ||
    chip.brand?.includes(searchTerm)
  )

  const sortedChips = [...filteredChips].sort((a, b) => {
    if (activeTab === 'admin') {
      return b.admin_rating - a.admin_rating
    } else {
      return (b.user_votes || 0) - (a.user_votes || 0)
    }
  })

  // 删除逻辑（带确认）
  async function handleDelete(id, name) {
    // 检查用户是否已登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('请先登录 🐸🍟')
      return
    }

    const confirmDelete = window.confirm(`确定要删除 ${name} 吗？🐸🍟`)
    if (!confirmDelete) return

    const { error } = await supabase
      .from('chipWarehouse')
      .delete()
      .eq('id', id)

    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      alert('删除成功!')
      if (onDeleteSuccess) onDeleteSuccess()
    }
  }

  return (
    <div className="min-h-screen text-gray-800 font-sans pb-10 bg-[#DAE0E6]">
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 z-50 bg-white h-12 border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('admin')}>
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
          <button
            onClick={() => window.location.href = '/login'}
              className="px-4 py-1 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 text-sm"
          >
            登录 / 注册
          </button>

      </nav>

      

      {/* 榜单切换 */}
      <div className="max-w-[1024px] mx-auto pt-6 px-4">
        <div className="flex gap-4 mb-4 border-b border-gray-300 pb-2">
          <button
            onClick={() => setActiveTab('admin')}
            className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🐸 青蛙推荐榜
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'public'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 大众口碑榜
          </button>
        </div>

        {/* 列表循环 */}
        <div className="space-y-3 max-w-[800px] mx-auto">
          {sortedChips.map((chip, index) => (
            <div
              key={chip.id}
              className="bg-white rounded border border-gray-300 flex hover:border-gray-400 transition-all shadow-sm overflow-hidden group"
            >
              <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0">
                <div className="text-xs font-bold text-gray-400 mb-1">操作</div>
                {/* 删除按钮用薯片 emoji */}
                <span
                  className="cursor-pointer text-2xl hover:scale-110 transition-transform"
                  onClick={() => handleDelete(chip.id, chip.name)}
                >
                  🍟
                </span>
              </div>
              <div className="p-4 flex gap-5 w-full bg-white relative">
                <div className="absolute top-2 right-4 text-4xl font-black text-gray-100 -z-0">
                  #{index + 1}
                </div>
                <div className="relative z-10 shrink-0">
                  {chip.image_url ? (
                    <img
                      src={chip.image_url}
                      alt={chip.name}
                      className="w-24 h-32 object-cover rounded shadow-sm border border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                      无图
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <span className="font-bold text-gray-600 flex items-center gap-1">
                        <Cookie size={12} /> {chip.brand || '未知品牌'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold border border-green-200 shadow-sm">
                      🐸 {chip.admin_rating}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3 truncate pr-8">
                    {chip.name}
                  </h3>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic relative mb-3">
                    {chip.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
