'use client'
import { useEffect, useState } from 'react'
import supabase from '../../utils/supabase'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function PublicStrengthRanking() {
  const [chips, setChips] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('chip_vote_stats_weighted_with_comments')
        .select('*')

      if (error) {
        console.error('查询失败:', error.message)
        return
      }

      // 计算实力值
      const enriched = data.map(chip => {
        const myScore = chip.admin_rating || 0 // 你的个人评分
        const avg = chip.weighted_avg_score || 0
        const votes = chip.vote_count || 0

        // 参数 α, β, γ
        const alpha = 0.6   // 大众评分权重
        const beta = 0.3    // 我的评分权重
        const gamma = 0.1   // 投票人数权重

        const strength = alpha * avg + beta * myScore + gamma * Math.log(1 + votes)
        return { ...chip, strength }
      })

      // 按实力值排序
      enriched.sort((a, b) => b.strength - a.strength)
      setChips(enriched)
    }

    fetchData()
  }, [])

  // 柱状图数据
  const chartData = {
    labels: chips.map(chip => chip.flavor || chip.name),
    datasets: [
      {
        label: '实力值',
        data: chips.map(chip => chip.strength.toFixed(2)),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '大众口碑榜 实力排名' }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">大众口碑榜（实力排名）</h2>

      {/* 实力柱状图 */}
      <Bar data={chartData} options={chartOptions} />

      {/* 榜单详情 */}
      <ul className="space-y-4 mt-6">
        {chips.map(chip => (
          <li key={chip.chip_id} className="p-4 border rounded bg-white shadow">
            <strong className="text-lg">{chip.brand} - {chip.flavor || chip.name}</strong>
            <p className="text-gray-600 mt-1">{chip.description}</p>
            <p className="mt-2">
              平均分: {chip.weighted_avg_score ? chip.weighted_avg_score.toFixed(2) : '暂无'}<br />
              我的评分: {chip.admin_rating ? chip.admin_rating.toFixed(1) : '暂无'}<br />
              投票数: {chip.vote_count}<br />
              评论数: {chip.comment_count}<br />
              实力值: {chip.strength.toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
