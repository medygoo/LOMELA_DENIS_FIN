import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ShieldCheck, Loader2, AlertCircle, MailWarning } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNeedsVerification(false)
    setLoading(true)
    const result = await signIn(email, password)
    setLoading(false)

    if (result.needsVerification) {
      setNeedsVerification(true)
    } else if (result.error) {
      setError(result.error)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Branding */}
      <div className="flex-1 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 flex flex-col justify-center items-center p-8 lg:p-16 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="relative z-10 text-center max-w-md">
          <img
            src="/schoolsafe-logo.jpg"
            alt="SchoolSafe"
            className="w-24 h-24 rounded-2xl mx-auto mb-6 shadow-xl object-cover ring-4 ring-white/20"
          />
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">SchoolSafe</h1>
          <p className="text-lg text-primary-100 mb-8 leading-relaxed">
            « Chaque enfant protégé, chaque parent informé »
          </p>
          <div className="space-y-3 text-left">
    {[
      { icon: ShieldCheck, text: 'Suivi des entrées et sorties en temps réel' },
      { icon: ShieldCheck, text: 'Gestion des élèves, classes et notes' },
      { icon: ShieldCheck, text: 'Paiements et reçus sécurisés' },
      { icon: ShieldCheck, text: 'Personnes autorisées et QR codes' },
    ].map((item, i) => (
      <div key={i} className="flex items-center gap-3 text-primary-100">
        <item.icon size={20} className="flex-shrink-0" />
        <span className="text-sm">{item.text}</span>
      </div>
    ))}
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-slate-50">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connexion</h2>
          <p className="text-sm text-slate-500 mb-8">
            Accédez à votre espace SchoolSafe
          </p>

          {needsVerification && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MailWarning size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Email non vérifié</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Vérifiez votre boîte email : ouvrez l'email de confirmation et cliquez sur le lien, ou saisissez le code à 6 chiffres.
                  </p>
                  <button
                    onClick={() => navigate('/verify-email', { state: { email } })}
                    className="text-xs text-amber-800 font-medium underline mt-2"
                  >
                    Saisir mon code de vérification
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="vous@ecole.edu"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Nouvelle école ?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Créer mon école
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
