import { supabase } from '../utils/supabase'; 
import MainView from './components/MainView';

import UploadChip from './components/UploadChip'

export default function Page() {
  return (
    <div>
      <UploadChip />
      <MainView />
    </div>
  )
}

// 这还是服务端渲染，保持网站加载速度快！
export default async function Home() {
  
  // 1. 抓取数据
  const { data: chips, error } = await supabase
    .from('chips')
    .select('*')
    .order('admin_rating', { ascending: false });

  if (error) {
    return <div>Database Connection Error: {error.message}</div>
  }

  // 2. 把数据扔给“前台经理”MainView，他负责处理搜索和点击
  return <MainView initialChips={chips} />;
}