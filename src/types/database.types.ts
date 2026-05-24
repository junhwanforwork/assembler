export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          created_at: string | null
          feature_type_ids: string[] | null
          id: string
          impl_ids: string[] | null
          is_published: boolean | null
          source_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          feature_type_ids?: string[] | null
          id?: string
          impl_ids?: string[] | null
          is_published?: boolean | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          feature_type_ids?: string[] | null
          id?: string
          impl_ids?: string[] | null
          is_published?: boolean | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      feature_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
        }
        Relationships: []
      }
      implementations: {
        Row: {
          best_for: string | null
          company_logo_url: string | null
          company_name: string
          cons: Json | null
          created_at: string | null
          device_type: string | null
          feature_type_id: string | null
          flow_data: Json | null
          headline: string
          id: string
          industry_id: string | null
          is_published: boolean | null
          plain_notes: string | null
          pros: Json | null
          setup_guide: Json | null
          source_url: string | null
          states: Json | null
          tags: string[] | null
          view_count: number | null
        }
        Insert: {
          best_for?: string | null
          company_logo_url?: string | null
          company_name: string
          cons?: Json | null
          created_at?: string | null
          device_type?: string | null
          feature_type_id?: string | null
          flow_data?: Json | null
          headline: string
          id?: string
          industry_id?: string | null
          is_published?: boolean | null
          plain_notes?: string | null
          pros?: Json | null
          setup_guide?: Json | null
          source_url?: string | null
          states?: Json | null
          tags?: string[] | null
          view_count?: number | null
        }
        Update: {
          best_for?: string | null
          company_logo_url?: string | null
          company_name?: string
          cons?: Json | null
          created_at?: string | null
          device_type?: string | null
          feature_type_id?: string | null
          flow_data?: Json | null
          headline?: string
          id?: string
          industry_id?: string | null
          is_published?: boolean | null
          plain_notes?: string | null
          pros?: Json | null
          setup_guide?: Json | null
          source_url?: string | null
          states?: Json | null
          tags?: string[] | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "implementations_feature_type_id_fkey"
            columns: ["feature_type_id"]
            isOneToOne: false
            referencedRelation: "feature_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementations_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string | null
          id: string
          implementation_id: string | null
          note: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          implementation_id?: string | null
          note?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          implementation_id?: string | null
          note?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_shares: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          slug: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          slug: string
          snapshot?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          slug?: string
          snapshot?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]
