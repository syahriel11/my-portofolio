import { useEffect, useState } from 'react'
import { supabase } from "../../supabase";
import { Award, Upload, Trash2, ImageIcon, Plus, Trophy, BookOpen, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { convertPdfToImage, isPdfFile } from '../../utils/pdfHelper'

const Card = ({ children, className = '' }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-500" />
    <div className="relative bg-white/5 backdrop-blur-xl border border-white/12 rounded-2xl h-full">
      {children}
    </div>
  </div>
)

const SkeletonCard = () => (
  <div className="relative">
    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] rounded-2xl blur opacity-10" />
    <div className="relative bg-white/5 border border-white/12 rounded-2xl overflow-hidden">
      <div className="w-full aspect-[16/11.5] bg-white/5 animate-pulse" />
    </div>
  </div>
)

const CertCard = ({ cert, onDelete }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const isPdf = isPdfFile(cert.img)

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-500" />
      <div className="relative bg-white/5 border border-white/12 rounded-2xl overflow-hidden">
        {isPdf ? (
          <div className="w-full aspect-[16/11.5] bg-[#0c0d24] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-2 shadow-lg">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-xs font-semibold text-gray-200">
              Dokumen PDF
            </span>
            <a
              href={cert.img}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
            >
              Lihat PDF <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <>
            {!imgLoaded && <div className="w-full aspect-[16/11.5] bg-white/5 animate-pulse" />}
            <img
              src={cert.img}
              alt="Certificate"
              onLoad={() => setImgLoaded(true)}
              className={`w-full aspect-[16/11.5] object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'block' : 'hidden'}`}
            />
          </>
        )}
        {(isPdf || imgLoaded) && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-end justify-between p-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              cert.category === 'prestasi' 
                ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300' 
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
            }`}>
              {cert.category === 'prestasi' ? '🏆 Prestasi' : '📚 Keahlian'}
            </span>
            <button
              onClick={() => onDelete(cert.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs w-full justify-center hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Certificates() {
  const [certs, setCerts] = useState([])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [converting, setConverting] = useState(false)
  const [originalPdfName, setOriginalPdfName] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('keahlian')
  const [activeTab, setActiveTab] = useState('semua')

  const fetchCerts = async () => {
    setLoading(true)
    const { data } = await supabase.from('certificates').select('*').order('created_at', { ascending: false })
    setCerts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCerts() }, [])

  const handleFile = async (f) => {
    if (!f) return
    if (isPdfFile(f)) {
      setConverting(true)
      try {
        const { file: convertedFile, previewUrl } = await convertPdfToImage(f)
        setFile(convertedFile)
        setPreview(previewUrl)
        setOriginalPdfName(f.name)
      } catch (err) {
        console.error('Error processing PDF:', err)
        alert(`⚠️ Gagal memproses file PDF: ${err.message || 'Format tidak didukung'}`)
      } finally {
        setConverting(false)
      }
    } else {
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setOriginalPdfName(null)
    }
  }

  const uploadImage = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fileName = `cert-${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      
      // Prioritaskan nama standar 'certificate-images', fallback ke 'certificate-image' jika belum diubah
      let bucketName = 'certificate-images'
      let { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file)

      if (uploadError && (uploadError.statusCode === '404' || uploadError.message?.includes('Bucket not found'))) {
        bucketName = 'certificate-image'
        const retry = await supabase.storage.from(bucketName).upload(fileName, file)
        uploadError = retry.error
      }

      if (uploadError) {
        throw new Error(
          `Gagal upload gambar ke Storage (${uploadError.message}). ` +
          `Pastikan di Supabase menu Storage > Policies sudah diberi izin upload/insert.`
        )
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
      const { error: insertError } = await supabase
        .from('certificates')
        .insert({ img: data.publicUrl, category })

      if (insertError) {
        throw new Error(
          `Gagal menyimpan ke tabel certificates (${insertError.message}). ` +
          `Pastikan RLS pada tabel 'certificates' sudah dinonaktifkan di Supabase SQL Editor.`
        )
      }

      setFile(null)
      setPreview(null)
      setOriginalPdfName(null)
      await fetchCerts()
      alert('✅ Sertifikat berhasil diunggah!')
    } catch (err) {
      console.error('Error uploading certificate:', err)
      alert(`⚠️ ${err.message || 'Terjadi kesalahan saat upload.'}`)
    } finally {
      setUploading(false)
    }
  }

  const deleteCert = async (id) => {
    if (!confirm('Hapus sertifikat ini?')) return
    try {
      const { error } = await supabase.from('certificates').delete().eq('id', id)
      if (error) throw error
      fetchCerts()
    } catch (err) {
      console.error('Error deleting certificate:', err)
      alert(`⚠️ Gagal menghapus sertifikat: ${err.message}`)
    }
  }

  const filteredCerts = activeTab === 'semua' ? certs : certs.filter(c => c.category === activeTab)

  const prestasiCount = certs.filter(c => c.category === 'prestasi').length
  const keahlianCount = certs.filter(c => c.category === 'keahlian').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] rounded-xl blur opacity-50" />
          <div className="relative w-9 h-9 bg-[#030014] rounded-xl border border-white/15 flex items-center justify-center">
            <Award className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Certificates</h1>
          <p className="text-gray-500 text-xs">
            {loading ? 'Loading...' : `${certs.length} total · ${prestasiCount} prestasi · ${keahlianCount} keahlian`}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {[
          { key: 'semua', label: 'Semua', count: certs.length },
          { key: 'prestasi', label: '🏆 Prestasi', count: prestasiCount },
          { key: 'keahlian', label: '📚 Keahlian', count: keahlianCount },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            {tab.label}
            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Upload Card */}
      <Card>
        <div className="p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> Upload Certificate
          </h2>

          {/* Category Selector */}
          <div className="flex gap-3">
            <button onClick={() => setCategory('keahlian')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                category === 'keahlian'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}>
              <BookOpen className="w-4 h-4" /> Keahlian
            </button>
            <button onClick={() => setCategory('prestasi')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                category === 'prestasi'
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}>
              <Trophy className="w-4 h-4" /> Prestasi
            </button>
          </div>

          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            className={`relative flex flex-col items-center justify-center w-full min-h-[160px] rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden ${
              dragOver ? 'border-blue-400/60 bg-blue-500/10' : 'border-white/12 bg-white/4 hover:border-blue-500/35 hover:bg-white/7'
            }`}>
            {converting ? (
              <div className="text-center space-y-2 p-6">
                <Loader2 className="w-9 h-9 text-blue-400 animate-spin mx-auto" />
                <p className="text-sm text-blue-300 font-medium">Memproses file PDF...</p>
                <p className="text-xs text-gray-500">Mengekstrak halaman sertifikat menjadi gambar</p>
              </div>
            ) : preview ? (
              <div className="relative w-full flex items-center justify-center p-3">
                <img src={preview} alt="preview" className="max-h-48 object-contain rounded-lg shadow-lg" />
                {originalPdfName && (
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-red-500/80 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg border border-red-400/30">
                    <FileText className="w-3.5 h-3.5" /> PDF Converted
                  </span>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2 p-6">
                <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-sm text-gray-300">Drag & drop or click to upload</p>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP, PDF supported</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*,.pdf,application/pdf" 
              onChange={e => handleFile(e.target.files[0])} 
              className="hidden" 
              disabled={converting}
            />
          </label>

          {file && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {originalPdfName ? (
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                <p className="text-xs text-gray-300 truncate">
                  {originalPdfName ? `${originalPdfName} (dikonversi ke JPG)` : file.name}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setFile(null); setPreview(null); setOriginalPdfName(null) }}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-gray-500 hover:text-white text-xs transition-colors">
                  Clear
                </button>
                <button onClick={uploadImage} disabled={uploading || converting} className="relative group/u">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563eb] to-[#0891b2] rounded-xl opacity-60 blur group-hover/u:opacity-100 transition duration-300" />
                  <div className="relative flex items-center gap-2 px-4 py-1.5 bg-[#030014] rounded-xl border border-white/10">
                    {uploading ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="text-xs text-gray-200">{uploading ? 'Uploading...' : 'Upload'}</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredCerts.length === 0 ? (
        <Card>
          <div className="p-16 text-center">
            <Award className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No certificates yet.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredCerts.map(cert => (
            <CertCard key={cert.id} cert={cert} onDelete={deleteCert} />
          ))}
        </div>
      )}
    </div>
  )
}