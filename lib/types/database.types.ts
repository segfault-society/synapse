export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actor_id: string | null
          booking_id: string | null
          decision_explainer: Json | null
          id: string
          kind: Database["public"]["Enums"]["audit_kind"]
          occurred_at: string
          payload: Json
          request_id: string | null
          resource_id: string | null
        }
        Insert: {
          actor_id?: string | null
          booking_id?: string | null
          decision_explainer?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["audit_kind"]
          occurred_at?: string
          payload?: Json
          request_id?: string | null
          resource_id?: string | null
        }
        Update: {
          actor_id?: string | null
          booking_id?: string | null
          decision_explainer?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["audit_kind"]
          occurred_at?: string
          payload?: Json
          request_id?: string | null
          resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          checked_in_at: string | null
          created_at: string
          during: unknown
          id: string
          member_id: string
          purpose: string | null
          request_id: string | null
          resource_id: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          during: unknown
          id?: string
          member_id: string
          purpose?: string | null
          request_id?: string | null
          resource_id: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          during?: unknown
          id?: string
          member_id?: string
          purpose?: string | null
          request_id?: string | null
          resource_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      fairness_ledger: {
        Row: {
          fair_share: number
          fairness_term: number
          id: string
          member_id: string
          resource_class: Database["public"]["Enums"]["resource_class"]
          served_hours: number
          updated_at: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          fair_share?: number
          fairness_term?: number
          id?: string
          member_id: string
          resource_class: Database["public"]["Enums"]["resource_class"]
          served_hours?: number
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          fair_share?: number
          fairness_term?: number
          id?: string
          member_id?: string
          resource_class?: Database["public"]["Enums"]["resource_class"]
          served_hours?: number
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fairness_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_final_year: boolean
          role: Database["public"]["Enums"]["synapse_role"]
          year_level: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_final_year?: boolean
          role?: Database["public"]["Enums"]["synapse_role"]
          year_level?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_final_year?: boolean
          role?: Database["public"]["Enums"]["synapse_role"]
          year_level?: number | null
        }
        Relationships: []
      }
      policy_settings: {
        Row: {
          category: string | null
          id: string
          key: string
          label: string | null
          numeric_value: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          id?: string
          key: string
          label?: string | null
          numeric_value?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          id?: string
          key?: string
          label?: string | null
          numeric_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          building: string | null
          capacity: number
          created_at: string
          equipment: Json
          id: string
          is_available: boolean
          name: string
          policy_overrides: Json
          resource_class: Database["public"]["Enums"]["resource_class"]
        }
        Insert: {
          building?: string | null
          capacity?: number
          created_at?: string
          equipment?: Json
          id?: string
          is_available?: boolean
          name: string
          policy_overrides?: Json
          resource_class: Database["public"]["Enums"]["resource_class"]
        }
        Update: {
          building?: string | null
          capacity?: number
          created_at?: string
          equipment?: Json
          id?: string
          is_available?: boolean
          name?: string
          policy_overrides?: Json
          resource_class?: Database["public"]["Enums"]["resource_class"]
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlists: {
        Row: {
          created_at: string
          during: unknown
          id: string
          member_id: string
          rank: number | null
          request_id: string | null
          resource_id: string
          score: number | null
          score_components: Json | null
          status: Database["public"]["Enums"]["waitlist_status"]
        }
        Insert: {
          created_at?: string
          during: unknown
          id?: string
          member_id: string
          rank?: number | null
          request_id?: string | null
          resource_id: string
          score?: number | null
          score_components?: Json | null
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Update: {
          created_at?: string
          during?: unknown
          id?: string
          member_id?: string
          rank?: number | null
          request_id?: string | null
          resource_id?: string
          score?: number | null
          score_components?: Json | null
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accrue_served_hours: {
        Args: {
          p_class: Database["public"]["Enums"]["resource_class"]
          p_end: string
          p_member_id: string
          p_start: string
        }
        Returns: undefined
      }
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      book_request: {
        Args: {
          p_actor_id: string
          p_end: string
          p_purpose?: string
          p_request_id?: string
          p_resource_id: string
          p_start: string
        }
        Returns: Json
      }
      cancel_booking: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: Json
      }
      check_in: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: Json
      }
      compute_counterfactuals: {
        Args: {
          p_end: string
          p_member_id: string
          p_purpose: string
          p_resource_id: string
          p_start: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          role: string
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      mass_cancel: {
        Args: { p_actor_id: string; p_reason?: string; p_resource_id: string }
        Returns: Json
      }
      member_score_obj: {
        Args: { p_member_id: string; p_score: Json }
        Returns: Json
      }
      priority_score: {
        Args: {
          p_end: string
          p_member_id: string
          p_purpose?: string
          p_resource_id: string
          p_start: string
        }
        Returns: Json
      }
      promote_top_waitlist: {
        Args: { p_during: unknown; p_resource_id: string }
        Returns: string
      }
      propose_swap: {
        Args: { p_actor_id: string; p_booking_a: string; p_booking_b: string }
        Returns: Json
      }
      run_fairness_rebalance: {
        Args: { p_window_days?: number }
        Returns: Json
      }
      run_no_show_reaper: { Args: { p_grace_minutes?: number }; Returns: Json }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      simulate_contention: {
        Args: {
          p_end: string
          p_member_ids: string[]
          p_resource_id: string
          p_start: string
        }
        Returns: Json
      }
      update_policy: {
        Args: { p_actor_id: string; p_key: string; p_value: number }
        Returns: Json
      }
    }
    Enums: {
      app_permission:
        | "users.read"
        | "users.update"
        | "users.delete"
        | "items.read_all"
        | "items.update_all"
        | "items.delete_all"
        | "admin.access"
        | "admin.manage_roles"
      app_role: "user" | "moderator" | "admin"
      audit_kind:
        | "booking_confirmed"
        | "booking_waitlisted"
        | "conflict_resolved"
        | "booking_cancelled"
        | "check_in"
        | "no_show_released"
        | "fairness_rebalance"
        | "swap"
        | "admin_override"
        | "mass_cancel"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      resource_class:
        | "meeting_room"
        | "computer_lab"
        | "multimedia_equipment"
        | "testing_device"
      synapse_role: "student" | "faculty" | "lab_manager" | "admin"
      waitlist_status: "waiting" | "promoted" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permission: [
        "users.read",
        "users.update",
        "users.delete",
        "items.read_all",
        "items.update_all",
        "items.delete_all",
        "admin.access",
        "admin.manage_roles",
      ],
      app_role: ["user", "moderator", "admin"],
      audit_kind: [
        "booking_confirmed",
        "booking_waitlisted",
        "conflict_resolved",
        "booking_cancelled",
        "check_in",
        "no_show_released",
        "fairness_rebalance",
        "swap",
        "admin_override",
        "mass_cancel",
      ],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      resource_class: [
        "meeting_room",
        "computer_lab",
        "multimedia_equipment",
        "testing_device",
      ],
      synapse_role: ["student", "faculty", "lab_manager", "admin"],
      waitlist_status: ["waiting", "promoted", "expired", "cancelled"],
    },
  },
} as const

