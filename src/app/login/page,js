'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '../../../utils/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !data) {
      setError('账号或密码错误')
    } else {
      // 登录成功后保存状态
      localStorage.setItem('user', JSON.stringify(data))
      // 跳转到排行榜页
      router.push('/chips')
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-2 max-w-sm mx-auto mt-10">
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
      <button type="submit" className="bg-green-500 text-white p-2">登录</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  )
}
