'use client' // 这句告诉Next.js这是一个会动的组件
import { useState } from 'react';
import { supabase } from '../../utils/supabase'; // 这里的路径可能需要根据你实际位置微调，如果是 ../utils/supabase 

export default function VoteControl({ chipId, initialUserScore, voteCount }) {
  const [votes, setVotes] = useState(initialUserScore || 0); // 这里我们简单用votes代替评分逻辑，你可以改成1-5星
  const [count, setCount] = useState(voteCount || 0);
  const [loading, setLoading] = useState(false);

  // 模拟打分：实际上我们应该往 ratings 表里插数据
  // 这里简化演示：点击只是加个赞
  const handleVote = async (score) => {
    if (loading) return;
    setLoading(true);
    
    // 这里简单地发给 Supabase 说：我想给这包薯片投票
    // 注意：真实逻辑需要你需要写对应的API或者前端插入逻辑
    alert(`你给薯片(ID:${chipId}) 打了 ${score} 分！（假装入库成功）`);

    setVotes(score); // 更新UI
    setCount(count + 1);
    setLoading(false);
  };

  return (
    <div className="w-16 bg-gray-50 p-2 flex flex-col items-center justify-center border-r border-gray-100 shrink-0 gap-1">
      {/* 向上箭头 */}
      <button 
        onClick={() => handleVote(votes + 1)}
        className="text-gray-400 hover:text-orange-500 hover:bg-gray-200 p-1 rounded transition-colors"
      >
        ▲
      </button>
      
      <span className="font-bold text-lg text-gray-800">{count}</span>
      
      {/* 向下箭头 */}
      <button 
        className="text-gray-400 hover:text-blue-500 hover:bg-gray-200 p-1 rounded transition-colors"
      >
        ▼
      </button>
    </div>
  );
}