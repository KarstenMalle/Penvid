// File: frontend/src/app/settings/profile/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLocalization } from '@/context/LocalizationContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/ui/icons'
import toast from 'react-hot-toast'

// API request timeout (in milliseconds)
const API_TIMEOUT = 5000

export default function ProfileSettingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { t } = useLocalization()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Load user profile data
  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push('/login?redirect=/settings/profile')
      return
    }

    // Function to fetch profile
    const fetchProfile = async () => {
      try {
        setLoading(true)

        // Setup timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

        const response = await fetch('/api/profile', {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.data?.profile) {
          const profile = data.data.profile
          setName(profile.name || '')
          setEmail(profile.email || user.email || '')
          setPhone(profile.phone_number || '')
          setAvatarUrl(profile.avatar_url || '')
        } else {
          // Set defaults from user object
          setEmail(user.email || '')
          setName(user.displayName || user.email?.split('@')[0] || '')
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error(t('profile.failedToLoadProfile'))

        // Set defaults from user object
        setEmail(user.email || '')
        setName(user.displayName || user.email?.split('@')[0] || '')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, isAuthenticated, authLoading, router, t])

  // Handle profile update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !isAuthenticated) {
      toast.error(t('profile.mustBeLoggedIn'))
      return
    }

    setSaving(true)

    try {
      // Setup timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          name,
          phone_number: phone,
          avatar_url: avatarUrl,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`)
      }

      toast.success(t('profile.updatedSuccessfully'))
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(t('profile.failedToUpdate'))
    } finally {
      setSaving(false)
    }
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return email?.substring(0, 2).toUpperCase() || 'U'
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <div className="flex justify-center items-center py-16">
          <Icons.spinner className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (!isAuthenticated || !user) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.unauthorized')}</CardTitle>
            <CardDescription>{t('profile.pleaseLogin')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => router.push('/login?redirect=/settings/profile')}
            >
              {t('common.signIn')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{t('profile.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.profilePicture')}</CardTitle>
              <CardDescription>{t('profile.howYouAppear')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="bg-blue-600 text-white text-4xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <Button disabled className="mt-2" variant="outline">
                {t('profile.uploadImage')}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('common.comingSoon')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo')}</CardTitle>
              <CardDescription>{t('profile.updateDetails')}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('profile.name')}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('profile.yourName')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('profile.email')}</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    {t('profile.emailCannotBeChanged')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('profile.phone')}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('profile.yourPhone')}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('profile.update')
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
