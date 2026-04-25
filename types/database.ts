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
  public: {
    Tables: {
      businesses: {
        Row: {
          abn: string | null
          address: string | null
          created_at: string
          default_rates: Json
          email: string | null
          invoice_bank_details: string | null
          invoice_payment_terms: string | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abn?: string | null
          address?: string | null
          created_at?: string
          default_rates?: Json
          email?: string | null
          invoice_bank_details?: string | null
          invoice_payment_terms?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abn?: string | null
          address?: string | null
          created_at?: string
          default_rates?: Json
          email?: string | null
          invoice_bank_details?: string | null
          invoice_payment_terms?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_postcode: string | null
          billing_same_as_site: boolean
          billing_state: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          emails: string[]
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          phones: string[]
          postcode: string | null
          properties: Json
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_postcode?: string | null
          billing_same_as_site?: boolean
          billing_state?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          emails?: string[]
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          phones?: string[]
          postcode?: string | null
          properties?: Json
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_postcode?: string | null
          billing_same_as_site?: boolean
          billing_state?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          emails?: string[]
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          phones?: string[]
          postcode?: string | null
          properties?: Json
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          created_at: string
          encrypted_refresh_token: string
          google_account_email: string
          google_account_subject: string
          granted_scopes: string[]
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_refresh_token: string
          google_account_email: string
          google_account_subject: string
          granted_scopes?: string[]
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_refresh_token?: string
          google_account_email?: string
          google_account_subject?: string
          granted_scopes?: string[]
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_settings: {
        Row: {
          availability_calendar_id: string
          created_at: string
          display_calendar_id: string
          event_destination_calendar_id: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_calendar_id?: string
          created_at?: string
          display_calendar_id?: string
          event_destination_calendar_id?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_calendar_id?: string
          created_at?: string
          display_calendar_id?: string
          event_destination_calendar_id?: string
          timezone?: string
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
          bank_details: string | null
          business_abn: string | null
          created_at: string
          customer_id: string
          due_date: string | null
          due_reminder_sent_at: string | null
          gst_cents: number
          id: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          overdue_reminder_sent_at: string | null
          paid_at: string | null
          paid_date: string | null
          payment_method: string | null
          payment_terms: string | null
          quote_id: string | null
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid_cents?: number
          bank_details?: string | null
          business_abn?: string | null
          created_at?: string
          customer_id: string
          due_date?: string | null
          due_reminder_sent_at?: string | null
          gst_cents?: number
          id?: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          bank_details?: string | null
          business_abn?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string | null
          due_reminder_sent_at?: string | null
          gst_cents?: number
          id?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_terms?: string | null
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
      job_variations: {
        Row: {
          created_at: string
          id: string
          job_id: string
          name: string
          notes: string | null
          quantity: number
          sort_order: number
          total_cents: number
          unit_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          name: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          total_cents?: number
          unit_price_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          name?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          total_cents?: number
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_variations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          customer_id: string
          duration_days: number | null
          end_date: string | null
          google_calendar_event_id: string | null
          google_calendar_id: string | null
          google_sync_error: string | null
          google_sync_status: string
          id: string
          notes: string | null
          quote_id: string | null
          schedule_source: string
          scheduled_date: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          duration_days?: number | null
          end_date?: string | null
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          schedule_source?: string
          scheduled_date: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          duration_days?: number | null
          end_date?: string | null
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          schedule_source?: string
          scheduled_date?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_user_fk"
            columns: ["customer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      material_items: {
        Row: {
          category: Database["public"]["Enums"]["material_item_category"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          unit: string
          unit_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["material_item_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["material_item_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          total_cents?: number
          unit?: string
          unit_price_cents?: number
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
      quote_line_items: {
        Row: {
          category: Database["public"]["Enums"]["material_item_category"]
          created_at: string
          id: string
          is_optional: boolean
          is_selected: boolean
          material_item_id: string | null
          name: string
          notes: string | null
          quantity: number
          quote_id: string
          sort_order: number
          total_cents: number
          unit: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["material_item_category"]
          created_at?: string
          id?: string
          is_optional?: boolean
          is_selected?: boolean
          material_item_id?: string | null
          name: string
          notes?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          total_cents?: number
          unit?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["material_item_category"]
          created_at?: string
          id?: string
          is_optional?: boolean
          is_selected?: boolean
          material_item_id?: string | null
          name?: string
          notes?: string | null
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
            foreignKeyName: "quote_line_items_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
      quote_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          approval_signature: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          created_at: string
          customer_id: string
          deposit_percent: number
          discount_cents: number
          estimate_category: string
          estimate_context: Json
          estimate_mode: string | null
          gst_cents: number
          id: string
          internal_notes: string | null
          labour_margin_percent: number
          manual_adjustment_cents: number
          material_margin_percent: number
          notes: string | null
          pricing_method: string
          pricing_method_inputs: Json | null
          pricing_snapshot: Json
          property_type: string | null
          public_share_token: string
          quote_number: string
          status: string
          subtotal_cents: number
          tier: string | null
          title: string | null
          total_cents: number
          updated_at: string
          user_id: string
          valid_until: string | null
          working_days: number | null
        }
        Insert: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          customer_id: string
          deposit_percent?: number
          discount_cents?: number
          estimate_category?: string
          estimate_context?: Json
          estimate_mode?: string | null
          gst_cents?: number
          id?: string
          internal_notes?: string | null
          labour_margin_percent?: number
          manual_adjustment_cents?: number
          material_margin_percent?: number
          notes?: string | null
          pricing_method?: string
          pricing_method_inputs?: Json | null
          pricing_snapshot?: Json
          property_type?: string | null
          public_share_token?: string
          quote_number: string
          status?: string
          subtotal_cents?: number
          tier?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          working_days?: number | null
        }
        Update: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          customer_id?: string
          deposit_percent?: number
          discount_cents?: number
          estimate_category?: string
          estimate_context?: Json
          estimate_mode?: string | null
          gst_cents?: number
          id?: string
          internal_notes?: string | null
          labour_margin_percent?: number
          manual_adjustment_cents?: number
          material_margin_percent?: number
          notes?: string | null
          pricing_method?: string
          pricing_method_inputs?: Json | null
          pricing_snapshot?: Json
          property_type?: string | null
          public_share_token?: string
          quote_number?: string
          status?: string
          subtotal_cents?: number
          tier?: string | null
          title?: string | null
          total_cents?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          working_days?: number | null
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
      schedule_events: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_all_day: boolean
          location: string | null
          notes: string | null
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean
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
          cancel_at?: string | null
          cancel_at_period_end?: boolean
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
          cancel_at?: string | null
          cancel_at_period_end?: boolean
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
      check_job_date_overlap: {
        Args: {
          p_end_date: string
          p_exclude_job_id?: string
          p_start_date: string
          p_user_id: string
        }
        Returns: boolean
      }
      generate_invoice_number: { Args: { user_uuid: string }; Returns: string }
      generate_quote_number: { Args: { user_uuid: string }; Returns: string }
      get_blocked_dates_for_user: {
        Args: { p_from_date?: string; p_to_date?: string; p_user_id: string }
        Returns: {
          blocked_date: string
        }[]
      }
      get_user_active_quote_count: {
        Args: { user_uuid: string }
        Returns: number
      }
    }
    Enums: {
      material_item_category:
        | "paint"
        | "primer"
        | "supply"
        | "service"
        | "other"
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
      material_item_category: ["paint", "primer", "supply", "service", "other"],
    },
  },
} as const
