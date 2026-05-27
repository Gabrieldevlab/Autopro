'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Workshop } from '@/types'

interface ProfileWithWorkshop extends Profile {
  workshops: Workshop | null
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileWithWorkshop | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*, workshops(*)')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  return { profile, loading }
}
