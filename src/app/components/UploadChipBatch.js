'use client'
import { useState } from 'react'
import supabase from '../../utils/supabase'

export default function UploadChipBatch({ onUploadSuccess }) {
  const [files, setFiles] = useState([])
  const [chips, setChips] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  // 选择文件
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)
    setChips(selectedFiles.map(() => ({
      name: '',
      brand: '',
      description: '',
      admin_rating: ''
    })))
  }

  // 修改每个薯片信息
  const handleChipChange = (index, field, value) => {
    const newChips = [...chips]
    newChips[index][field] = value
    setChips(newChips)
  }

  // 上传逻辑
  const handleUpload = async () => {
    setLoading(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const chip = chips[i]
      const filename = `chips/${Date.now()}-${file.name}`

      // 上传到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("chipWarehouse") // bucket 名
        .upload(filename, file)

      if (uploadError) {
        console.error(uploadError)
        continue
      }

      // 获取公开链接
      const { data: publicUrlData } = supabase.storage
        .from("chipWarehouse")
        .getPublicUrl(filename)

      const imageUrl = publicUrlData?.publicUrl

      // 插入数据库
      const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            alert('请先登录 🐸🍟')
          return
            }

      const { error: dbError } = await supabase
        .from("chipWarehouse") // 表名
        .insert({
          name: chip.name,
          brand: chip.brand,
          description: chip.description,
          admin_rating: parseFloat(chip.admin_rating) || 0,
          image_url: imageUrl
        })

      if (dbError) {
        console.error(dbError)
      }
    }
    setLoading(false)
    setOpen(false)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 3000)

    if (onUploadSuccess) onUploadSuccess() // 刷新排行榜
  }

  return (
    <div>
      {/* 入口按钮：青蛙 emoji */}
      {!open && (
        <div style={{ cursor: 'pointer', fontSize: '2rem' }} onClick={() => setOpen(true)}>
          🐸
        </div>
      )}

      {open && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
          <h2>上传薯片 🍟</h2>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            accept="image/*"
          />
          {chips.map((chip, index) => (
            <div key={index}>
              <input
                type="text"
                placeholder="Name"
                value={chip.name}
                onChange={e => handleChipChange(index, 'name', e.target.value)}
              />
              <input
                type="text"
                placeholder="Brand"
                value={chip.brand}
                onChange={e => handleChipChange(index, 'brand', e.target.value)}
              />
              <input
                type="text"
                placeholder="Description"
                value={chip.description}
                onChange={e => handleChipChange(index, 'description', e.target.value)}
              />
              <input
                type="number"
                placeholder="Admin Rating"
                value={chip.admin_rating}
                onChange={e => handleChipChange(index, 'admin_rating', e.target.value)}
              />
            </div>
          ))}
          <button onClick={handleUpload} disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
          <button type="button" onClick={() => setOpen(false)}>取消</button>
        </div>
      )}

      {celebrate && (
        <div style={{ fontSize: '2rem', marginTop: '1rem', animation: 'bounce 1s infinite' }}>
          🐸🎉🍟 青蛙举起薯片庆祝！ 🍟🎉🐸
        </div>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>

    
  )
}
