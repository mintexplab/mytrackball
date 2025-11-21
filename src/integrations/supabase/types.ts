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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          title?: string
        }
        Relationships: []
      }
      isrc_counter: {
        Row: {
          created_at: string | null
          id: string
          last_number: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          max_releases: number | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_releases?: number | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_releases?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      releases: {
        Row: {
          artist_name: string
          artwork_url: string | null
          audio_file_url: string | null
          copyright_line: string | null
          courtesy_line: string | null
          created_at: string | null
          ddex_delivery_destination: string | null
          ddex_party_id: string | null
          ddex_party_name: string | null
          disc_number: number | null
          distributor: string | null
          featured_artists: string[] | null
          genre: string | null
          id: string
          is_multi_disc: boolean | null
          isrc: string | null
          label_name: string | null
          notes: string | null
          phonographic_line: string | null
          release_date: string | null
          status: string | null
          title: string
          total_discs: number | null
          total_volumes: number | null
          upc: string | null
          updated_at: string | null
          user_id: string
          volume_number: number | null
        }
        Insert: {
          artist_name: string
          artwork_url?: string | null
          audio_file_url?: string | null
          copyright_line?: string | null
          courtesy_line?: string | null
          created_at?: string | null
          ddex_delivery_destination?: string | null
          ddex_party_id?: string | null
          ddex_party_name?: string | null
          disc_number?: number | null
          distributor?: string | null
          featured_artists?: string[] | null
          genre?: string | null
          id?: string
          is_multi_disc?: boolean | null
          isrc?: string | null
          label_name?: string | null
          notes?: string | null
          phonographic_line?: string | null
          release_date?: string | null
          status?: string | null
          title: string
          total_discs?: number | null
          total_volumes?: number | null
          upc?: string | null
          updated_at?: string | null
          user_id: string
          volume_number?: number | null
        }
        Update: {
          artist_name?: string
          artwork_url?: string | null
          audio_file_url?: string | null
          copyright_line?: string | null
          courtesy_line?: string | null
          created_at?: string | null
          ddex_delivery_destination?: string | null
          ddex_party_id?: string | null
          ddex_party_name?: string | null
          disc_number?: number | null
          distributor?: string | null
          featured_artists?: string[] | null
          genre?: string | null
          id?: string
          is_multi_disc?: boolean | null
          isrc?: string | null
          label_name?: string | null
          notes?: string | null
          phonographic_line?: string | null
          release_date?: string | null
          status?: string | null
          title?: string
          total_discs?: number | null
          total_volumes?: number | null
          upc?: string | null
          updated_at?: string | null
          user_id?: string
          volume_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audio_file_url: string | null
          audio_path: string | null
          created_at: string | null
          duration: number | null
          featured_artists: string[] | null
          id: string
          isrc: string | null
          release_id: string
          title: string
          track_number: number
        }
        Insert: {
          audio_file_url?: string | null
          audio_path?: string | null
          created_at?: string | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          release_id: string
          title: string
          track_number: number
        }
        Update: {
          audio_file_url?: string | null
          audio_path?: string | null
          created_at?: string | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          release_id?: string
          title?: string
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          expires_at: string | null
          id: string
          plan_id: string
          plan_name: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          plan_id: string
          plan_name?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          plan_id?: string
          plan_name?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
