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
      alerts: {
        Row: {
          competitor_id: string | null
          competitor_name: string | null
          competitor_product_id: string | null
          created_at: string
          id: string
          is_read: boolean
          new_price: number | null
          old_price: number | null
          product_name: string | null
          type: string
          user_id: string
        }
        Insert: {
          competitor_id?: string | null
          competitor_name?: string | null
          competitor_product_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          new_price?: number | null
          old_price?: number | null
          product_name?: string | null
          type: string
          user_id: string
        }
        Update: {
          competitor_id?: string | null
          competitor_name?: string | null
          competitor_product_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          new_price?: number | null
          old_price?: number | null
          product_name?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      background_tasks: {
        Row: {
          created_at: string
          details: Json | null
          dismissed: boolean
          error_message: string | null
          id: string
          status: string
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          dismissed?: boolean
          error_message?: string | null
          id?: string
          status?: string
          task_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          dismissed?: boolean
          error_message?: string | null
          id?: string
          status?: string
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_assets: {
        Row: {
          brand_name: string | null
          brand_voice: string | null
          color_palette: Json | null
          customer_persona: Json | null
          font_choices: Json | null
          generated_at: string
          id: string
          source_description: string | null
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          brand_voice?: string | null
          color_palette?: Json | null
          customer_persona?: Json | null
          font_choices?: Json | null
          generated_at?: string
          id?: string
          source_description?: string | null
          user_id: string
        }
        Update: {
          brand_name?: string | null
          brand_voice?: string | null
          color_palette?: Json | null
          customer_persona?: Json | null
          font_choices?: Json | null
          generated_at?: string
          id?: string
          source_description?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_generation_templates: {
        Row: {
          brand_name: string
          brand_voice: string
          color_palette: Json
          created_at: string
          font_primary: string
          font_secondary: string
          id: string
          sort_order: number
        }
        Insert: {
          brand_name: string
          brand_voice: string
          color_palette: Json
          created_at?: string
          font_primary: string
          font_secondary: string
          id?: string
          sort_order: number
        }
        Update: {
          brand_name?: string
          brand_voice?: string
          color_palette?: Json
          created_at?: string
          font_primary?: string
          font_secondary?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      competitor_products: {
        Row: {
          category: string | null
          competitor_id: string
          description: string | null
          id: string
          image_url: string | null
          last_updated_at: string
          name: string
          sku: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          competitor_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_updated_at?: string
          name: string
          sku?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          competitor_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_updated_at?: string
          name?: string
          sku?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_crawled_at: string | null
          status: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          last_crawled_at?: string | null
          status?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_crawled_at?: string | null
          status?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_stores: {
        Row: {
          brand_asset_id: string | null
          content: Json
          created_at: string
          description: string
          id: string
          name: string
          palette: Json
          published: boolean
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_asset_id?: string | null
          content?: Json
          created_at?: string
          description?: string
          id?: string
          name: string
          palette?: Json
          published?: boolean
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_asset_id?: string | null
          content?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          palette?: Json
          published?: boolean
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_stores_brand_asset_id_fkey"
            columns: ["brand_asset_id"]
            isOneToOne: false
            referencedRelation: "brand_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          competitor_product_id: string
          currency: string
          id: string
          price: number
          timestamp: string
        }
        Insert: {
          competitor_product_id: string
          currency?: string
          id?: string
          price: number
          timestamp?: string
        }
        Update: {
          competitor_product_id?: string
          currency?: string
          id?: string
          price?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_content: {
        Row: {
          body: string | null
          created_at: string
          id: string
          keywords: string[] | null
          product_id: string | null
          published_at: string | null
          status: string
          title: string | null
          topic: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          product_id?: string | null
          published_at?: string | null
          status?: string
          title?: string | null
          topic?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          keywords?: string[] | null
          product_id?: string | null
          published_at?: string | null
          status?: string
          title?: string | null
          topic?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trends: {
        Row: {
          discovered_at: string
          id: string
          keyword: string | null
          platform: string | null
          product_name: string | null
          saved: boolean
          seasonality_score: number | null
          source_url: string | null
          trend_score: number | null
          user_id: string
          virality_potential: number | null
        }
        Insert: {
          discovered_at?: string
          id?: string
          keyword?: string | null
          platform?: string | null
          product_name?: string | null
          saved?: boolean
          seasonality_score?: number | null
          source_url?: string | null
          trend_score?: number | null
          user_id: string
          virality_potential?: number | null
        }
        Update: {
          discovered_at?: string
          id?: string
          keyword?: string | null
          platform?: string | null
          product_name?: string | null
          saved?: boolean
          seasonality_score?: number | null
          source_url?: string | null
          trend_score?: number | null
          user_id?: string
          virality_potential?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_demo_data: { Args: { p_user: string }; Returns: undefined }
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
  public: {
    Enums: {},
  },
} as const
