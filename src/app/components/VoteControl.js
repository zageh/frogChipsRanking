'use client' // 告诉 Next.js 这是一个客户端组件
import { useState } from 'react'
import supabase from '../../../utils/supabase' // 注意路径，根据你文件位置调整

export default function VoteControl({ chipId, initialUserScore, voteCount }) {
  const [votes, setVotes] = useState(initialUserScore || 0) // 用户当前打分
  const [count, setCount] = useState(voteCount || 0)        // 总票数
  const [loading, setLoading] = useState(false)

  const handleVote = async (score) => {
    if (loading) return
    setLoading(true)

    // 从 localStorage 获取当前用户信息
    const user = JSON.parse(localStorage.getItem('user'))
    const user_id = user?.id

    // 插入到 Supabase 的 votes 表
    const { error } = await supabase
      .from('votes')
      .insert([{ chip_id: chipId, score, user_id }])

    if (error) {
      alert('投票失败：' + error.message)
    } else {
      alert(`你给薯片(ID:${chipId}) 打了 ${score} 分！`)
      setVotes(score)       // 更新 UI
      setCount(count + 1)   // 更新票数
    }

    setLoading(false)
  }

  return (
    <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0 gap-1">
      {/* 向上箭头 */}
      <button 
        onClick={() => handleVote(votes + 1)}
        className="text-gray-400 hover:text-orange-500 hover:bg-gray-200 p-1 rounded transition-colors"
      >
        ▲
      </button>
      
      <span className="font-bold text-lg text-gray-800">{count}</span>
      
      {/* 向下箭头 */}
      <button 
        onClick={() => handleVote(votes - 1)}
        className="text-gray-400 hover:text-blue-500 hover:bg-gray-200 p-1 rounded transition-colors"
      >
        ▼
      </button>
    </div>
  )
}
