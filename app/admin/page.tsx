"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store/persona-store";
import { SynapseHeader } from "@/components/synapse/synapse-header";
import { FairnessDashboard } from "@/components/synapse/fairness-dashboard";
import { PolicyEditor } from "@/components/synapse/policy-editor";
import { AuditViewer } from "@/components/synapse/audit-viewer";
import { OpsPanel } from "@/components/synapse/ops-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

const ADMIN_ROLES = ["admin", "lab_manager"] as const;

export default function AdminPage() {
  const { persona, personas, loadPersonas } = usePersonaStore();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (personas.length === 0) loadPersonas();
  }, [personas.length, loadPersonas]);

  // SSR-safe: render nothing until client is mounted
  if (!hasMounted) {
    return null;
  }

  const hasAccess =
    persona && ADMIN_ROLES.includes(persona.role as (typeof ADMIN_ROLES)[number]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <SynapseHeader />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <Card className="p-10 space-y-3">
            <h1 className="text-xl font-semibold">Access restricted</h1>
            <p className="text-muted-foreground text-sm">
              Switch to <span className="font-medium text-foreground">Nimal (Lab Manager)</span> or{" "}
              <span className="font-medium text-foreground">System Admin</span> to access the console.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SynapseHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logged in as{" "}
            <span className="font-medium text-foreground">{persona.full_name}</span>{" "}
            <span className="text-muted-foreground">({persona.role})</span>
          </p>
        </div>

        <Tabs defaultValue="fairness">
          <TabsList className="mb-6">
            <TabsTrigger value="fairness">Fairness</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="ops">Ops</TabsTrigger>
          </TabsList>

          <TabsContent value="fairness">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Fairness dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Served hours vs fair share per member per resource class. High γ = under-served; γ ≈ 0 with excess served = over-served.
                </p>
              </div>
              <FairnessDashboard />
            </div>
          </TabsContent>

          <TabsContent value="policy">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Policy settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Edit scoring weights and operational thresholds. Changes take effect on the next booking or rebalance.
                </p>
              </div>
              <PolicyEditor />
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Audit log</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last 50 events, newest first. Expand any row to see the decision explainer and payload.
                </p>
              </div>
              <AuditViewer />
            </div>
          </TabsContent>

          <TabsContent value="ops">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Operations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manually trigger engine operations. Results appear inline and in the audit log.
                </p>
              </div>
              <OpsPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
