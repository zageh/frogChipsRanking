'use client'
import { useState } from 'react'
import supabase from '../../utils/supabase'

export default function UploadChipBatch() {
  const [files, setFiles] = useState([])
  const [chips, setChips] = useState([])
  const [loading, setLoading] = useState(false)

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

  const handleChipChange = (index, field, value) => {
    const newChips = [...chips]
    newChips[index][field] = value
    setChips(newChips)
  }

  const handleUpload = async () => {
    setLoading(true)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const chip = chips[i]
      const filename = `chips/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('imagesForChips')
        .upload(filename, file)

      if (uploadError) {
        console.error(uploadError)
        continue
      }

      const { error: dbError } = await supabase
        .from('chips')
        .insert({
          name: chip.name,
          brand: chip.brand,
          description: chip.description,
          admin_rating: parseFloat(chip.admin_rating) || 0,
