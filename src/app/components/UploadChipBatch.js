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
            admin_rating: parseFloat(chip.admin_rating) || 0
                    })
              }
              setLoading(false)
            }
          
            return (
              <div>
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
              </div>
            )
          }
