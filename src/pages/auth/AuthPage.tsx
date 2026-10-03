import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GraduationCap, Globe, Building2, PlusCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../types'
import { supabase } from '../../lib/supabase'

export function AuthPage() {
  const { t, i18n } = useTranslation()
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'signup' | 'setup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [role, setRole] = useState<Role>('parent_tuteur')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundSchool, setFoundSchool] = useState<{ id: string; name: string } | null>(null)

  // Setup mode fields
  const [schoolName, setSchoolName] = useState('')
  const [schoolCity, setSchoolCity] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')

  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en'

  function toggleLang() {
    i18n.changeLanguage(currentLang === 'fr' ? 'en' : 'fr')
  }

  async function checkSchoolCode() {
    if (!schoolCode.trim()) return
    const { data, error } = await supabase
      .from('schools')
      .select('id, name')
      .eq('code', schoolCode.trim())
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      setError(t('auth.invalidSchoolCode'))
      setFoundSchool(null)
    } else {
      setError('')
      setFoundSchool({ id: data.id, name: data.name })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(t('auth.loginError'))
        setLoading(false)
      } else {
        navigate('/dashboard')
      }
    } else if (mode === 'signup') {
      if (password.length < 6) {
        setError(t('auth.passwordMin'))
        setLoading(false)
        return
      }
      if (!foundSchool) {
        setError(t('auth.invalidSchoolCode'))
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, firstName, lastName, phone, role, foundSchool.id)
      if (error) {
        setError(t('auth.signupError'))
        setLoading(false)
      } else {
        // Auto sign in after signup
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          setError(t('auth.loginError'))
          setLoading(false)
        } else {
          navigate('/dashboard')
        }
      }
    } else if (mode === 'setup') {
      if (password.length < 6) {
        setError(t('auth.passwordMin'))
        setLoading(false)
        return
      }
      if (!schoolName || !schoolCode) {
        setError(t('common.required'))
        setLoading(false)
        return
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-school`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: schoolName,
          school_code: schoolCode,
          school_address: schoolAddress,
          school_city: schoolCity,
          school_phone: schoolPhone,
          school_email: schoolEmail,
          admin_email: email,
          admin_password: password,
          admin_first_name: firstName,
          admin_last_name: lastName,
          admin_phone: phone,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        setError(errData.error || t('auth.signupError'))
        setLoading(false)
        return
      }

      // Auto sign in
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(t('auth.loginError'))
        setLoading(false)
      } else {
        navigate('/dashboard')
      }
    }
  }

  const roleOptions: { value: Role; label: string }[] = [
    { value: 'direction', label: t('roles.direction') },
    { value: 'enseignant', label: t('roles.enseignant') },
    { value: 'parent_tuteur', label: t('roles.parent_tuteur') },
    { value: 'gardien', label: t('roles.gardien') },
    { value: 'caisse', label: t('roles.caisse') },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Left side - branding */}
      <div className="lg:w-2/5 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex flex-col justify-center items-center p-8 lg:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48" />

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SchoolSafe</h1>
              <p className="text-sm text-white/70">{t('app.tagline')}</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-3 leading-tight">{t('auth.welcome')}</h2>
          <p className="text-white/70 text-lg mb-8">{t('auth.welcomeText')}</p>

          <div className="space-y-3 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
              {t('roles.admin_principal')}, {t('roles.direction')}, {t('roles.enseignant')}, {t('roles.parent_tuteur')}, {t('roles.gardien')}, {t('roles.caisse')}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
              {currentLang === 'fr' ? 'Données sécurisées et isolées par école' : 'Data secured and isolated per school'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-400" />
              {currentLang === 'fr' ? 'Bilingue FR / EN — PWA' : 'Bilingual FR / EN — PWA'}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="lg:w-3/5 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'login' ? t('auth.login') : mode === 'signup' ? t('auth.signup') : t('auth.adminSetup')}
            </h2>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Globe size={16} />
              <span className="uppercase">{currentLang}</span>
            </button>
          </div>

          {mode === 'setup' && (
            <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700 mb-4">
              {t('auth.adminSetupDesc')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Setup mode: school fields */}
            {mode === 'setup' && (
              <>
                <div>
                  <label className="label">{t('auth.schoolName')}</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">{t('auth.schoolCode')}</label>
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="ESC001"
                    className="input"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('students.city')}</label>
                    <input
                      type="text"
                      value={schoolCity}
                      onChange={(e) => setSchoolCity(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">{t('common.phone')}</label>
                    <input
                      type="tel"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('auth.adminSetup')}</p>
                </div>
              </>
            )}

            {/* Signup mode: school code */}
            {mode === 'signup' && (
              <div>
                <label className="label">{t('auth.schoolCode')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={schoolCode}
                      onChange={(e) => {
                        setSchoolCode(e.target.value)
                        setFoundSchool(null)
                      }}
                      placeholder={t('auth.schoolCodeHint')}
                      className="input pl-10"
                      required
                    />
                  </div>
                  <button type="button" onClick={checkSchoolCode} className="btn-secondary whitespace-nowrap">
                    {t('common.confirm')}
                  </button>
                </div>
                {foundSchool && (
                  <p className="text-xs text-accent-600 mt-1.5">✓ {foundSchool.name}</p>
                )}
              </div>
            )}

            {/* Common fields for signup and setup */}
            {(mode === 'signup' || mode === 'setup') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('auth.firstName')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t('auth.lastName')}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{t('auth.phone')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                  />
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="label">{t('auth.role')}</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="input"
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? (mode === 'login' ? t('auth.signingIn') : t('auth.creatingAccount'))
                : (mode === 'login' ? t('auth.loginButton') : mode === 'signup' ? t('auth.signupButton') : t('auth.adminSetup'))
              }
            </button>
          </form>

          <div className="flex flex-col items-center gap-2 mt-6">
            {mode === 'login' && (
              <>
                <p className="text-sm text-gray-500">
                  {t('auth.noAccount')}{' '}
                  <button
                    onClick={() => { setMode('signup'); setError('') }}
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    {t('auth.signup')}
                  </button>
                </p>
                <button
                  onClick={() => { setMode('setup'); setError('') }}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <PlusCircle size={14} />
                  {t('auth.adminSetup')}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-gray-500">
                {t('auth.haveAccount')}{' '}
                <button
                  onClick={() => { setMode('login'); setError('') }}
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  {t('auth.login')}
                </button>
              </p>
            )}
            {mode === 'setup' && (
              <p className="text-sm text-gray-500">
                {t('auth.haveAccount')}{' '}
                <button
                  onClick={() => { setMode('login'); setError('') }}
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  {t('auth.login')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
