'use client'

import { useEffect, useState } from 'react'
import supabase from '../../utils/supabase'
import VoteControl from '../components/VoteControl'

export default function ChipRanking() {
  const [chips, setChips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('chips')
        .select('*')
        .order('score', { ascending: false })

      if (error) {
        console.error('加载失败:', error.message)
      } else {
        setChips(data)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">大众口碑榜 · 实力排名</h1>
      <ul className="space-y-6">
        {chips.map((chip) => (
          <li key={chip.id} className="border-b pb-6">
            <div className="flex gap-4">
              <img
                src={chip.image_url}
                alt={chip.name}
                className="w-24 h-24 object-cover rounded"
              />
              <div>
                <h2 className="text-lg font-semibold">{chip.name}</h2>
                <p className="text-sm text-gray-600">
                  {chip.brand} · {chip.score} 分
                </p>
                <p className="text-gray-800 mt-1">{chip.description}</p>
              </div>
            </div>

            {/* 投票 + 评论区 */}
            <div className="mt-4">
              <VoteControl
                chipId={chip.id}
                initialUserScore={0}
                voteCount={0}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
