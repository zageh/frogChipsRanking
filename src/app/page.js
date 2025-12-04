'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSwipeable } from 'react-swipeable'
import Link from 'next/link'
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function HomePage() {
  // UI state
  const [activeTab, setActiveTab] = useState('frog')
  const [direction, setDirection] = useState('')
  const [showHint, setShowHint] = useState(true)

  // data
  const [frogChips, setFrogChips] = useState([])
  const [publicChips, setPublicChips] = useState([])

  // comments
  const [commentTextMap, setCommentTextMap] = useState({})
  const [commentsMap, setCommentsMap] = useState({})

  // search
  const [query, setQuery] = useState('')

  // auth / user
  const [user, setUser] = useState(null)

  // user votes: { [chipId]: score }
  const [userVotesMap, setUserVotesMap] = useState({})

  // voting flags
  const [votingMap, setVotingMap] = useState({})

  // swiping
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
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // fetch frog list (注意：表名使用小写 frogrecommendations)
  useEffect(() => {
    const fetchFrog = async () => {
      const { data, error } = await supabase
        .from('frogrecommendations')
        .select('*')
        .order('admin_rating', { ascending: false })

      if (error) {
        console.error('fetch frog error', error)
        return
      }
      setFrogChips(data || [])
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
      } else {
        console.error('fetch public error', error)
      }
    }
    fetchPublic()
  }, [])

  // fetch comments (recent 3)  —— 注意表名改为小写 chipcomments
  const fetchComments = async (chipId) => {
    const { data, error } = await supabase
      .from('chipcomments')
      .select('content, created_at')
      .eq('chip_id', chipId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (!error) {
      setCommentsMap(prev => ({ ...prev, [chipId]: data || [] }))
    } else {
      console.error('fetchComments error', error)
    }
  }

  // when publicChips change → load comments
  useEffect(() => {
    publicChips.forEach(chip => {
      if (chip?.chip_id != null) fetchComments(chip.chip_id)
    })
  }, [publicChips])

  // load current user's votes
  const fetchUserVotesForChips = async (chipIds = []) => {
    if (!user || chipIds.length === 0) return

    const { data, error } = await supabase
      .from('chip_votes')
      .select('chip_id, score')
      .in('chip_id', chipIds)
      .eq('user_id', user.id)

    if (error) {
      console.error('fetchUserVotesForChips error', error)
      return
    }

    if (data) {
      const map = {}
      data.forEach(r => { map[r.chip_id] = Number(r.score) })
      setUserVotesMap(prev => ({ ...prev, ...map }))
    }
  }

  // refresh when user or public list changes
  useEffect(() => {
    if (!user) {
      setUserVotesMap({})
      return
    }
    const chipIds = publicChips.map(c => c.chip_id).filter(Boolean)
    if (chipIds.length) fetchUserVotesForChips(chipIds)
  }, [user, publicChips])

  // upload image
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

  // comment change
  const handleCommentChange = (chipId, value) => {
    setCommentTextMap(prev => ({ ...prev, [chipId]: value }))
  }

  // submit comment  —— 注意表名改为小写 chipcomments
  const handleComment = async (chipId) => {
    const content = (commentTextMap[chipId] || '').trim()
    if (!content) return

    const { error } = await supabase
      .from('chipcomments')
      .insert({ chip_id: chipId, content })

    if (error) {
      alert(error.message)
      console.error('handleComment error', error)
    } else {
      setCommentTextMap(prev => ({ ...prev, [chipId]: '' }))
      fetchComments(chipId)
      refreshChipStats(chipId)
    }
  }

  // refresh stats
  const refreshChipStats = async (chipId) => {
    const { data, error } = await supabase
      .from('chip_vote_stats_weighted_with_comments')
      .select('*')
      .eq('chip_id', chipId)
      .single()

    if (!error && data) {
      setPublicChips(prev => prev.map(chip =>
        chip.chip_id === chipId
          ? { ...chip, ...data, strength: calculateStrength(data) }
          : chip
      ))
      fetchComments(chipId)
    } else if (error) {
      // fallback: reload all
      console.error('refreshChipStats single error', error)
      const { data: allData, error: allErr } = await supabase
        .from('chip_vote_stats_weighted_with_comments')
        .select('*')
      if (!allErr) {
        const enriched = (allData || []).map(chip => ({ ...chip, strength: calculateStrength(chip) }))
        enriched.sort((a, b) => b.strength - a.strength)
        setPublicChips(enriched)
      } else {
        console.error('refreshChipStats fallback error', allErr)
      }
    }
  }

  // vote → optimistic update
  const handleVote = async (chipId, score) => {
    if (!user) {
      alert('请先登录再评分')
      return
    }

    setVotingMap(prev => ({ ...prev, [chipId]: true }))
    const prevUserScore = userVotesMap[chipId] ?? null
    setUserVotesMap(prev => ({ ...prev, [chipId]: score }))

    setPublicChips(prev => prev.map(chip => {
      if (chip.chip_id !== chipId) return chip
      const prevCount = Number(chip.vote_count || 0)
      const prevAvg = Number(chip.weighted_avg_score || 0)
      const hadPrev = prevUserScore !== null

      const newCount = hadPrev ? prevCount : prevCount + 1
      const newAvg = hadPrev
        ? ((prevAvg * prevCount) - prevUserScore + score) / (newCount || 1)
        : ((prevAvg * prevCount) + score) / (newCount || 1)

      const newChip = { ...chip, vote_count: newCount, weighted_avg_score: newAvg }
      newChip.strength = calculateStrength(newChip)
      return newChip
    }))

    const payload = { user_id: user.id, chip_id: chipId, score }
    const { error } = await supabase
      .from('chip_votes')
      .upsert([payload], { onConflict: 'user_id,chip_id' })

    if (error) {
      alert('评分失败：' + error.message)

      setUserVotesMap(prev => {
        const copy = { ...prev }
        if (prevUserScore === null) delete copy[chipId]
        else copy[chipId] = prevUserScore
        return copy
      })

      await refreshChipStats(chipId)
    } else {
      await refreshChipStats(chipId)
    }

    setVotingMap(prev => ({ ...prev, [chipId]: false }))
  }

  // search helpers
  const normalize = (s) => (s || '').toString().toLowerCase()
  const matches = (chip) => {
    const q = normalize(query)
    if (!q) return true
    return [chip.brand, chip.name, chip.flavor, chip.description]
      .map(normalize)
      .some(f => f.includes(q))
  }

  const filteredFrog = useMemo(() => frogChips.filter(matches), [frogChips, query])
  const filteredPublic = useMemo(() => publicChips.filter(matches), [publicChips, query])

  const chartData = {
    labels: filteredPublic.map(chip => chip.flavor || chip.name),
    datasets: [
      {
        label: '实力值',
        data: filteredPublic.map(chip => Number((chip.strength ?? 0).toFixed(2))),
        backgroundColor: 'rgba(99, 102, 241, 0.8)'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '大众口碑榜 实力排名 📊' }
    },
    scales: { y: { beginAtZero: true } }
  }

  const handleArrowClick = (dir) => {
    setDirection(dir)
    setActiveTab(dir === 'left' ? 'public' : 'frog')
  }

  const EmojiForChip = (chip) => {
    const score = chip.admin_rating ?? chip.strength ?? 0
    if (score >= 4.8) return '🔥'
    if (score >= 4.5) return '🌟'
    if (score >= 4.0) return '👍'
    if (score >= 3.0) return '🙂'
    return '🤔'
  }

  const ColorBadge = ({ style }) => (
    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: style }} />
  )

  const Stars = ({ chip }) => {
    const current = userVotesMap[chip.chip_id] ?? Math.round(chip.weighted_avg_score || 0)
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(n => {
          const filled = current >= n
          return (
            <button
              key={n}
              onClick={() => handleVote(chip.chip_id, n)}
              disabled={votingMap[chip.chip_id]}
              aria-label={`给 ${n} 星`}
              className={`text-xl ${filled ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110 transition-transform`}
            >
              ★
            </button>
          )
        })}
        <span className="ml-2 text-sm text-gray-600">({chip.vote_count || 0})</span>
      </div>
    )
  }

  return (
    <div {...handlers} className="relative max-w-4xl mx-auto p-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/auth" className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow">
          🔐 登录
        </Link>

        <label className="cursor-pointer">
          <span className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 shadow-sm">📤 上传图片</span>
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 搜索品牌 / 口味 / 描述..."
          className="w-full border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-6 mb-6">
        <button onClick={() => setActiveTab('frog')}
          className={`px-4 py-2 rounded-full ${activeTab === 'frog' ? 'bg-indigo-50 text-indigo-700 shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
          🐸 青蛙推荐榜
        </button>

        <button onClick={() => setActiveTab('public')}
          className={`px-4 py-2 rounded-full ${activeTab === 'public' ? 'bg-cyan-50 text-cyan-700 shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
          🗳️ 大众口碑榜
        </button>
      </div>

      {/* Arrows */}
      <button onClick={() => handleArrowClick('right')} className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow">←</button>
      <button onClick={() => handleArrowClick('left')} className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow">→</button>

      {/* Content */}
      <div className={`transition-transform duration-500 ${direction === 'left' ? '-translate-x-5' : direction === 'right' ? 'translate-x-5' : ''}`}>

        {/* Frog List */}
        {activeTab === 'frog' && (
          <ul className="space-y-4">
            {filteredFrog.map(chip => (
              <li key={chip.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  
                  {/* Left info */}
                  <div className="flex items-center">
                    {/* If image exists, show it */}
                    {chip.image_url ? (
                      <img
                        src={chip.image_url}
                        alt={chip.name}
                        className="w-10 h-10 rounded-lg mr-3 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 to-red-400 flex items-center justify-center text-lg mr-3">
                        🍟
                      </div>
                    )}

                    <div>
                      <div className="flex items-center">
                        <strong className="text-lg">{chip.brand} — {chip.name}</strong>
                        <span className="ml-2 text-sm">{EmojiForChip(chip)}</span>
                      </div>

                      {chip.flavor && (
                        <p className="text-gray-700 text-sm mt-1">{chip.flavor}</p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="text-sm text-gray-500">
                    ⭐ {chip.admin_rating ? chip.admin_rating.toFixed(1) : '—'}
                  </div>
                </div>

                {chip.description && (
                  <p className="text-gray-600 mt-3">{chip.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Public List */}
        {activeTab === 'public' && (
          <>
            <div className="mb-4">
              <Bar data={chartData} options={chartOptions} />
            </div>

            <ul className="space-y-4 mt-6">
              {filteredPublic.map((chip) => (
                <li key={chip.chip_id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition">

                  <div className="flex items-start gap-3">

                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                      {EmojiForChip(chip)}
                    </div>

                    <div className="flex-1">

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ColorBadge style="linear-gradient(135deg,#ffb86b,#ff6b6b)" />
                          <strong className="text-lg">{chip.brand} — {chip.flavor || chip.name}</strong>
                          <span className="ml-2 text-sm text-gray-500">({chip.vote_count} votes)</span>
                        </div>

                        <div className="text-sm text-gray-500">
                          实力 {chip.strength ? chip.strength.toFixed(2) : '—'}
                        </div>
                      </div>

                      <p className="text-gray-600 mt-2">{chip.description}</p>

                      <p className="mt-3 text-sm text-gray-600">
                        平均分: <span className="font-medium">{chip.weighted_avg_score ? chip.weighted_avg_score.toFixed(2) : '暂无'}</span>
                        · 评论数: <span className="font-medium">{chip.comment_count}</span>
                      </p>

                      {/* Rating */}
                      <div className="mt-3">
                        <Stars chip={chip} />
                      </div>

                      {/* Comments */}
                      <div className="mt-4">
                        <strong className="text-sm text-gray-700">最新评论</strong>
                        <div className="mt-2 space-y-2">
                          {commentsMap[chip.chip_id]?.length > 0 ? (
                            commentsMap[chip.chip_id].map((cmt, idx) => (
                              <div key={idx} className="text-sm text-gray-700 bg-gray-50 border-l-4 border-indigo-200 p-2 rounded">
                                <span className="mr-2">💬</span>{cmt.content}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-400">暂无评论</p>
                          )}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div className="mt-3 flex gap-2">
                        <textarea
                          value={commentTextMap[chip.chip_id] || ''}
                          onChange={(e) => handleCommentChange(chip.chip_id, e.target.value)}
                          placeholder="✍️ 写下你的评论..."
                          className="flex-1 border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
                          rows={2}
                        />
                        <button
                          onClick={() => handleComment(chip.chip_id)}
                          className="bg-gradient-to-r from-rose-500 to-indigo-500 text-white px-4 py-2 rounded hover:opacity-95"
                        >
                          ❤️ 提交
                        </button>
                      </div>

                    </div>
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
