import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, Check, Building2, Calendar, UserCircle } from 'lucide-react'

type Step = 1 | 2 | 3

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Étape A — École
  const [schoolName, setSchoolName] = useState('')
  const [schoolShortName, setSchoolShortName] = useState('')
  const [levels, setLevels] = useState('')
  const [country, setCountry] = useState('Sénégal')
  const [city, setCity] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')

  // Étape B — Année scolaire
  const [yearName, setYearName] = useState('2026-2027')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')

  // Étape C — Responsable
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userFunction, setUserFunction] = useState('Directeur')
  const [adminPhone, setAdminPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const stepLabels = ['Établissement', 'Année scolaire', 'Responsable']

  function validateStep(s: Step): string | null {
    if (s === 1) {
      if (!schoolName.trim()) return 'Le nom de l\'établissement est obligatoire'
    }
    if (s === 2) {
      if (!yearName.trim()) return 'L\'année scolaire est obligatoire'
      if (s === 2 && !yearStart) return 'La date de début est obligatoire'
      if (s === 2 && !yearEnd) return 'La date de fin est obligatoire'
    }
    if (s === 3) {
      if (!firstName.trim()) return 'Le prénom est obligatoire'
      if (!lastName.trim()) return 'Le nom est obligatoire'
      if (!email.trim()) return 'L\'email est obligatoire'
      if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères'
      if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas'
    }
    return null
  }

  function nextStep() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    if (step < 3) setStep((step + 1) as Step)
  }

  function prevStep() {
    setError(null)
    if (step > 1) setStep((step - 1) as Step)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateStep(3)
    if (err) { setError(err); return }

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
          schoolShortName,
          levels,
          country,
          city,
          commune,
          address,
          phone: schoolPhone,
          schoolEmail,
          yearName,
          yearStart,
          yearEnd,
          firstName,
          lastName,
          function: userFunction,
          adminPhone,
          email,
          password,
          passwordConfirm,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      // Navigate to verification page — code is sent by email, never passed in state
      navigate('/verify-email', {
        state: {
          email,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 lg:p-12">
        <Link to="/login" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft size={16} />
          Retour à la connexion
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <img src="/schoolsafe-logo.jpg" alt="SchoolSafe" className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Créer mon école</h1>
            <p className="text-sm text-slate-500">Inscription d'un nouvel établissement sur SchoolSafe</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as Step
            const isActive = step === stepNum
            const isDone = step > stepNum
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${isActive || isDone ? 'text-primary-700' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isDone ? 'bg-primary-600 text-white' : isActive ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isDone ? <Check size={16} /> : stepNum}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-primary-300' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Étape A — Établissement */}
          {step === 1 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={18} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-900">Informations de l'établissement</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                L'identifiant technique de votre école sera généré automatiquement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nom officiel de l'école *</label>
                  <input className="input" placeholder="ex: École Le Sage" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Nom court (facultatif)</label>
                  <input className="input" placeholder="ex: Le Sage" value={schoolShortName} onChange={(e) => setSchoolShortName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Niveaux enseignés</label>
                  <select className="input" value={levels} onChange={(e) => setLevels(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    <option value="maternelle">Maternelle</option>
                    <option value="primaire">Primaire</option>
                    <option value="secondaire">Secondaire</option>
                    <option value="maternelle,primaire">Maternelle + Primaire</option>
                    <option value="primaire,secondaire">Primaire + Secondaire</option>
                    <option value="maternelle,primaire,secondaire">Tous niveaux</option>
                  </select>
                </div>
                <div>
                  <label className="label">Pays</label>
                  <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <label className="label">Ville</label>
                  <input className="input" placeholder="ex: Dakar" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="label">Commune</label>
                  <input className="input" placeholder="ex: Plateau" value={commune} onChange={(e) => setCommune(e.target.value)} />
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="label">Téléphone de l'école</label>
                  <input className="input" placeholder="+221 ..." value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email de l'école</label>
                  <input type="email" className="input" placeholder="contact@ecole.edu" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Étape B — Année scolaire */}
          {step === 2 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-900">Année scolaire</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Vous créerez les classes plus tard. Pour l'instant, indiquez seulement l'année en cours.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Année scolaire *</label>
                  <input className="input" placeholder="2026-2027" value={yearName} onChange={(e) => setYearName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Début *</label>
                  <input type="date" className="input" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
                </div>
                <div>
                  <label className="label">Fin *</label>
                  <input type="date" className="input" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Étape C — Responsable */}
          {step === 3 && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle size={18} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-900">Premier responsable</h3>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Cette personne devient l'administrateur principal de l'école.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom *</label>
                  <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Nom *</label>
                  <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Fonction</label>
                  <select className="input" value={userFunction} onChange={(e) => setUserFunction(e.target.value)}>
                    <option value="Directeur">Directeur</option>
                    <option value="Promoteur">Promoteur</option>
                    <option value="Administrateur">Administrateur</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Si vous êtes directeur, vous recevrez automatiquement le rôle Direction en plus d'administrateur.
                  </p>
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input className="input" placeholder="+221 ..." value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Mot de passe * (min. 6 caractères)</label>
                  <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <label className="label">Confirmer le mot de passe *</label>
                  <input type="password" className="input" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 justify-between">
            {step > 1 ? (
              <button type="button" onClick={prevStep} className="btn-secondary">
                <ArrowLeft size={16} />
                Précédent
              </button>
            ) : <div />}

            {step < 3 ? (
              <button type="button" onClick={nextStep} className="btn-primary">
                Suivant
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer mon école'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
