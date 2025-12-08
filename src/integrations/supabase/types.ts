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
      account_appeals: {
        Row: {
          admin_notes: string | null
          appeal_reason: string
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          admin_notes?: string | null
          appeal_reason: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          admin_notes?: string | null
          appeal_reason?: string
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      announcement_bar: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          message: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      artist_invitations: {
        Row: {
          accepted_at: string | null
          assigned_plan_name: string | null
          assigned_plan_type: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          plan_features: Json | null
          royalty_split_percentage: number | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_plan_name?: string | null
          assigned_plan_type?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          plan_features?: Json | null
          royalty_split_percentage?: number | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_plan_name?: string | null
          assigned_plan_type?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          plan_features?: Json | null
          royalty_split_percentage?: number | null
          status?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_logs: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          release_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          release_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          release_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_logs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
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
      label_dropdown_banners: {
        Row: {
          banner_url: string
          created_at: string | null
          created_by: string | null
          id: string
          label_id: string
          updated_at: string | null
        }
        Insert: {
          banner_url: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label_id: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_dropdown_banners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_dropdown_banners_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: true
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_invitations: {
        Row: {
          accepted_at: string | null
          additional_users: string[] | null
          created_at: string | null
          custom_royalty_split: number | null
          expires_at: string | null
          id: string
          invited_by: string | null
          invited_role: string | null
          label_name: string
          master_account_email: string
          service_access: string[] | null
          status: string
          subscription_tier: string
        }
        Insert: {
          accepted_at?: string | null
          additional_users?: string[] | null
          created_at?: string | null
          custom_royalty_split?: number | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_role?: string | null
          label_name: string
          master_account_email: string
          service_access?: string[] | null
          status?: string
          subscription_tier: string
        }
        Update: {
          accepted_at?: string | null
          additional_users?: string[] | null
          created_at?: string | null
          custom_royalty_split?: number | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_role?: string | null
          label_name?: string
          master_account_email?: string
          service_access?: string[] | null
          status?: string
          subscription_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          accent_color: string | null
          created_at: string | null
          id: string
          label_id: string
          logo_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          id?: string
          label_id: string
          logo_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          id?: string
          label_id?: string
          logo_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_settings: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean
          maintenance_type: string
          reason: string
          start_time: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          maintenance_type?: string
          reason: string
          start_time: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          maintenance_type?: string
          reason?: string
          start_time?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_royalty_splits: {
        Row: {
          created_at: string | null
          id: string
          royalty_split_percentage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          royalty_split_percentage: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          royalty_split_percentage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_royalty_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_releases?: number | null
          name: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_releases?: number | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_manager_email: string | null
          account_manager_name: string | null
          account_manager_phone: string | null
          account_manager_timezone: string | null
          account_type: string | null
          active_label_id: string | null
          artist_name: string | null
          avatar_url: string | null
          ban_reason: string | null
          created_at: string | null
          display_name: string | null
          email: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_locked: boolean | null
          is_subdistributor_master: boolean | null
          label_designation_welcome_shown: boolean | null
          label_id: string | null
          label_name: string | null
          label_type: string | null
          mfa_setup_completed: boolean | null
          onboarding_completed: boolean | null
          parent_account_id: string | null
          preferred_currency: string | null
          strike_count: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdistributor_accent_color: string | null
          subdistributor_banner_url: string | null
          subdistributor_dashboard_name: string | null
          subdistributor_footer_text: string | null
          subdistributor_logo_url: string | null
          subscription_welcome_shown_at: string | null
          suspended_at: string | null
          suspension_reason: string | null
          user_id: string
          user_timezone: string | null
        }
        Insert: {
          account_manager_email?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          account_manager_timezone?: string | null
          account_type?: string | null
          active_label_id?: string | null
          artist_name?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          is_locked?: boolean | null
          is_subdistributor_master?: boolean | null
          label_designation_welcome_shown?: boolean | null
          label_id?: string | null
          label_name?: string | null
          label_type?: string | null
          mfa_setup_completed?: boolean | null
          onboarding_completed?: boolean | null
          parent_account_id?: string | null
          preferred_currency?: string | null
          strike_count?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdistributor_accent_color?: string | null
          subdistributor_banner_url?: string | null
          subdistributor_dashboard_name?: string | null
          subdistributor_footer_text?: string | null
          subdistributor_logo_url?: string | null
          subscription_welcome_shown_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          user_id: string
          user_timezone?: string | null
        }
        Update: {
          account_manager_email?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          account_manager_timezone?: string | null
          account_type?: string | null
          active_label_id?: string | null
          artist_name?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_locked?: boolean | null
          is_subdistributor_master?: boolean | null
          label_designation_welcome_shown?: boolean | null
          label_id?: string | null
          label_name?: string | null
          label_type?: string | null
          mfa_setup_completed?: boolean | null
          onboarding_completed?: boolean | null
          parent_account_id?: string | null
          preferred_currency?: string | null
          strike_count?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdistributor_accent_color?: string | null
          subdistributor_banner_url?: string | null
          subdistributor_dashboard_name?: string | null
          subdistributor_footer_text?: string | null
          subdistributor_logo_url?: string | null
          subscription_welcome_shown_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          user_id?: string
          user_timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_label_id_fkey"
            columns: ["active_label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_submissions: {
        Row: {
          admin_notes: string | null
          alternate_titles: string[] | null
          created_at: string | null
          genre: string | null
          has_public_domain_content: boolean | null
          has_third_party_content: boolean | null
          id: string
          isrcs: string[]
          performers: string[] | null
          publishers: Json
          shareholders: Json
          song_title: string
          song_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          alternate_titles?: string[] | null
          created_at?: string | null
          genre?: string | null
          has_public_domain_content?: boolean | null
          has_third_party_content?: boolean | null
          id?: string
          isrcs?: string[]
          performers?: string[] | null
          publishers?: Json
          shareholders?: Json
          song_title: string
          song_type: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          alternate_titles?: string[] | null
          created_at?: string | null
          genre?: string | null
          has_public_domain_content?: boolean | null
          has_third_party_content?: boolean | null
          id?: string
          isrcs?: string[]
          performers?: string[] | null
          publishers?: Json
          shareholders?: Json
          song_title?: string
          song_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      release_collaborators: {
        Row: {
          collaborator_id: string
          created_at: string | null
          id: string
          percentage: number
          release_id: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          id?: string
          percentage: number
          release_id: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          id?: string
          percentage?: number
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_collaborators_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_collaborators_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          archived_at: string | null
          artist_name: string
          artwork_url: string | null
          audio_file_url: string | null
          catalog_number: string | null
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
          rejection_reason: string | null
          release_date: string | null
          status: string | null
          takedown_requested: boolean | null
          title: string
          total_discs: number | null
          total_volumes: number | null
          upc: string | null
          updated_at: string | null
          user_id: string
          volume_number: number | null
        }
        Insert: {
          archived_at?: string | null
          artist_name: string
          artwork_url?: string | null
          audio_file_url?: string | null
          catalog_number?: string | null
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
          rejection_reason?: string | null
          release_date?: string | null
          status?: string | null
          takedown_requested?: boolean | null
          title: string
          total_discs?: number | null
          total_volumes?: number | null
          upc?: string | null
          updated_at?: string | null
          user_id: string
          volume_number?: number | null
        }
        Update: {
          archived_at?: string | null
          artist_name?: string
          artwork_url?: string | null
          audio_file_url?: string | null
          catalog_number?: string | null
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
          rejection_reason?: string | null
          release_date?: string | null
          status?: string | null
          takedown_requested?: boolean | null
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
      royalties: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          period: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_links: {
        Row: {
          created_at: string
          id: string
          platforms: Json | null
          smart_link_url: string
          spotify_url: string
          title: string | null
          toneden_link_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platforms?: Json | null
          smart_link_url: string
          spotify_url: string
          title?: string | null
          toneden_link_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platforms?: Json | null
          smart_link_url?: string
          spotify_url?: string
          title?: string | null
          toneden_link_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sublabel_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invitation_type: string | null
          invitee_email: string
          inviter_id: string
          label_id: string | null
          permissions: string[] | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_type?: string | null
          invitee_email: string
          inviter_id: string
          label_id?: string | null
          permissions?: string[] | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_type?: string | null
          invitee_email?: string
          inviter_id?: string
          label_id?: string | null
          permissions?: string[] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sublabel_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublabel_invitations_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          escalation_email: string | null
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          escalation_email?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          escalation_email?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
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
          composer: string | null
          contributor: string | null
          created_at: string | null
          duration: number | null
          featured_artists: string[] | null
          id: string
          isrc: string | null
          publisher: string | null
          publisher_ipi: string | null
          release_id: string
          title: string
          track_number: number
          writer: string | null
        }
        Insert: {
          audio_file_url?: string | null
          audio_path?: string | null
          composer?: string | null
          contributor?: string | null
          created_at?: string | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          publisher?: string | null
          publisher_ipi?: string | null
          release_id: string
          title: string
          track_number: number
          writer?: string | null
        }
        Update: {
          audio_file_url?: string | null
          audio_path?: string | null
          composer?: string | null
          contributor?: string | null
          created_at?: string | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          publisher?: string | null
          publisher_ipi?: string | null
          release_id?: string
          title?: string
          track_number?: number
          writer?: string | null
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
      user_fines: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string | null
          fine_type: string
          id: string
          issued_by: string | null
          notes: string | null
          paid_at: string | null
          reason: string
          status: string
          strike_number: number
          user_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string | null
          fine_type: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          paid_at?: string | null
          reason: string
          status?: string
          strike_number: number
          user_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string | null
          fine_type?: string
          id?: string
          issued_by?: string | null
          notes?: string | null
          paid_at?: string | null
          reason?: string
          status?: string
          strike_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fines_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_fines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_label_memberships: {
        Row: {
          id: string
          joined_at: string
          label_id: string
          label_name: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          label_id: string
          label_name: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          label_id?: string
          label_name?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_label_memberships_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_label_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      generate_label_id: { Args: never; Returns: string }
      generate_next_isrc: { Args: never; Returns: string }
      generate_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_locked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "subdistributor_admin"
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
      app_role: ["admin", "user", "subdistributor_admin"],
    },
  },
} as const
