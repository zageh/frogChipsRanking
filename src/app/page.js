'use client'

import { useState, useEffect } from 'react'
import { useSwipeable } from 'react-swipeable'
import supabase from '../utils/supabase'
import calculateStrength from '../utils/calculateStrength'

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

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { FaUpload, FaCommentDots, FaSignInAlt } from 'react-icons/fa'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function HomePage() {
  // tabs & motion
  const [activeTab, setActiveTab] = useState('frog')
  const [direction, setDirection] = useState('')
  const [showHint, setShowHint] = useState(true)

  // data
  const [frogChips, setFrogChips] = useState([])
  const [publicChips, setPublicChips] = useState([])

  // auth
  const [session, setSession] = useState(null)

  // comments
  const [commentTextMap, setCommentTextMap] = useState({})
  const [commentsMap, setCommentsMap] = useState({})

  // gestures
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

  // hint auto-hide
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // fetch frog list
  useEffect(() => {
    const fetchFrog = async () => {
      const { data, error } = await supabase
        .from('chipWarehouse')
        .select('*')
        .order('admin_rating', { ascending: false })
      if (!error) setFrogChips(data || [])
    }
    fetchFrog()
  }, [])

  // fetch public list + compute strength
  useEffect(() => {
    const fetchPublic = async () => {
      const { data, error } = await supabase
        .from('chip_vote_stats_weighted_with_comments')
        .select('*')
      if (!error) {
        const enriched = (data || []).map(chip => ({
          ...chip,
          strength: calculateStrength(chip)
        }))
        enriched.sort((a, b) => b.strength - a.strength)
        setPublicChips(enriched)
      }
    }
    fetchPublic()
  }, [])

  // comments: fetch recent 3 per chip
  const fetchComments = async (chipId) => {
    const { data, error } = await supabase
      .from('chipComments')
      .select('content, created_at')
      .eq('chip_id', chipId)
      .order('created_at', { ascending: false })
      .limit(3)
    if (!error) {
      setCommentsMap(prev => ({ ...prev, [chipId]: data || [] }))
    }
  }

  // batch fetch comments when list updates
  useEffect(() => {
    publicChips.forEach(chip => {
      fetchComments(chip.chip_id)
    })
  }, [publicChips])

  // upload image to storage bucket "chip-images"
  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const path = `public/${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('chip-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) alert(error.message)
    else alert('上传成功！')
  }

  // comment input change per chip
  const handleCommentChange = (chipId, value) => {
    setCommentTextMap(prev => ({ ...prev, [chipId]: value }))
  }

  // submit comment then refresh list
  const handleComment = async (chipId) => {
    const content = (commentTextMap[chipId] || '').trim()
    if (!content) return
    const { error } = await supabase
      .from('chipComments')
      .insert({ chip_id: chipId, content })
    if (error) alert(error.message)
    else {
      setCommentTextMap(prev => ({ ...prev, [chipId]: '' }))
      fetchComments(chipId)
    }
  }

  // chart config
  const chartData = {
    labels: publicChips.map(chip => chip.flavor || chip.name),
    datasets: [
      {
        label: '实力值',
        data: publicChips.map(chip => Number(chip.strength?.toFixed(2))),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '大众口碑榜 实力排名' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }

  const handleArrowClick = (dir) => {
    setDirection(dir)
    setActiveTab(dir === 'left' ? 'public' : 'frog')
  }

  return (
    <div {...handlers} className="relative max-w-4xl mx-auto p-6">
      {/* Auth */}
      {!session ? (
        <div className="mb-6">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 text-green-600">
          <FaSignInAlt /> 已登录
        </div>
      )}

      {/* Hint */}
      {showHint && (
        <div className="mb-4 text-center text-sm text-gray-600 animate-pulse">
          ← 向左/右滑动或拖动切换榜单 →
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center gap-6 mb-6 text-gray-500">
        <span className={activeTab === 'frog' ? 'font-bold text-blue-500' : ''}>
          青蛙推荐榜
        </span>
        <span className={activeTab === 'public' ? 'font-bold text-blue-500' : ''}>
          大众口碑榜
        </span>
      </div>

      {/* Upload */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <FaUpload /> 上传图片
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* Arrows */}
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

      {/* Animated content */}
      <div
        className={`transition-transform duration-500 ease-in-out ${
          direction === 'left' ? 'translate-x-[-20px]' : direction === 'right' ? 'translate-x-[20px]' : ''
        }`}
      >
        {/* Frog list */}
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

        {/* Public list */}
        {activeTab === 'public' && (
          <>
            <Bar data={chartData} options={chartOptions} />
            <ul className="space-y-4 mt-6">
              {publicChips.map((chip) => (
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

                  {/* 评论列表 */}
                  <div className="mt-4 space-y-2">
                    <strong className="text-sm text-gray-700">最新评论：</strong>
                    {commentsMap[chip.chip_id]?.length > 0 ? (
                      commentsMap[chip.chip_id].map((cmt, idx) => (
                        <div key={idx} className="text-sm text-gray-600 border-l-2 pl-2">
                          {cmt.content}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">暂无评论</p>
                    )}
                  </div>

                  {/* 评论区 */}
                  <div className="mt-3">
                    <textarea
                      value={commentTextMap[chip.chip_id] || ''}
                      onChange={(e) => handleCommentChange(chip.chip_id, e.target.value)}
                      placeholder="写下你的评论..."
                      className="w-full border rounded p-2"
                    />
                    <button
                      onClick={() => handleComment(chip.chip_id)}
                      className="mt-2 flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      <FaCommentDots />
                      提交评论
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
