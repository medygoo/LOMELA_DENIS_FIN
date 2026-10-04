import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [yearName, setYearName] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/setup-school`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          schoolName,
          schoolCode,
          city,
          phone,
          yearName,
          yearStart,
          yearEnd,
          firstName,
          lastName,
          email,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-2xl mx-auto w-full p-6 lg:p-12">
        <Link to="/login" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8">
          <ArrowLeft size={16} />
          Retour à la connexion
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img src="/schoolsafe-logo.jpg" alt="SchoolSafe" className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Créer mon école</h1>
            <p className="text-sm text-slate-500">Inscription d'une nouvelle école sur SchoolSafe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* School info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Informations de l'école</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nom de l'école *</label>
                <input className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Code de l'école *</label>
                <input className="input" placeholder="ex: MONCODE001" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required />
              </div>
              <div>
                <label className="label">Ville</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* School year */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Année scolaire</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Nom *</label>
                <input className="input" placeholder="2026-2027" value={yearName} onChange={(e) => setYearName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Début *</label>
                <input type="date" className="input" value={yearStart} onChange={(e) => setYearStart(e.target.value)} required />
              </div>
              <div>
                <label className="label">Fin *</label>
                <input type="date" className="input" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Admin account */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Compte administrateur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom *</label>
                <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email *</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Mot de passe * (min. 6 caractères)</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer mon école'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
