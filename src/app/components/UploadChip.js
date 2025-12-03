'use client'
import { useState } from 'react'
import supabase from '../../utils/supabase'

export default function UploadChip() {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [adminRating, setAdminRating] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file || !name) {
      alert('请至少填写薯片名字并选择图片！')
      return
    }
    setLoading(true)

    // 1. 上传图片到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('images') // bucket 名字
      .upload(file.name, file)

    if (uploadError) {
      console.error(uploadError)
      alert('图片上传失败')
      setLoading(false)
      return
    }

    // 2. 保存文字和图片路径到数据库
    const { error: dbError } = await supabase
      .from('chipWarehouse') // 表名
      .insert({
        name,
        brand,
        description,
        admin_rating: parseFloat(adminRating) || 0,
        image_url: file.name
      })

    if (dbError) {
      console.error(dbError)
      alert('数据库保存失败')
    } else {
      alert('上传成功！')
      // 清空表单
      setName('')
      setBrand('')
      setDescription('')
      setAdminRating('')
      setFile(null)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">上传新的薯片</h2>
      <input
        type="text"
        placeholder="薯片名字"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border p-2 mb-2 rounded"
      />
      <input
        type="text"
        placeholder="品牌"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        className="w-full border p-2 mb-2 rounded"
      />
      <textarea
        placeholder="描述"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-2 mb-2 rounded"
      />
      <input
        type="number"
        placeholder="你的评分 (0-5)"
        value={adminRating}
        onChange={(e) => setAdminRating(e.target.value)}
        className="w-full border p-2 mb-2 rounded"
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        {loading ? '上传中...' : '上传'}
      </button>
    </div>
  )
}
