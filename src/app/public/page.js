'use client'
import { useEffect, useState } from 'react'
import supabase from '../../utils/supabase'

export default function PublicRanking() {
  const [chips, setChips] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      // 查询 chips 表和 votes 表的聚合结果
      const { data, error } = await supabase
        .from('chips')
        .select(`
          id,
          brand,
          flavor,
          description,
          votes:votes(count, avg(score))
        `)

      if (error) {
        console.error(error)
      } else {
        setChips(data)
      }
    }

    fetchData()
  }, [])

  return (
    <div>
      <h2>大众口碑榜</h2>
      <ul>
        {chips.map(chip => (
          <li key={chip.id}>
            <strong>{chip.brand} - {chip.flavor}</strong><br />
            平均分: {chip.votes?.[0]?.avg?.score?.toFixed(2) || '暂无'}<br />
            投票数: {chip.votes?.[0]?.count || 0}<br />
            {chip.description}
          </li>
        ))}
      </ul>
    </div>
  )
}
