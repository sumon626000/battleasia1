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
      account_delete_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          created_at: string
          id: number
          ip_address: string | null
          module: string
          new_value: Json | null
          old_value: Json | null
          target_id: number | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_name: string
          created_at?: string
          id?: number
          ip_address?: string | null
          module: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: number | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          id?: number
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: number | null
          target_type?: string | null
        }
        Relationships: []
      }
      apk_versions: {
        Row: {
          apk_file_url: string
          app_name: string
          changelog: string | null
          created_at: string
          deleted_at: string | null
          download_count: number
          file_size_bytes: number
          force_update: boolean
          id: number
          is_active: boolean
          updated_at: string
          uploaded_by_admin_id: string | null
          version_code: number
          version_name: string
        }
        Insert: {
          apk_file_url: string
          app_name: string
          changelog?: string | null
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          file_size_bytes?: number
          force_update?: boolean
          id?: number
          is_active?: boolean
          updated_at?: string
          uploaded_by_admin_id?: string | null
          version_code: number
          version_name: string
        }
        Update: {
          apk_file_url?: string
          app_name?: string
          changelog?: string | null
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          file_size_bytes?: number
          force_update?: boolean
          id?: number
          is_active?: boolean
          updated_at?: string
          uploaded_by_admin_id?: string | null
          version_code?: number
          version_name?: string
        }
        Relationships: []
      }
      balance_logs: {
        Row: {
          admin_id: string | null
          amount_bac: number
          balance_after: number
          balance_before: number
          created_at: string
          handled_by: Database["public"]["Enums"]["handler_type"]
          id: number
          idempotency_key: string | null
          note: string | null
          reference_id: number | null
          reference_type: string | null
          type: Database["public"]["Enums"]["balance_log_type"]
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount_bac: number
          balance_after: number
          balance_before: number
          created_at?: string
          handled_by?: Database["public"]["Enums"]["handler_type"]
          id?: number
          idempotency_key?: string | null
          note?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["balance_log_type"]
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount_bac?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          handled_by?: Database["public"]["Enums"]["handler_type"]
          id?: number
          idempotency_key?: string | null
          note?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["balance_log_type"]
          user_id?: string
        }
        Relationships: []
      }
      business_wallets: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: number
          instruction: string | null
          is_active: boolean
          payment_channel_id: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          currency: string
          deleted_at?: string | null
          id?: number
          instruction?: string | null
          is_active?: boolean
          payment_channel_id: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: number
          instruction?: string | null
          is_active?: boolean
          payment_channel_id?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_wallets_payment_channel_id_fkey"
            columns: ["payment_channel_id"]
            isOneToOne: false
            referencedRelation: "payment_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_rates: {
        Row: {
          created_at: string
          currency: string
          id: number
          is_active: boolean
          rate_per_coin: number
          region: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: number
          is_active?: boolean
          rate_per_coin: number
          region: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: number
          is_active?: boolean
          rate_per_coin?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          bac_amount: number
          business_wallet_id: number | null
          created_at: string
          currency: string
          fiat_amount: number
          id: number
          payment_channel_id: number
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          sender_number_or_addr: string
          status: Database["public"]["Enums"]["deposit_status"]
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bac_amount: number
          business_wallet_id?: number | null
          created_at?: string
          currency: string
          fiat_amount: number
          id?: number
          payment_channel_id: number
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          sender_number_or_addr: string
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bac_amount?: number
          business_wallet_id?: number | null
          created_at?: string
          currency?: string
          fiat_amount?: number
          id?: number
          payment_channel_id?: number
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          sender_number_or_addr?: string
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_business_wallet_id_fkey"
            columns: ["business_wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_payment_channel_id_fkey"
            columns: ["payment_channel_id"]
            isOneToOne: false
            referencedRelation: "payment_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          comment_text: string
          created_at: string
          deleted_at: string | null
          id: number
          parent_id: number | null
          post_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          parent_id?: number | null
          post_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          parent_id?: number | null
          post_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_admin_id: string | null
          category_id: number | null
          comments_count: number
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description_html: string
          id: number
          likes_count: number
          premium_only: boolean
          published_at: string | null
          shares_count: number
          status: Database["public"]["Enums"]["feed_status"]
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_admin_id?: string | null
          category_id?: number | null
          comments_count?: number
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_html: string
          id?: number
          likes_count?: number
          premium_only?: boolean
          published_at?: string | null
          shares_count?: number
          status?: Database["public"]["Enums"]["feed_status"]
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_admin_id?: string | null
          category_id?: number | null
          comments_count?: number
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_html?: string
          id?: number
          likes_count?: number
          premium_only?: boolean
          published_at?: string | null
          shares_count?: number
          status?: Database["public"]["Enums"]["feed_status"]
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feed_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          can_create_match: boolean
          coming_soon: boolean
          created_at: string
          deleted_at: string | null
          game_name: string
          id: number
          id_prefix: string | null
          image_url: string | null
          package_name: string | null
          sort_order: number
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          can_create_match?: boolean
          coming_soon?: boolean
          created_at?: string
          deleted_at?: string | null
          game_name: string
          id?: number
          id_prefix?: string | null
          image_url?: string | null
          package_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          can_create_match?: boolean
          coming_soon?: boolean
          created_at?: string
          deleted_at?: string | null
          game_name?: string
          id?: number
          id_prefix?: string | null
          image_url?: string | null
          package_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      match_participants: {
        Row: {
          created_at: string
          entry_fee_bac: number
          id: number
          joined_at: string
          kills: number
          match_id: number
          prize_bac: number
          rank_position: number | null
          refund_processed: boolean
          result_applied: boolean
          status: Database["public"]["Enums"]["participant_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_fee_bac?: number
          id?: number
          joined_at?: string
          kills?: number
          match_id: number
          prize_bac?: number
          rank_position?: number | null
          refund_processed?: boolean
          result_applied?: boolean
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_fee_bac?: number
          id?: number
          joined_at?: string
          kills?: number
          match_id?: number
          prize_bac?: number
          rank_position?: number | null
          refund_processed?: boolean
          result_applied?: boolean
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_result_media: {
        Row: {
          created_at: string
          id: number
          match_id: number
          result_description: string | null
          result_image_url: string | null
          updated_at: string
          uploaded_by_admin_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          match_id: number
          result_description?: string | null
          result_image_url?: string | null
          updated_at?: string
          uploaded_by_admin_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          match_id?: number
          result_description?: string | null
          result_image_url?: string | null
          updated_at?: string
          uploaded_by_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_result_media_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          banner_image_url: string | null
          created_at: string
          created_by_admin_id: string | null
          deleted_at: string | null
          description: string | null
          entry_fee_bac: number
          game_id: number
          game_mode: Database["public"]["Enums"]["match_game_mode"]
          id: number
          kill_rate_type: Database["public"]["Enums"]["match_kill_rate_type"]
          map_image_url: string | null
          map_name: string
          match_name: string
          match_type: Database["public"]["Enums"]["match_type"]
          match_url: string | null
          per_kill_amount_bac: number
          platform_fee_pct: number
          player_mode: Database["public"]["Enums"]["match_player_mode"]
          premium_only: boolean
          private_description: string | null
          prize_description: string | null
          rank_1_prize_bac: number
          rank_2_prize_bac: number
          rank_3_prize_bac: number
          result_applied: boolean
          reward_type: Database["public"]["Enums"]["match_reward_type"]
          room_id: string | null
          room_password: string | null
          schedule_at: string
          sponsor: string | null
          status: Database["public"]["Enums"]["match_status"]
          total_players: number
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_fee_bac?: number
          game_id: number
          game_mode: Database["public"]["Enums"]["match_game_mode"]
          id?: number
          kill_rate_type?: Database["public"]["Enums"]["match_kill_rate_type"]
          map_image_url?: string | null
          map_name: string
          match_name: string
          match_type: Database["public"]["Enums"]["match_type"]
          match_url?: string | null
          per_kill_amount_bac?: number
          platform_fee_pct?: number
          player_mode: Database["public"]["Enums"]["match_player_mode"]
          premium_only?: boolean
          private_description?: string | null
          prize_description?: string | null
          rank_1_prize_bac?: number
          rank_2_prize_bac?: number
          rank_3_prize_bac?: number
          result_applied?: boolean
          reward_type?: Database["public"]["Enums"]["match_reward_type"]
          room_id?: string | null
          room_password?: string | null
          schedule_at: string
          sponsor?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_players: number
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deleted_at?: string | null
          description?: string | null
          entry_fee_bac?: number
          game_id?: number
          game_mode?: Database["public"]["Enums"]["match_game_mode"]
          id?: number
          kill_rate_type?: Database["public"]["Enums"]["match_kill_rate_type"]
          map_image_url?: string | null
          map_name?: string
          match_name?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          match_url?: string | null
          per_kill_amount_bac?: number
          platform_fee_pct?: number
          player_mode?: Database["public"]["Enums"]["match_player_mode"]
          premium_only?: boolean
          private_description?: string | null
          prize_description?: string | null
          rank_1_prize_bac?: number
          rank_2_prize_bac?: number
          rank_3_prize_bac?: number
          result_applied?: boolean
          reward_type?: Database["public"]["Enums"]["match_reward_type"]
          room_id?: string | null
          room_password?: string | null
          schedule_at?: string
          sponsor?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_players?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          email_body_html: string | null
          email_subject: string | null
          id: number
          is_email_enabled: boolean
          is_inapp_enabled: boolean
          message_template: string
          slug: string
          title_template: string
          updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          created_at?: string
          email_body_html?: string | null
          email_subject?: string | null
          id?: number
          is_email_enabled?: boolean
          is_inapp_enabled?: boolean
          message_template: string
          slug: string
          title_template: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          created_at?: string
          email_body_html?: string | null
          email_subject?: string | null
          id?: number
          is_email_enabled?: boolean
          is_inapp_enabled?: boolean
          message_template?: string
          slug?: string
          title_template?: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience_type: Database["public"]["Enums"]["audience_type"]
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          created_by_admin_id: string | null
          id: number
          message: string
          premium_only: boolean
          scheduled_at: string | null
          sent_at: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          audience_type?: Database["public"]["Enums"]["audience_type"]
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          created_by_admin_id?: string | null
          id?: number
          message: string
          premium_only?: boolean
          scheduled_at?: string | null
          sent_at?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          audience_type?: Database["public"]["Enums"]["audience_type"]
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          created_by_admin_id?: string | null
          id?: number
          message?: string
          premium_only?: boolean
          scheduled_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_channels: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          icon_url: string | null
          id: number
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      premium_histories: {
        Row: {
          balance_log_id: number | null
          created_at: string
          duration_days: number
          expires_at: string
          id: number
          price_bac: number
          started_at: string
          type: Database["public"]["Enums"]["premium_event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_log_id?: number | null
          created_at?: string
          duration_days: number
          expires_at: string
          id?: number
          price_bac: number
          started_at?: string
          type: Database["public"]["Enums"]["premium_event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_log_id?: number | null
          created_at?: string
          duration_days?: number
          expires_at?: string
          id?: number
          price_bac?: number
          started_at?: string
          type?: Database["public"]["Enums"]["premium_event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_histories_balance_log_id_fkey"
            columns: ["balance_log_id"]
            isOneToOne: false
            referencedRelation: "balance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_settings: {
        Row: {
          benefits_text: string | null
          duration_days: number
          id: number
          is_active: boolean
          price_bac: number
          updated_at: string
        }
        Insert: {
          benefits_text?: string | null
          duration_days?: number
          id?: number
          is_active?: boolean
          price_bac?: number
          updated_at?: string
        }
        Update: {
          benefits_text?: string | null
          duration_days?: number
          id?: number
          is_active?: boolean
          price_bac?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bac_coin_balance: number
          country: string | null
          country_code: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          game_server: Database["public"]["Enums"]["game_server"] | null
          id: string
          in_game_username: string | null
          is_active: boolean
          is_premium: boolean
          is_suspended: boolean
          language_preference: string
          mobile_number: string | null
          premium_expires_at: string | null
          pubg_id: string | null
          referral_code: string | null
          referred_by: string | null
          suspension_reason: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bac_coin_balance?: number
          country?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          game_server?: Database["public"]["Enums"]["game_server"] | null
          id: string
          in_game_username?: string | null
          is_active?: boolean
          is_premium?: boolean
          is_suspended?: boolean
          language_preference?: string
          mobile_number?: string | null
          premium_expires_at?: string | null
          pubg_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bac_coin_balance?: number
          country?: string | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          game_server?: Database["public"]["Enums"]["game_server"] | null
          id?: string
          in_game_username?: string | null
          is_active?: boolean
          is_premium?: boolean
          is_suspended?: boolean
          language_preference?: string
          mobile_number?: string | null
          premium_expires_at?: string | null
          pubg_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      referral_configs: {
        Row: {
          deposit_commission: number
          id: number
          is_enabled: boolean
          min_paid_match_fee: number
          paid_match_commission: number
          signup_bonus_bac: number
          updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          deposit_commission?: number
          id?: number
          is_enabled?: boolean
          min_paid_match_fee?: number
          paid_match_commission?: number
          signup_bonus_bac?: number
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          deposit_commission?: number
          id?: number
          is_enabled?: boolean
          min_paid_match_fee?: number
          paid_match_commission?: number
          signup_bonus_bac?: number
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: []
      }
      referral_transactions: {
        Row: {
          bonus_bac: number
          commission_rate: number
          created_at: string
          id: number
          idempotency_key: string
          referred_user_id: string
          referrer_user_id: string
          source_reference_id: number | null
          source_type: Database["public"]["Enums"]["referral_source_type"]
          status: Database["public"]["Enums"]["referral_txn_status"]
          updated_at: string
        }
        Insert: {
          bonus_bac?: number
          commission_rate?: number
          created_at?: string
          id?: number
          idempotency_key: string
          referred_user_id: string
          referrer_user_id: string
          source_reference_id?: number | null
          source_type: Database["public"]["Enums"]["referral_source_type"]
          status?: Database["public"]["Enums"]["referral_txn_status"]
          updated_at?: string
        }
        Update: {
          bonus_bac?: number
          commission_rate?: number
          created_at?: string
          id?: number
          idempotency_key?: string
          referred_user_id?: string
          referrer_user_id?: string
          source_reference_id?: number | null
          source_type?: Database["public"]["Enums"]["referral_source_type"]
          status?: Database["public"]["Enums"]["referral_txn_status"]
          updated_at?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          admin_id: string | null
          alert_type: Database["public"]["Enums"]["security_alert_type"]
          created_at: string
          description: string
          id: number
          ip_address: string | null
          is_resolved: boolean
          resolved_at: string | null
          resolved_by_admin_id: string | null
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          alert_type: Database["public"]["Enums"]["security_alert_type"]
          created_at?: string
          description: string
          id?: number
          ip_address?: string | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          alert_type?: Database["public"]["Enums"]["security_alert_type"]
          created_at?: string
          description?: string
          id?: number
          ip_address?: string | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_packages: {
        Row: {
          bac_amount: number
          category_id: number | null
          created_at: string
          deleted_at: string | null
          discount_percentage: number
          id: number
          image_url: string | null
          is_active: boolean
          price_currency: string
          price_value: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          bac_amount: number
          category_id?: number | null
          created_at?: string
          deleted_at?: string | null
          discount_percentage?: number
          id?: number
          image_url?: string | null
          is_active?: boolean
          price_currency?: string
          price_value?: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          bac_amount?: number
          category_id?: number | null
          created_at?: string
          deleted_at?: string | null
          discount_percentage?: number
          id?: number
          image_url?: string | null
          is_active?: boolean
          price_currency?: string
          price_value?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      static_pages: {
        Row: {
          content_html: string
          created_at: string
          id: number
          slug: string
          title: string
          updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          content_html: string
          created_at?: string
          id?: number
          slug: string
          title: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          content_html?: string
          created_at?: string
          id?: number
          slug?: string
          title?: string
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          id: number
          message: string
          read_at: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          ticket_id: number
          updated_at: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: number
          message: string
          read_at?: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          ticket_id: number
          updated_at?: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: number
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["sender_type"]
          ticket_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          deleted_at: string | null
          id: number
          last_message_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          unread_admin: number
          unread_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: number
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: number
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          archived_at: string | null
          created_at: string
          id: number
          message: string
          notification_id: number | null
          read_at: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: number
          message: string
          notification_id?: number | null
          read_at?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: number
          message?: string
          notification_id?: number | null
          read_at?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
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
      website_settings: {
        Row: {
          id: number
          key: string
          label: string | null
          type: Database["public"]["Enums"]["setting_value_type"]
          updated_at: string
          updated_by_admin_id: string | null
          value: string | null
        }
        Insert: {
          id?: number
          key: string
          label?: string | null
          type?: Database["public"]["Enums"]["setting_value_type"]
          updated_at?: string
          updated_by_admin_id?: string | null
          value?: string | null
        }
        Update: {
          id?: number
          key?: string
          label?: string | null
          type?: Database["public"]["Enums"]["setting_value_type"]
          updated_at?: string
          updated_by_admin_id?: string | null
          value?: string | null
        }
        Relationships: []
      }
      withdraw_configs: {
        Row: {
          fee_type: Database["public"]["Enums"]["withdraw_fee_type"]
          fee_value: number
          id: number
          max_bac: number
          min_bac: number
          updated_at: string
          updated_by_admin_id: string | null
          withdraw_percentage: number
        }
        Insert: {
          fee_type?: Database["public"]["Enums"]["withdraw_fee_type"]
          fee_value?: number
          id?: number
          max_bac?: number
          min_bac?: number
          updated_at?: string
          updated_by_admin_id?: string | null
          withdraw_percentage?: number
        }
        Update: {
          fee_type?: Database["public"]["Enums"]["withdraw_fee_type"]
          fee_value?: number
          id?: number
          max_bac?: number
          min_bac?: number
          updated_at?: string
          updated_by_admin_id?: string | null
          withdraw_percentage?: number
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          bac_amount: number
          balance_held: boolean
          cancel_reason: string | null
          created_at: string
          currency: string
          fee_bac: number
          fiat_amount: number | null
          final_payout_amount: number | null
          id: number
          payment_channel_id: number
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["withdraw_status"]
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          bac_amount: number
          balance_held?: boolean
          cancel_reason?: string | null
          created_at?: string
          currency: string
          fee_bac?: number
          fiat_amount?: number | null
          final_payout_amount?: number | null
          id?: number
          payment_channel_id: number
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["withdraw_status"]
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          bac_amount?: number
          balance_held?: boolean
          cancel_reason?: string | null
          created_at?: string
          currency?: string
          fee_bac?: number
          fiat_amount?: number | null
          final_payout_amount?: number | null
          id?: number
          payment_channel_id?: number
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["withdraw_status"]
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_payment_channel_id_fkey"
            columns: ["payment_channel_id"]
            isOneToOne: false
            referencedRelation: "payment_channels"
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
      is_admin: { Args: never; Returns: boolean }
      submit_deposit: {
        Args: {
          p_bac_amount: number
          p_business_wallet_id: number
          p_currency: string
          p_fiat_amount: number
          p_payment_channel_id: number
          p_sender: string
          p_transaction_id: string
        }
        Returns: number
      }
      submit_withdrawal: {
        Args: {
          p_bac: number
          p_currency: string
          p_payment_channel_id: number
          p_wallet_address: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      audience_type: "all" | "selected"
      balance_log_type:
        | "deposit"
        | "withdraw"
        | "match_entry_fee"
        | "match_prize"
        | "refund"
        | "shop_purchase"
        | "premium_purchase"
        | "admin_deposit"
        | "admin_withdraw"
        | "referral_bonus"
      deposit_status: "Pending" | "Approved" | "Rejected"
      entity_status: "active" | "inactive"
      feed_status: "Draft" | "Published"
      game_server: "Europe" | "Asia" | "SouthAmerica" | "MiddleEast" | "KRJP"
      handler_type: "system" | "admin"
      match_game_mode: "Classic" | "TDM"
      match_kill_rate_type: "Automatic" | "Manual"
      match_player_mode: "Solo" | "Duo" | "Squad"
      match_reward_type: "KillBased" | "RankBased"
      match_status: "Upcoming" | "Active" | "Ongoing" | "Complete" | "Cancelled"
      match_type: "Free" | "Paid"
      notification_category:
        | "General"
        | "Match"
        | "Payment"
        | "Reward"
        | "Warning"
        | "System"
        | "Promotion"
      participant_status:
        | "joined"
        | "pending"
        | "win"
        | "loss"
        | "refunded"
        | "cancelled"
      premium_event_type: "activate" | "extend"
      referral_source_type: "signup" | "deposit" | "paid_match"
      referral_txn_status: "pending" | "processed" | "failed"
      security_alert_type:
        | "brute_force"
        | "duplicate_transaction"
        | "unusual_withdraw"
        | "multiple_accounts_same_ip"
        | "banned_login_attempt"
        | "rate_limit_abuse"
        | "permission_abuse"
      sender_type: "user" | "admin"
      setting_value_type: "string" | "image" | "boolean" | "json" | "html"
      ticket_status: "Open" | "Pending" | "Replied" | "Closed"
      withdraw_fee_type: "none" | "fixed" | "percentage"
      withdraw_status:
        | "Pending"
        | "Processing"
        | "Paid"
        | "Cancelled"
        | "Rejected"
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
      app_role: ["admin", "moderator", "user"],
      audience_type: ["all", "selected"],
      balance_log_type: [
        "deposit",
        "withdraw",
        "match_entry_fee",
        "match_prize",
        "refund",
        "shop_purchase",
        "premium_purchase",
        "admin_deposit",
        "admin_withdraw",
        "referral_bonus",
      ],
      deposit_status: ["Pending", "Approved", "Rejected"],
      entity_status: ["active", "inactive"],
      feed_status: ["Draft", "Published"],
      game_server: ["Europe", "Asia", "SouthAmerica", "MiddleEast", "KRJP"],
      handler_type: ["system", "admin"],
      match_game_mode: ["Classic", "TDM"],
      match_kill_rate_type: ["Automatic", "Manual"],
      match_player_mode: ["Solo", "Duo", "Squad"],
      match_reward_type: ["KillBased", "RankBased"],
      match_status: ["Upcoming", "Active", "Ongoing", "Complete", "Cancelled"],
      match_type: ["Free", "Paid"],
      notification_category: [
        "General",
        "Match",
        "Payment",
        "Reward",
        "Warning",
        "System",
        "Promotion",
      ],
      participant_status: [
        "joined",
        "pending",
        "win",
        "loss",
        "refunded",
        "cancelled",
      ],
      premium_event_type: ["activate", "extend"],
      referral_source_type: ["signup", "deposit", "paid_match"],
      referral_txn_status: ["pending", "processed", "failed"],
      security_alert_type: [
        "brute_force",
        "duplicate_transaction",
        "unusual_withdraw",
        "multiple_accounts_same_ip",
        "banned_login_attempt",
        "rate_limit_abuse",
        "permission_abuse",
      ],
      sender_type: ["user", "admin"],
      setting_value_type: ["string", "image", "boolean", "json", "html"],
      ticket_status: ["Open", "Pending", "Replied", "Closed"],
      withdraw_fee_type: ["none", "fixed", "percentage"],
      withdraw_status: [
        "Pending",
        "Processing",
        "Paid",
        "Cancelled",
        "Rejected",
      ],
    },
  },
} as const
