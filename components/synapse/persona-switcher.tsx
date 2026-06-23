"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store/persona-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function PersonaSwitcher() {
  const persona = usePersonaStore((s) => s.persona);
  const personas = usePersonaStore((s) => s.personas);
  const loadPersonas = usePersonaStore((s) => s.loadPersonas);
  const setPersona = usePersonaStore((s) => s.setPersona);

  // SSR hydration guard — mirrors items-list.tsx hasMounted pattern
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    loadPersonas();
  }, [loadPersonas]);

  if (!hasMounted) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={persona?.id ?? ""} onValueChange={setPersona}>
        <SelectTrigger size="sm" className="min-w-[160px]">
          <SelectValue placeholder="Select persona" />
        </SelectTrigger>
        <SelectContent>
          {personas.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name} — {m.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {persona && (
        <Badge variant="secondary" className="capitalize">
          {persona.role}
        </Badge>
      )}
    </div>
  );
}
