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
      attendances: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          member_id: string
          method: string | null
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          member_id: string
          method?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          member_id?: string
          method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      inscription_form_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          version: number
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      inscription_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          desired_plan_id: string | null
          email: string
          form_data: Json
          full_name: string
          id: string
          member_id: string | null
          notes: string | null
          payment_id: string | null
          phone: string | null
          security_answer: string | null
          security_question: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          desired_plan_id?: string | null
          email: string
          form_data?: Json
          full_name: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_id?: string | null
          phone?: string | null
          security_answer?: string | null
          security_question?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          desired_plan_id?: string | null
          email?: string
          form_data?: Json
          full_name?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_id?: string | null
          phone?: string | null
          security_answer?: string | null
          security_question?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscription_requests_desired_plan_id_fkey"
            columns: ["desired_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscription_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscription_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_name: string | null
          description: string | null
          id: string
          issued_at: string
          items: Json
          kind: string
          member_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          number: string
          payment_id: string | null
          plan_id: string | null
          product_sale_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          id?: string
          issued_at?: string
          items?: Json
          kind?: string
          member_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          number?: string
          payment_id?: string | null
          plan_id?: string | null
          product_sale_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          id?: string
          issued_at?: string
          items?: Json
          kind?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          number?: string
          payment_id?: string | null
          plan_id?: string | null
          product_sale_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      member_goals: {
        Row: {
          assigned_trainer_id: string | null
          created_at: string
          details: Json
          id: string
          member_id: string
          primary_goal: string
          priority: string
          raw_conversation: Json
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          assigned_trainer_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          member_id: string
          primary_goal: string
          priority?: string
          raw_conversation?: Json
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          assigned_trainer_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          member_id?: string
          primary_goal?: string
          priority?: string
          raw_conversation?: Json
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_goals_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_memberships: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          member_id: string
          plan_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          member_id: string
          plan_id: string
          start_date?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          member_id?: string
          plan_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          auth_user_id: string | null
          birth_date: string | null
          cedula: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          gender: string | null
          id: string
          member_code: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          recovery_pin: string | null
          security_answer_hash: string | null
          security_question: string | null
          status: Database["public"]["Enums"]["member_status"]
          temp_password: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          id?: string
          member_code?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          recovery_pin?: string | null
          security_answer_hash?: string | null
          security_question?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          temp_password?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          member_code?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          recovery_pin?: string | null
          security_answer_hash?: string | null
          security_question?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          temp_password?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          benefits: string[] | null
          color: string | null
          created_at: string
          description: string | null
          duration: Database["public"]["Enums"]["plan_duration"]
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration?: Database["public"]["Enums"]["plan_duration"]
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration?: Database["public"]["Enums"]["plan_duration"]
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          member_id: string
          membership_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          member_id: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          member_id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "member_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          member_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          product_id: string | null
          product_name: string
          quantity: number
          reference: string | null
          sold_at: string
          status: Database["public"]["Enums"]["payment_status"]
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          product_id?: string | null
          product_name: string
          quantity?: number
          reference?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          product_id?: string | null
          product_name?: string
          quantity?: number
          reference?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["payment_status"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      trainers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          photo_url: string | null
          schedule: string | null
          specialty: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          schedule?: string | null
          specialty?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          schedule?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "reception" | "trainer" | "member"
      member_status: "active" | "suspended" | "expired" | "pending"
      payment_method: "cash" | "transfer" | "card" | "mobile"
      payment_status: "paid" | "pending" | "refunded"
      plan_duration: "monthly" | "quarterly" | "biannual" | "annual"
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
      app_role: ["admin", "reception", "trainer", "member"],
      member_status: ["active", "suspended", "expired", "pending"],
      payment_method: ["cash", "transfer", "card", "mobile"],
      payment_status: ["paid", "pending", "refunded"],
      plan_duration: ["monthly", "quarterly", "biannual", "annual"],
    },
  },
} as const
