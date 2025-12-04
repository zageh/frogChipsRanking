'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '../../utils/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('') // optional profile field
  const [displayName, setDisplayName] = useState('') // optional profile field
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  // 登录
  const handleSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) {
        setError(signInError.message)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('登录出错')
    } finally {
      setLoading(false)
    }
  }

  // 注册并写入 profile（users_profile 表）
  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }
    setLoading(true)
    try {
      // 1) 使用 Supabase Auth 注册
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // signUpData.user 可能在需要邮箱确认时为 null 或未激活
      const user = signUpData?.user

      // 如果 user 存在，立即写入 profile；否则可在用户确认后写入（或通过后台 webhook）
      if (user) {
        const profile = {
          user_id: user.id,
          username: username || null,
          display_name: displayName || username || null,
          avatar_url: null
        }

        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .insert([profile])
          .select()
          .single()

        if (profileError) {
          // 注册成功但写 profile 失败：记录或提示
          setError('注册成功，但写入资料失败：' + profileError.message)
          setLoading(false)
          return
        }

        // 成功：跳转首页
        router.push('/')
      } else {
        // 需要邮箱确认的情况：提示用户检查邮箱或跳转
        router.push('/')
      }
    } catch (err) {
      setError('注册出错')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form className="w-full max-w-md bg-white border rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center">登录 / 注册</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="w-full border rounded px-3 py-2"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className="w-full border rounded px-3 py-2"
          minLength={6}
          required
        />

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名（可选）"
          className="w-full border rounded px-3 py-2"
        />

        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="显示名称（可选）"
          className="w-full border rounded px-3 py-2"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? '处理中...' : '登录'}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? '处理中...' : '注册并写入资料'}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          注册后会把基本资料写入 <code>users_profile</code> 表（不存密码）。若启用邮箱确认，资料写入可能在确认后完成。
        </p>
      </form>
    </div>
  )
}
