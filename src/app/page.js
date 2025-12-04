'use client'
import { useState, useEffect } from 'react'
import { useSwipeable } from 'react-swipeable'
import supabase from '../utils/supabase'
import calculateStrength from '../utils/calculateStrength'   // 引入工具函数
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('frog')
  const [frogChips, setFrogChips] = useState([])
  const [publicChips, setPublicChips] = useState([])
  const [direction, setDirection] = useState('')
  const [showHint, setShowHint] = useState(true)

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setDirection('left')
      setActiveTab('public')
    },
    onSwipedRight: () => {
      setDirection('right')
      setActiveTab('frog')
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  })

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // 青蛙推荐榜
  useEffect(() => {
    const fetchFrog = async () => {
      const { data, error } = await supabase
        .from('chipWarehouse')
        .select('*')
        .order('admin_rating', { ascending: false })
      if (!error) setFrogChips(data)
    }
    fetchFrog()
  }, [])

  // 大众口碑榜（前端计算实力值）
  useEffect(() => {
    const fetchPublic = async () => {
      const { data, error } = await supabase
        .from('chip_vote_stats_weighted_with_comments')
        .select('*')
      if (!error) {
        const enriched = data.map(chip => ({
          ...chip,
          strength: calculateStrength(chip)   // 使用工具函数
        }))
        enriched.sort((a, b) => b.strength - a.strength)
        setPublicChips(enriched)
      }
    }
    fetchPublic()
  }, [])

  const chartData = {
    labels: publicChips.map(chip => chip.flavor || chip.name),
    datasets: [
      {
        label: '实力值',
        data: publicChips.map(chip => chip.strength?.toFixed(2)),
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

  const handleArrowClick = (dir) => {
    setDirection(dir)
    setActiveTab(dir === 'left' ? 'public' : 'frog')
  }

  return (
    <div {...handlers} className="relative max-w-4xl mx-auto p-6">
      {showHint && (
        <div className="mb-4 text-center text-sm text-gray-600 animate-pulse">
          ← 向左/右滑动或拖动切换榜单 →
        </div>
      )}

      <div className="flex justify-center gap-6 mb-6 text-gray-500">
        <span className={activeTab === 'frog' ? 'font-bold text-blue-500' : ''}>
          青蛙推荐榜
        </span>
        <span className={activeTab === 'public' ? 'font-bold text-blue-500' : ''}>
          大众口碑榜
        </span>
      </div>

      {/* 左右箭头按钮 */}
      <button
        onClick={() => handleArrowClick('right')}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow hover:bg-gray-300"
      >
        ←
      </button>
      <button
        onClick={() => handleArrowClick('left')}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow hover:bg-gray-300"
      >
        →
      </button>

      <div
        className={`transition-transform duration-500 ease-in-out ${
          direction === 'left' ? 'translate-x-[-20px]' : direction === 'right' ? 'translate-x-[20px]' : ''
        }`}
      >
        {activeTab === 'frog' && (
          <ul className="space-y-4">
            {frogChips.map(chip => (
              <li key={chip.id} className="p-4 border rounded bg-white shadow">
                <strong className="text-lg">{chip.brand} - {chip.name}</strong>
                <p className="text-gray-600 mt-1">{chip.description}</p>
                <p className="mt-2">管理员评分: {chip.admin_rating ? chip.admin_rating.toFixed(1) : '暂无'}</p>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'public' && (
          <>
            <Bar data={chartData} options={chartOptions} />
            <ul className="space-y-4 mt-6">
              {publicChips.map(chip => (
                <li key={chip.chip_id} className="p-4 border rounded bg-white shadow">
                  <strong className="text-lg">{chip.brand} - {chip.flavor || chip.name}</strong>
                  <p className="text-gray-600 mt-1">{chip.description}</p>
                  <p className="mt-2">
                    平均分: {chip.weighted_avg_score ? chip.weighted_avg_score.toFixed(2) : '暂无'}<br />
                    我的评分: {chip.admin_rating ? chip.admin_rating.toFixed(1) : '暂无'}<br />
                    投票数: {chip.vote_count}<br />
                    评论数: {chip.comment_count}<br />
                    实力值: {chip.strength ? chip.strength.toFixed(2) : '暂无'}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
