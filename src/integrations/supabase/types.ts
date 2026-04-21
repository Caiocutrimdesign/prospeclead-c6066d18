export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          latitude: number | null
          location_name: string
          longitude: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          latitude?: number | null
          location_name: string
          longitude?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          captured_at: string | null
          city: string | null
          company_cnpj: string | null
          created_at: string
          fleet_size: number | null
          id: string
          kind: Database["public"]["Enums"]["lead_kind"]
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          name: string
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
          value: number | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          captured_at?: string | null
          city?: string | null
          company_cnpj?: string | null
          created_at?: string
          fleet_size?: number | null
          id?: string
          kind: Database["public"]["Enums"]["lead_kind"]
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
          value?: number | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          captured_at?: string | null
          city?: string | null
          company_cnpj?: string | null
          created_at?: string
          fleet_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["lead_kind"]
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
          value?: number | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_location: string | null
          daily_goal: number
          full_name: string | null
          id: string
          level: Database["public"]["Enums"]["user_level"]
          monthly_earnings: number
          streak_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_location?: string | null
          daily_goal?: number
          full_name?: string | null
          id: string
          level?: Database["public"]["Enums"]["user_level"]
          monthly_earnings?: number
          streak_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_location?: string | null
          daily_goal?: number
          full_name?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          monthly_earnings?: number
          streak_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          address: string | null
          created_at: string
          id: string
          place_name: string
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          place_name: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          place_name?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id: string | null
          metadata: Json | null
          source: Database["public"]["Enums"]["wallet_tx_source"]
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["wallet_tx_source"]
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["wallet_tx_source"]
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_withdrawals: {
        Row: {
          amount: number
          created_at: string
          holder_name: string
          id: string
          notes: string | null
          pix_key: string
          pix_key_kind: Database["public"]["Enums"]["pix_key_kind"]
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          holder_name: string
          id?: string
          notes?: string | null
          pix_key: string
          pix_key_kind: Database["public"]["Enums"]["pix_key_kind"]
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          holder_name?: string
          id?: string
          notes?: string | null
          pix_key?: string
          pix_key_kind?: Database["public"]["Enums"]["pix_key_kind"]
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      wallet_balance: {
        Args: { _user_id: string }
        Returns: {
          available: number
          pending: number
          total_earned: number
          withdrawn: number
        }[]
      }
    }
    Enums: {
      lead_kind: "b2c" | "b2b"
      lead_status:
        | "coletado"
        | "contatado"
        | "respondido"
        | "vendido"
        | "prospectado"
        | "negociando"
        | "fechado"
      pix_key_kind: "cpf" | "cnpj" | "email" | "phone" | "random"
      user_level: "BRONZE" | "PRATA" | "OURO"
      visit_status: "pendente" | "em_andamento" | "concluida"
      wallet_tx_kind:
        | "credit"
        | "debit"
        | "withdraw_hold"
        | "withdraw_paid"
        | "withdraw_refund"
        | "bonus"
        | "adjustment"
      wallet_tx_source:
        | "lead_b2c"
        | "lead_b2b"
        | "manual"
        | "withdrawal"
        | "mission"
      withdrawal_status:
        | "pendente"
        | "aprovado"
        | "pago"
        | "rejeitado"
        | "cancelado"
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
  public: {
    Enums: {
      lead_kind: ["b2c", "b2b"],
      lead_status: [
        "coletado",
        "contatado",
        "respondido",
        "vendido",
        "prospectado",
        "negociando",
        "fechado",
      ],
      pix_key_kind: ["cpf", "cnpj", "email", "phone", "random"],
      user_level: ["BRONZE", "PRATA", "OURO"],
      visit_status: ["pendente", "em_andamento", "concluida"],
      wallet_tx_kind: [
        "credit",
        "debit",
        "withdraw_hold",
        "withdraw_paid",
        "withdraw_refund",
        "bonus",
        "adjustment",
      ],
      wallet_tx_source: [
        "lead_b2c",
        "lead_b2b",
        "manual",
        "withdrawal",
        "mission",
      ],
      withdrawal_status: [
        "pendente",
        "aprovado",
        "pago",
        "rejeitado",
        "cancelado",
      ],
    },
  },
} as const
