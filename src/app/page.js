import UploadChipBatch from './components/UploadChipBatch'
import MainView from './components/MainView'
import supabase from '../utils/supabase'

export default async function Page() {
  // 从 Supabase 拉取数据
  const { data: chips, error } = await supabase
    .from('chips') // 表名
    .select('*')
    .order('admin_rating', { ascending: false })

  if (error) {
    return <div>Database Connection Error: {error.message}</div>
  }

  // 把数据传给 MainView
  return (
    <div>
      <UploadChipBatch />
      <MainView initialChips={chips} />
    </div>
  )
}
