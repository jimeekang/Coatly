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
    PostgrestVersion: "14.4"
  }
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
      businesses: {
        Row: {
          abn: string | null
          address: string | null
          address_line1: string | null
          city: string | null
          created_at: string
          default_rates: Json
          email: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postcode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abn?: string | null
          address?: string | null
          address_line1?: string | null
          city?: string | null
          created_at?: string
          default_rates?: Json
          email?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abn?: string | null
          address?: string | null
          address_line1?: string | null
          city?: string | null
          created_at?: string
          default_rates?: Json
          email?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          postcode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          gst_cents: number
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total_cents: number
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          gst_cents?: number
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total_cents: number
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          gst_cents?: number
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total_cents?: number
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid_cents: number
          created_at: string
          customer_id: string
          due_date: string | null
          due_reminder_sent_at: string | null
          overdue_reminder_sent_at: string | null
          gst_cents: number
          id: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          paid_at: string | null
          quote_id: string | null
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid_cents?: number
          created_at?: string
          customer_id: string
          due_date?: string | null
          due_reminder_sent_at?: string | null
          overdue_reminder_sent_at?: string | null
          gst_cents?: number
          id?: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          paid_at?: string | null
          quote_id?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string
          customer_id?: string
          due_date?: string | null
          due_reminder_sent_at?: string | null
          overdue_reminder_sent_at?: string | null
          gst_cents?: number
          id?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          paid_at?: string | null
          quote_id?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_user_fk"
            columns: ["customer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          abn: string | null
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_bsb: string | null
          business_name: string
          city: string | null
          created_at: string
          default_payment_terms: number | null
          email: string | null
          logo_url: string | null
          onboarding_completed: boolean
          phone: string | null
          postcode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abn?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_bsb?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          default_payment_terms?: number | null
          email?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abn?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_bsb?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          default_payment_terms?: number | null
          email?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_room_surfaces: {
        Row: {
          area_m2: number
          coating_type: string | null
          created_at: string
          id: string
          labour_cost_cents: number
          material_cost_cents: number
          notes: string | null
          paint_litres_needed: number | null
          rate_per_m2_cents: number
          room_id: string
          surface_type: string
          tier: string
          updated_at: string
        }
        Insert: {
          area_m2: number
          coating_type?: string | null
          created_at?: string
          id?: string
          labour_cost_cents?: number
          material_cost_cents?: number
          notes?: string | null
          paint_litres_needed?: number | null
          rate_per_m2_cents: number
          room_id: string
          surface_type: string
          tier?: string
          updated_at?: string
        }
        Update: {
          area_m2?: number
          coating_type?: string | null
          created_at?: string
          id?: string
          labour_cost_cents?: number
          material_cost_cents?: number
          notes?: string | null
          paint_litres_needed?: number | null
          rate_per_m2_cents?: number
          room_id?: string
          surface_type?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_room_surfaces_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "quote_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_estimate_items: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          metadata: Json
          quantity: number
          quote_id: string
          sort_order: number
          total_cents: number
          unit: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          metadata?: Json
          quantity?: number
          quote_id: string
          sort_order?: number
          total_cents: number
          unit: string
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          quantity?: number
          quote_id?: string
          sort_order?: number
          total_cents?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_estimate_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_rooms: {
        Row: {
          created_at: string
          height_m: number | null
          id: string
          length_m: number | null
          name: string
          quote_id: string
          room_type: string
          sort_order: number
          updated_at: string
          width_m: number | null
        }
        Insert: {
          created_at?: string
          height_m?: number | null
          id?: string
          length_m?: number | null
          name: string
          quote_id: string
          room_type?: string
          sort_order?: number
          updated_at?: string
          width_m?: number | null
        }
        Update: {
          created_at?: string
          height_m?: number | null
          id?: string
          length_m?: number | null
          name?: string
          quote_id?: string
          room_type?: string
          sort_order?: number
          updated_at?: string
          width_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_rooms_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approval_signature: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_id: string
          estimate_category: string
          estimate_context: Json
          estimate_mode: string | null
          gst_cents: number
          id: string
          internal_notes: string | null
          labour_margin_percent: number
          manual_adjustment_cents: number | null
          material_margin_percent: number
          notes: string | null
          public_share_token: string
          pricing_method: string | null
          pricing_method_inputs: Json | null
          pricing_snapshot: Json
          property_type: string | null
          quote_number: string
          status: string
          subtotal_cents: number
          tier: string | null
          title: string | null
          total_cents: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id: string
          estimate_category?: string
          estimate_context?: Json
          estimate_mode?: string | null
          gst_cents?: number
          id?: string
          internal_notes?: string | null
          labour_margin_percent?: number
          manual_adjustment_cents?: number | null
          material_margin_percent?: number
          notes?: string | null
          public_share_token?: string
          pricing_method?: string | null
          pricing_method_inputs?: Json | null
          pricing_snapshot?: Json
          property_type?: string | null
          quote_number: string
          status?: string
          subtotal_cents?: number
          tier?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string
          estimate_category?: string
          estimate_context?: Json
          estimate_mode?: string | null
          gst_cents?: number
          id?: string
          internal_notes?: string | null
          labour_margin_percent?: number
          manual_adjustment_cents?: number | null
          material_margin_percent?: number
          notes?: string | null
          public_share_token?: string
          pricing_method?: string | null
          pricing_method_inputs?: Json | null
          pricing_snapshot?: Json
          property_type?: string | null
          quote_number?: string
          status?: string
          subtotal_cents?: number
          tier?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_user_fk"
            columns: ["customer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      before_user_created_signup_guard: { Args: { event: Json }; Returns: Json }
      calculate_invoice_totals: {
        Args: { invoice_uuid: string }
        Returns: undefined
      }
      calculate_quote_totals: {
        Args: { quote_uuid: string }
        Returns: undefined
      }
      generate_invoice_number: { Args: { user_uuid: string }; Returns: string }
      generate_quote_number: { Args: { user_uuid: string }; Returns: string }
      get_user_active_quote_count: {
        Args: { user_uuid: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

