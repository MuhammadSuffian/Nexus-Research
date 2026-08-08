export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_logs: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          session_id: string
          status: string
          summary: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          session_id: string
          status: string
          summary?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          session_id?: string
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sessions: {
        Row: {
          created_at: string | null
          id: string
          query: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          status?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          abstract: string | null
          authors: string | null
          created_at: string | null
          id: string
          session_id: string
          source_type: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          abstract?: string | null
          authors?: string | null
          created_at?: string | null
          id?: string
          session_id: string
          source_type?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          abstract?: string | null
          authors?: string | null
          created_at?: string | null
          id?: string
          session_id?: string
          source_type?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      synthesis_outputs: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          session_id: string
          tab_type: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          session_id: string
          tab_type: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          session_id?: string
          tab_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "synthesis_outputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
