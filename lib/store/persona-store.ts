"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/synapse/types";

interface PersonaState {
  persona: Member | null;
  personas: Member[];
  loadPersonas: () => Promise<void>;
  setPersona: (id: string) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      persona: null,
      personas: [],
      loadPersonas: async () => {
        const supabase = createClient();
        const { data } = await supabase.from("members").select("*").order("created_at");
        const personas = data ?? [];
        set({ personas });
        if (!get().persona && personas.length) set({ persona: personas[0] });
      },
      setPersona: (id) => {
        const p = get().personas.find((m) => m.id === id) ?? null;
        if (p) set({ persona: p });
      },
    }),
    { name: "synapse-persona", partialize: (s) => ({ persona: s.persona }) },
  ),
);
