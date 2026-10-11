import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, KeyRound, Sparkles, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRecoveryValid, setIsRecoveryValid] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Periksa status sesi pemulihan dari Supabase
    const checkRecovery = async () => {
      // Supabase secara otomatis membaca access_token dari URL hash / query
      const { data: { session } } = await supabase.auth.getSession()
      
      // Dengarkan jika ada event PASSWORD_RECOVERY
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryValid(true)
        }
      })

      // Jika URL memiliki hash token pemulihan atau sesi aktif
      const hash = window.location.hash
      if (!session && !hash.includes('access_token') && !hash.includes('type=recovery')) {
        // Jika tidak ada token recovery dan tidak ada session
        // Kita beri toleransi sedikit waktu untuk Supabase memproses URL hash
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession && !window.location.hash.includes('access_token')) {
            setIsRecoveryValid(false)
          }
        }, 1200)
      }

      return () => {
        authListener?.subscription?.unsubscribe()
      }
    }

    checkRecovery()
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Terlalu Pendek',
        text: 'Password minimal terdiri dari 6 karakter.',
        background: '#0a0a1a',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
      })
      return
    }

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Tidak Cocok',
        text: 'Konfirmasi password harus sama dengan password baru.',
        background: '#0a0a1a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      })
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengubah Password',
          text: error.message || 'Tautan pemulihan mungkin sudah kedaluwarsa.',
          background: '#0a0a1a',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        })
      } else {
        setIsSuccess(true)
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Password Anda telah berhasil diperbarui. Silakan login kembali.',
          background: '#0a0a1a',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
        })
        navigate('/login')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: err.message || 'Gagal menghubungi server.',
        background: '#0a0a1a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-700" />
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-8 space-y-7">

            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-300 text-xs font-medium">Pemulihan Akun</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Buat Password Baru</h1>
              <p className="text-gray-400 text-sm">
                Masukkan password baru yang aman untuk akun admin portal Anda
              </p>
            </div>

            {!isRecoveryValid && !isSuccess ? (
              <div className="space-y-5 text-center">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
                  Tautan pemulihan ini tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru dari halaman login.
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Halaman Login
                </Link>
              </div>
            ) : isSuccess ? (
              <div className="space-y-5 text-center">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Password berhasil diperbarui!</span>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Masuk Sekarang
                </Link>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Password Baru</label>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl overflow-hidden focus-within:border-blue-500/60 transition-colors">
                    <Lock className="w-4 h-4 text-gray-500 ml-4 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="mr-4 shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Konfirmasi Password Baru</label>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl overflow-hidden focus-within:border-blue-500/60 transition-colors">
                    <KeyRound className="w-4 h-4 text-gray-500 ml-4 shrink-0" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ketik ulang password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="mr-4 shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="relative group/btn w-full mt-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563eb] to-[#0891b2] rounded-xl opacity-70 blur group-hover/btn:opacity-100 transition duration-300" />
                  <div className="relative h-11 bg-[#030014] rounded-xl border border-white/10 flex items-center justify-center gap-2 overflow-hidden">
                    <div className="absolute inset-0 scale-x-0 group-hover/btn:scale-x-100 origin-left transition-transform duration-500 bg-gradient-to-r from-[#2563eb]/20 to-[#0891b2]/20" />
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="relative text-sm font-medium text-white">Simpan Password Baru</span>
                        <KeyRound className="relative w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </div>
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Kembali ke Halaman Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
