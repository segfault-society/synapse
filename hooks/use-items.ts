"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/store/auth-store"
import { sanitizeError } from "@/lib/utils"

export interface Item {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)
  const supabase = createClient()

  const fetchItems = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error("Fetch items error:", err)
      }
      setError(sanitizeError(err))
    } finally {
      setLoading(false)
    }
  }

  const createItem = async (item: { title: string; description?: string; image_url?: string }) => {
    if (!userId) return null

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("items")
        .insert([{ ...item, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      setItems((prev) => [data, ...prev])
      return data
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Create item error:", err)
      }
      setError(sanitizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (id: string, updates: Partial<Item>) => {
    if (!userId) return null

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) throw error
      setItems((prev) => prev.map((item) => (item.id === id ? data : item)))
      return data
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Update item error:", err)
      }
      setError(sanitizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    if (!userId) return false

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (error) throw error
      setItems((prev) => prev.filter((item) => item.id !== id))
      return true
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Delete item error:", err)
      }
      setError(sanitizeError(err))
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [userId])

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}
