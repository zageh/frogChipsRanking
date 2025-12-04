'use client'
import { useState } from 'react'
import supabase from '../../utils/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setError(null)

    // 尝试登录
    const { data: loginData, error: loginError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (loginData) {
      localStorage.setItem('user', JSON.stringify(loginData))
      router.push('/')
      return
    }

    // 登录失败 → 自动注册
    const { data: signupData, error: signupError } = await supabase
      .from('users')
      .insert([{ username, password }])
      .select()
      .single()

    if (signupError) {
      setError('注册失败：' + signupError.message)
    } else {
      localStorage.setItem('user', JSON.stringify(signupData))
      router.push('/')
    }
  }

  return (
    <form onSubmit={handleAuth} className="flex flex-col gap-2 max-w-sm mx-auto mt-10">
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="账号"
        className="border p-2"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="密码"
        className="border p-2"
      />
      <button type="submit" className="bg-green-500 text-white p-2">进入</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  )
}
