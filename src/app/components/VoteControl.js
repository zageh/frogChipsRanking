'use client' // 客户端组件
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '../../../utils/supabase' // 注意路径，根据你项目结构调整

export default function VoteControl({ chipId, initialUserScore, voteCount }) {
  const [votes, setVotes] = useState(initialUserScore || 0) // 用户当前打分
  const [count, setCount] = useState(voteCount || 0)        // 总票数
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState([])              // 评论列表
  const [newComment, setNewComment] = useState('')          // 新评论输入框
  const router = useRouter()

  // 加载评论
  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('chip_id', chipId)
        .order('created_at', { ascending: false })

      if (!error) {
        setComments(data)
      }
    }
    fetchComments()
  }, [chipId])

  // 投票逻辑
  const handleVote = async (score) => {
    if (loading) return
    setLoading(true)

    const user = JSON.parse(localStorage.getItem('user'))
    if (!user) {
      alert('请先登录')
      router.push('/auth')
      setLoading(false)
      return
    }

    const user_id = user.id

    // 权重计算规则
    let weight = 1.0
    if (user.type === 'new') {
      weight = 0.95
    } else if (user.type === 'normal') {
      weight = 1.0
    }
    if (user.commentCount) {
      weight += user.commentCount * 0.0001
    }
    if (user.voteCount) {
      weight += Math.floor(user.voteCount / 10) * 0.0001
    }

    const { error } = await supabase
      .from('votes')
      .insert([{ chip_id: chipId, score, user_id, weight }])

    if (error) {
      alert('投票失败：' + error.message)
    } else {
      alert(`你给薯片(ID:${chipId}) 打了 ${score} 分！ (权重: ${weight.toFixed(4)})`)
      setVotes(score)
      setCount(count + 1)
    }

    setLoading(false)
  }

  // 提交评论
  const handleComment = async () => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (!user) {
      alert('请先登录')
      router.push('/auth')
      return
    }

    if (!newComment.trim()) {
      alert('评论不能为空')
      return
    }

    const { error } = await supabase
      .from('comments')
      .insert([{ chip_id: chipId, user_id: user.id, content: newComment }])

    if (error) {
      alert('评论失败：' + error.message)
    } else {
      setComments([{ chip_id: chipId, user_id: user.id, content: newComment }, ...comments])
      setNewComment('')
      alert('评论成功！')
    }
  }

  return (
    <div className="w-full bg-gray-50 p-4 border rounded shadow">
      {/* 投票区 */}
      <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0 gap-1">
        <button 
          onClick={() => handleVote(votes + 1)}
          disabled={loading}
          className="text-gray-400 hover:text-orange-500 hover:bg-gray-200 p-1 rounded transition-colors disabled:opacity-50"
        >
          ▲
        </button>
        
        <span className="font-bold text-lg text-gray-800">{count}</span>
        
        <button 
          onClick={() => handleVote(votes - 1)}
          disabled={loading}
          className="text-gray-400 hover:text-blue-500 hover:bg-gray-200 p-1 rounded transition-colors disabled:opacity-50"
        >
          ▼
        </button>
      </div>

      {/* 评论区 */}
      <div className="mt-4">
        <h3 className="font-bold mb-2">评论区</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的评论..."
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={handleComment}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            发表
          </button>
        </div>
        <ul className="space-y-2">
          {comments.map((c, idx) => (
            <li key={idx} className="border-b pb-2">
              <span className="text-gray-800">{c.content}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
