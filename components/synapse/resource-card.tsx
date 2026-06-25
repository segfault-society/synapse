"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import type { Resource } from "@/lib/synapse/types";
import { humanizeResourceClass, toStringArray } from "@/lib/synapse/format";

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const equipment = toStringArray(resource.equipment);

  return (
    <Link href={`/resources/${resource.id}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight">{resource.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {humanizeResourceClass(resource.resource_class)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {resource.building && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {resource.building}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {resource.capacity} seats
            </span>
          </div>

          {equipment.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {equipment.map((item) => (
                <Badge key={item} variant="outline" className="text-xs px-1.5 py-0">
                  {item}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={`h-2 w-2 rounded-full ${resource.is_available ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="text-xs text-muted-foreground">
              {resource.is_available ? "Available" : "Unavailable"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
