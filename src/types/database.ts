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
      bookings: {
        Row: {
          created_at: string | null
          id: string
          // Only a real column once supabase/package-booking.sql has been
          // run - see that file's header.
          package_purchase_id: string | null
          payment_method: string | null
          payment_status: string
          reserved_until: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_purchase_id?: string | null
          payment_method?: string | null
          payment_status?: string
          reserved_until?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          package_purchase_id?: string | null
          payment_method?: string | null
          payment_status?: string
          reserved_until?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          booked_count: number
          capacity: number
          class_id: string
          created_at: string | null
          end_time: string
          id: string
          location: string | null
          session_date: string
          start_time: string
          status: string
        }
        Insert: {
          booked_count?: number
          capacity: number
          class_id: string
          created_at?: string | null
          end_time: string
          id?: string
          location?: string | null
          session_date: string
          start_time: string
          status?: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          class_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          location?: string | null
          session_date?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          category: string | null
          created_at: string | null
          default_start_time: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          is_recurring: boolean
          name: string
          // Only a real column once supabase/class-packages.sql has been
          // run - see src/lib/feature-flags.ts (PACKAGES_ENABLED) before
          // referencing this anywhere.
          package_eligible: boolean
          price: number
          weekday: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_start_time?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_recurring?: boolean
          name: string
          package_eligible?: boolean
          price: number
          weekday?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_start_time?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_recurring?: boolean
          name?: string
          package_eligible?: boolean
          price?: number
          weekday?: number | null
        }
        Relationships: []
      }
      class_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          sessions_count: number
          price: number
          validity_days: number | null
          is_active: boolean
          sort_order: number
          image_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sessions_count: number
          price: number
          validity_days?: number | null
          is_active?: boolean
          sort_order?: number
          image_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sessions_count?: number
          price?: number
          validity_days?: number | null
          is_active?: boolean
          sort_order?: number
          image_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      package_purchases: {
        Row: {
          id: string
          user_id: string
          package_id: string
          status: string
          reference: string
          price_snapshot: number
          sessions_total: number
          sessions_remaining: number
          payment_method: string | null
          created_at: string | null
          paid_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          status?: string
          reference?: string
          price_snapshot: number
          sessions_total: number
          sessions_remaining?: number
          payment_method?: string | null
          created_at?: string | null
          paid_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string
          status?: string
          reference?: string
          price_snapshot?: number
          sessions_total?: number
          sessions_remaining?: number
          payment_method?: string | null
          created_at?: string | null
          paid_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "class_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          payment_method: string | null
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          id?: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id: string
        }
        Update: {
          id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          fulfillment_method: string | null
          id: string
          status: string
          total: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          fulfillment_method?: string | null
          id?: string
          status?: string
          total: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          fulfillment_method?: string | null
          id?: string
          status?: string
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          gateway_reference: string | null
          id: string
          method: string
          order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          gateway_reference?: string | null
          id?: string
          method: string
          order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          gateway_reference?: string | null
          id?: string
          method?: string
          order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          id: string
          product_id: string
          size: string | null
          sku: string | null
          stock: number
        }
        Insert: {
          color?: string | null
          id?: string
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Update: {
          color?: string | null
          id?: string
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          city: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          city?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          city?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_class_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: string
      }
      confirm_pending_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      create_package_purchase: {
        Args: { p_package_id: string; p_user_id: string }
        Returns: Json
      }
      admin_confirm_package_purchase: {
        Args: { p_purchase_id: string; p_payment_method: string }
        Returns: undefined
      }
      book_class_session_with_package: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: string
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
