'use client'
import { useState, useEffect } from 'react'
import UploadChipBatch from './components/UploadChipBatch'
import MainView from './components/MainView'
import supabase from '../utils/supabase'

export default function Page() {
  const [chips, setChips] = useState([])
  const [error, setError] = useState(null)

  async function fetchChips() {
    const { data, error } = await supabase
      .from('chipWarehouse')
      .select('*')
      .order('admin_rating', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setChips(data)
    }
  }

  useEffect(() => {
    fetchChips()
  }, [])

  return (
    <div>
      {/* 上传组件，上传成功后刷新排行榜 */}
      <UploadChipBatch onUploadSuccess={fetchChips} />

      {/* 排行榜组件，删除成功后刷新排行榜 */}
      <MainView initialChips={chips} onDeleteSuccess={fetchChips} />

      {error && <div>Database Connection Error: {error}</div>}
    </div>
  )
}
