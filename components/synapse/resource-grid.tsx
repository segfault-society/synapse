"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResources } from "@/hooks/use-resources";
import { ResourceCard } from "@/components/synapse/resource-card";

const RESOURCE_CLASSES = [
  "meeting_room",
  "computer_lab",
  "multimedia_equipment",
  "testing_device",
] as const;

function humanizeResourceClass(cls: string): string {
  return cls
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ResourceGrid() {
  const { resources, loading } = useResources();
  const [hasMounted, setHasMounted] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [minCapacity, setMinCapacity] = useState<string>("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const buildings = useMemo(() => {
    const seen = new Set<string>();
    for (const r of resources) {
      if (r.building) seen.add(r.building);
    }
    return Array.from(seen).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    const minCap = minCapacity !== "" ? parseInt(minCapacity, 10) : 0;
    return resources.filter((r) => {
      if (classFilter !== "all" && r.resource_class !== classFilter) return false;
      if (buildingFilter !== "all" && r.building !== buildingFilter) return false;
      if (minCap > 0 && r.capacity < minCap) return false;
      return true;
    });
  }, [resources, classFilter, buildingFilter, minCapacity]);

  if (!hasMounted || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {RESOURCE_CLASSES.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {humanizeResourceClass(cls)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={0}
          placeholder="Min capacity"
          value={minCapacity}
          onChange={(e) => setMinCapacity(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          No resources match the selected filters.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
