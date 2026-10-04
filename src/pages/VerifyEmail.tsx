import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, MailCheck, RotateCw, Mail } from 'lucide-react'

interface LocationState {
  email?: string
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { email: initialEmail } = (location.state ?? {}) as LocationState

  const [email, setEmail] = useState(initialEmail ?? '')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!initialEmail) {
      navigate('/login', { replace: true })
    }
  }, [initialEmail, navigate])

  function handleCodeChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputsRef.current[5]?.focus()
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code')
      return
    }

    setLoading(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de vérification')
      }

      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de vérification')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResendSuccess(false)
    setResending(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      setResendSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Email vérifié !</h1>
          <p className="text-slate-500 mb-6">
            Votre compte est maintenant vérifié. Vous allez être redirigé vers la connexion...
          </p>
          <Loader2 size={20} className="animate-spin text-primary-500 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={28} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Vérifiez votre email</h1>
          <p className="text-sm text-slate-500">
            Un email de vérification a été envoyé à<br />
            <span className="font-semibold text-slate-700">{email}</span>
          </p>
        </div>

        {/* Info box — link-based verification */}
        <div className="mb-4 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-sm text-primary-800">
          <div className="flex items-start gap-2">
            <Mail size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Vérification par lien</p>
              <p className="mt-1">Ouvrez votre boîte email et cliquez sur le lien de confirmation pour vérifier votre compte. Vous pouvez aussi saisir le code à 6 chiffres ci-dessous si votre email en contient un.</p>
            </div>
          </div>
        </div>

        {resendSuccess && (
          <div className="mb-4 bg-success-50 border border-success-200 rounded-lg px-4 py-3 text-sm text-success-700">
            Un nouvel email de vérification a été envoyé. Vérifiez votre boîte de réception.
          </div>
        )}

        <form onSubmit={handleVerify} className="card p-6 space-y-4">
          <div>
            <label className="label text-center">Code de vérification (6 chiffres)</label>
            <div className="flex gap-1 sm:gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Vérification...
              </>
            ) : (
              'Vérifier mon email'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
          >
            {resending ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
            Renvoyer l'email de vérification
          </button>
          <br />
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
