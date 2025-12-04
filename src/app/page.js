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

  // voting in-flight flags: { [chipId]: boolean }
  const [votingMap, setVotingMap] = useState({})

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

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // listen auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // fetch frog list (from frogRecommendations)
  useEffect(() => {
    const fetchFrog = async () => {
      const { data, error } = await supabase
        .from('frogRecommendations')
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

  // fetch comments for a chip (recent 3)
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

  // batch fetch comments when publicChips updates
  useEffect(() => {
    publicChips.forEach(chip => {
      if (chip?.chip_id != null) fetchComments(chip.chip_id)
    })
  }, [publicChips])

  // fetch current user's votes for visible chips
  const fetchUserVotesForChips = async (chipIds = []) => {
    if (!user || chipIds.length === 0) return
    const { data, error } = await supabase
      .from('chip_votes')
      .select('chip_id, score')
      .in('chip_id', chipIds)
      .eq('user_id', user.id)
    if (!error && data) {
      const map = {}
      data.forEach(r => { map[r.chip_id] = Number(r.score) })
      setUserVotesMap(prev => ({ ...prev, ...map }))
    }
  }

  // whenever user or publicChips change, fetch user's votes for those chips
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

  // comment handlers
  const handleCommentChange = (chipId, value) => {
    setCommentTextMap(prev => ({ ...prev, [chipId]: value }))
  }

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
      refreshChipStats(chipId)
    }
  }

  // refresh a single chip's aggregated stats from the view
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
    } else {
      const { data: allData, error: allErr } = await supabase
        .from('chip_vote_stats_weighted_with_comments')
        .select('*')
      if (!allErr) {
        const enriched = (allData || []).map(chip => ({ ...chip, strength: calculateStrength(chip) }))
        enriched.sort((a, b) => b.strength - a.strength)
        setPublicChips(enriched)
      }
    }
  }

  // voting logic: upsert user's vote (with optimistic updates)
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
      const prevAvg = Number(chip.weighted_avg_score || chip.avg_score || 0)
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
      // rollback optimistic
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
    const fields = [chip.brand, chip.name, chip.flavor, chip.description].map(normalize)
    return fields.some(f => f.includes(q))
  }

  const filteredFrog = useMemo(() => frogChips.filter(matches), [frogChips, query])
  const filteredPublic = useMemo(() => publicChips.filter(matches), [publicChips, query])

  // chart config
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

  // small UI helpers
  const EmojiForChip = (chip) => {
    const score = chip.admin_rating ?? chip.strength ?? 0
    if (score >= 4.8) return '🔥'
    if (score >= 4.5) return '🌟'
    if (score >= 4.0) return '👍'
    if (score >= 3.0) return '🙂'
    return '🤔'
  }

  const ColorBadge = ({ style }) => (
    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ background: style || 'linear-gradient(135deg,#ffb86b,#ff6b6b)' }} />
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
              className={`text-xl leading-none ${filled ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110 transition-transform`}
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
      {/* Top actions */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/auth" className="inline-flex items-center px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow">
          🔐 登录
        </Link>

        <label className="flex items-center gap-2 cursor-pointer">
          <span className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 inline-flex items-center shadow-sm">📤 上传图片</span>
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
        <button onClick={() => setActiveTab('frog')} className={`px-4 py-2 rounded-full ${activeTab === 'frog' ? 'bg-indigo-50 text-indigo-700 shadow' : 'text-gray-600 hover:bg-gray-100'}`}>🐸 青蛙推荐榜</button>
        <button onClick={() => setActiveTab('public')} className={`px-4 py-2 rounded-full ${activeTab === 'public' ? 'bg-cyan-50 text-cyan-700 shadow' : 'text-gray-600 hover:bg-gray-100'}`}>🗳️ 大众口碑榜</button>
      </div>

      {/* Arrows */}
      <button onClick={() => handleArrowClick('right')} className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow hover:bg-gray-300">←</button>
      <button onClick={() => handleArrowClick('left')} className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-200 p-2 rounded-full shadow hover:bg-gray-300">→</button>

      <div className={`transition-transform duration-500 ease-in-out ${direction === 'left' ? 'translate-x-[-20px]' : direction === 'right' ? 'translate-x-[20px]' : ''}`}>
        {/* Frog list */}
        {activeTab === 'frog' && (
          <ul className="space-y-4">
            {filteredFrog.map(chip => (
              <li key={chip.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#ffd166,#ef476f)' }} className="flex items-center justify-center mr-3 text-lg">🍟</div>
                    <div>
                      <div className="flex items-center">
                        <span className="mr-2 text-sm">🇺🇸</span>
                        <strong className="text-lg">{chip.brand} — {chip.name}</strong>
                        <span className="ml-2 text-sm">{EmojiForChip(chip)}</span>
                      </div>
                      {chip.flavor && <p className="text-gray-700 mt-1">{chip.flavor}</p>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">⭐ {chip.admin_rating ? chip.admin_rating.toFixed(1) : '—'}</div>
                </div>
                <p className="text-gray-600 mt-3">{chip.description}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Public list */}
        {activeTab === 'public' && (
          <>
            <div className="mb-4">
              <Bar data={chartData} options={chartOptions} />
            </div>

            <ul className="space-y-4 mt-6">
              {filteredPublic.map((chip) => (
                <li key={chip.chip_id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#7b2ff7,#f107a3)' }} className="flex items-center justify-center text-xl">
                      {EmojiForChip(chip)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ColorBadge style="linear-gradient(135deg,#ffb86b,#ff6b6b)" />
                          <strong className="text-lg">{chip.brand} — {chip.flavor || chip.name}</strong>
                          <span className="ml-2 text-sm text-gray-500">({chip.vote_count} votes)</span>
                        </div>
                        <div className="text-sm text-gray-500">实力 {chip.strength ? chip.strength.toFixed(2) : '—'}</div>
                      </div>

                      <p className="text-gray-600 mt-2">{chip.description}</p>

                      <p className="mt-3 text-sm text-gray-600">
                        平均分: <span className="font-medium">{chip.weighted_avg_score ? chip.weighted_avg_score.toFixed(2) : '暂无'}</span> · 评论数: <span className="font-medium">{chip.comment_count}</span>
                      </p>

                      {/* Rating UI */}
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
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-indigo-500 text-white px-4 py-2 rounded hover:opacity-95"
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
