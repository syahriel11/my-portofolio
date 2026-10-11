import { useState } from 'react'
import { supabase } from "../supabase";
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, LogIn, Sparkles, Eye, EyeOff, Send, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { 
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: error.message,
        background: '#0a0a1a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      })
      setLoading(false)
      return 
    }

    navigate('/dashboard')
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Masukkan Email',
        text: 'Silakan isi email akun admin Anda terlebih dahulu.',
        background: '#0a0a1a',
        color: '#fff',
        confirmButtonColor: '#3b82f6',
      })
      return
    }

    setLoading(true)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengirim Email',
          text: error.message,
          background: '#0a0a1a',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        })
      } else {
        setResetEmailSent(true)
        Swal.fire({
          icon: 'success',
          title: 'Tautan Terkirim!',
          html: `Tautan pemulihan password telah dikirim ke <b>${email}</b>.<br><br><span style="font-size: 13px; color: #94a3b8;">Periksa kotak masuk (Inbox) atau folder Spam di email Anda, lalu klik tautan tersebut untuk membuat password baru.</span>`,
          background: '#0a0a1a',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: err.message || 'Gagal menghubungi server Supabase.',
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
                <span className="text-blue-300 text-xs font-medium">Admin Portal</span>
              </div>
              <h1 className="text-3xl font-bold text-white">
                {isForgotPassword ? 'Reset Password' : 'Welcome Back'}
              </h1>
              <p className="text-gray-400 text-sm">
                {isForgotPassword 
                  ? 'Masukkan email admin untuk menerima tautan pemulihan' 
                  : 'Sign in to manage your portfolio'}
              </p>
            </div>

            {/* Form */}
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Email Akun Admin</label>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl overflow-hidden focus-within:border-blue-500/60 transition-colors">
                    <Mail className="w-4 h-4 text-gray-500 ml-4 shrink-0" />
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 text-sm outline-none"
                    />
                  </div>
                </div>

                {resetEmailSent && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Email pemulihan sudah dikirim! Cek inbox atau spam email Anda.</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className="relative group/btn w-full mt-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563eb] to-[#0891b2] rounded-xl opacity-70 blur group-hover/btn:opacity-100 transition duration-300" />
                  <div className="relative h-11 bg-[#030014] rounded-xl border border-white/10 flex items-center justify-center gap-2 overflow-hidden">
                    <div className="absolute inset-0 scale-x-0 group-hover/btn:scale-x-100 origin-left transition-transform duration-500 bg-gradient-to-r from-[#2563eb]/20 to-[#0891b2]/20" />
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="relative text-sm font-medium text-white">
                          {resetEmailSent ? 'Kirim Ulang Tautan' : 'Kirim Tautan Reset'}
                        </span>
                        <Send className="relative w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </div>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false)
                      setResetEmailSent(false)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Kembali ke Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Email</label>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl overflow-hidden focus-within:border-blue-500/60 transition-colors">
                    <Mail className="w-4 h-4 text-gray-500 ml-4 shrink-0" />
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl overflow-hidden focus-within:border-blue-500/60 transition-colors">
                    <Lock className="w-4 h-4 text-gray-500 ml-4 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full bg-transparent px-3 py-3 text-gray-100 placeholder-gray-500 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="mr-4 shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="relative group/btn w-full mt-1">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2563eb] to-[#0891b2] rounded-xl opacity-70 blur group-hover/btn:opacity-100 transition duration-300" />
                  <div className="relative h-11 bg-[#030014] rounded-xl border border-white/10 flex items-center justify-center gap-2 overflow-hidden">
                    <div className="absolute inset-0 scale-x-0 group-hover/btn:scale-x-100 origin-left transition-transform duration-500 bg-gradient-to-r from-[#2563eb]/20 to-[#0891b2]/20" />
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="relative text-sm font-medium text-white">Sign In</span>
                        <LogIn className="relative w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </div>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}