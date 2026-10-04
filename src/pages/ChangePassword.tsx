import { useState } from 'react'
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ChangePassword() {
  const { session, signOut, refreshProfile } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins une lettre et un chiffre')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSaving(true)

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-password`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ newPassword }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        setError(data.error || 'Erreur lors du changement de mot de passe')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)

      // Refresh profile to clear must_change_password
      await refreshProfile()

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/schoolsafe-logo.jpg" alt="SchoolSafe" className="w-12 h-12 rounded-lg object-cover" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">SchoolSafe</h1>
            <p className="text-sm text-slate-500">Créer votre nouveau mot de passe</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-100 flex items-center justify-center">
              <Lock className="text-success-600" size={28} />
            </div>
            <p className="text-slate-900 font-semibold mb-2">Mot de passe modifié avec succès</p>
            <p className="text-sm text-slate-500">Redirection en cours...</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                Pour votre sécurité, vous devez créer un nouveau mot de passe personnel avant d'accéder à SchoolSafe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="Minimum 8 caractères, 1 lettre et 1 chiffre"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirmer le nouveau mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Retapez votre nouveau mot de passe"
                />
              </div>

              {error && (
                <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={signOut} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
