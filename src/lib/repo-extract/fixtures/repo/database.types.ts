// ASM-060 픽스처 — supabase gen types 산출물 형태(1순위 스키마 소스).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_public: boolean
          name: string
          owner_id: string | null
          tags: string[]
          view_count: number
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_public?: boolean
          name: string
          owner_id?: string | null
          tags?: string[]
          view_count?: number
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          joined_at: string | null
          member_email: string
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          joined_at?: string | null
          member_email: string
          project_id: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_role: "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
