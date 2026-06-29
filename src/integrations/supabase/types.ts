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
          admin_name: string | null
          created_at: string
          id: number
          ip_address: string | null
          module: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_name?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          module: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_totp_secrets: {
        Row: {
          created_at: string
          enabled: boolean
          last_verified_at: string | null
          recovery_codes: string[]
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          last_verified_at?: string | null
          recovery_codes?: string[]
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          last_verified_at?: string | null
          recovery_codes?: string[]
          secret?: string
          updated_at?: string
          user_id?: string
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
      backup_logs: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: number
          initiated_by_admin_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: number
          initiated_by_admin_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: number
          initiated_by_admin_id?: string | null
          started_at?: string
          status?: string
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
      chatbot_knowledge: {
        Row: {
          answer: string
          created_at: string
          enabled: boolean
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          enabled?: boolean
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          enabled?: boolean
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_settings: {
        Row: {
          bubble_title: string
          created_at: string
          enabled: boolean
          id: number
          model: string
          rate_limit_per_hour: number
          system_prompt: string
          updated_at: string
          welcome_message: string
        }
        Insert: {
          bubble_title?: string
          created_at?: string
          enabled?: boolean
          id?: number
          model?: string
          rate_limit_per_hour?: number
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          bubble_title?: string
          created_at?: string
          enabled?: boolean
          id?: number
          model?: string
          rate_limit_per_hour?: number
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
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
      daily_login_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_claim_date: string | null
          longest_streak: number
          total_bac_earned: number
          total_claims: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_bac_earned?: number
          total_claims?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_bac_earned?: number
          total_claims?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          quest_type: string
          reward_bac: number
          sort_order: number
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          quest_type: string
          reward_bac?: number
          sort_order?: number
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          quest_type?: string
          reward_bac?: number
          sort_order?: number
          target_value?: number
          title?: string
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
      direct_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
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
          live_stream_url: string | null
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
          live_stream_url?: string | null
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
          live_stream_url?: string | null
          package_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          browser: string | null
          browser_version: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          device: string | null
          id: number
          ip_address: string | null
          login_at: string
          os: string | null
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          device?: string | null
          id?: number
          ip_address?: string | null
          login_at?: string
          os?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          device?: string | null
          id?: number
          ip_address?: string | null
          login_at?: string
          os?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      match_participants: {
        Row: {
          bonus_bac: number
          created_at: string
          entry_fee_bac: number
          id: number
          joined_at: string
          kill_prize_bac: number
          kills: number
          match_id: number
          prize_bac: number
          rank_position: number | null
          refund_processed: boolean
          result_applied: boolean
          status: Database["public"]["Enums"]["participant_status"]
          updated_at: string
          user_id: string
          win_prize_bac: number
        }
        Insert: {
          bonus_bac?: number
          created_at?: string
          entry_fee_bac?: number
          id?: number
          joined_at?: string
          kill_prize_bac?: number
          kills?: number
          match_id: number
          prize_bac?: number
          rank_position?: number | null
          refund_processed?: boolean
          result_applied?: boolean
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id: string
          win_prize_bac?: number
        }
        Update: {
          bonus_bac?: number
          created_at?: string
          entry_fee_bac?: number
          id?: number
          joined_at?: string
          kill_prize_bac?: number
          kills?: number
          match_id?: number
          prize_bac?: number
          rank_position?: number | null
          refund_processed?: boolean
          result_applied?: boolean
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id?: string
          win_prize_bac?: number
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
          live_stream_url: string | null
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
          live_stream_url?: string | null
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
          live_stream_url?: string | null
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
      online_sessions: {
        Row: {
          browser: string | null
          country_code: string | null
          created_at: string
          device: string | null
          expires_at: string
          id: number
          ip_address: string | null
          last_seen_at: string
          os: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device?: string | null
          expires_at?: string
          id?: number
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device?: string | null
          expires_at?: string
          id?: number
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
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
          active_session_token: string | null
          active_theme: string | null
          avatar_url: string | null
          bac_coin_balance: number
          bio: string | null
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
          social_links: Json
          suspension_reason: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          active_session_token?: string | null
          active_theme?: string | null
          avatar_url?: string | null
          bac_coin_balance?: number
          bio?: string | null
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
          social_links?: Json
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          active_session_token?: string | null
          active_theme?: string | null
          avatar_url?: string | null
          bac_coin_balance?: number
          bio?: string | null
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
          social_links?: Json
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          action_key: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          action_key: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          action_key?: string
          created_at?: string
          id?: number
          user_id?: string
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
      shop_purchases: {
        Row: {
          admin_note: string | null
          bac_amount: number
          business_wallet_id: number | null
          created_at: string
          id: number
          package_id: number
          payment_channel_id: number | null
          price_currency: string
          price_value: number
          reviewed_at: string | null
          reviewed_by: string | null
          sender_number_or_addr: string
          status: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          bac_amount: number
          business_wallet_id?: number | null
          created_at?: string
          id?: number
          package_id: number
          payment_channel_id?: number | null
          price_currency: string
          price_value: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number_or_addr: string
          status?: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          bac_amount?: number
          business_wallet_id?: number | null
          created_at?: string
          id?: number
          package_id?: number
          payment_channel_id?: number | null
          price_currency?: string
          price_value?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number_or_addr?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_business_wallet_id_fkey"
            columns: ["business_wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shop_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_purchases_payment_channel_id_fkey"
            columns: ["payment_channel_id"]
            isOneToOne: false
            referencedRelation: "payment_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_hashtags: {
        Row: {
          created_at: string
          id: number
          posts_count: number
          tag: string
        }
        Insert: {
          created_at?: string
          id?: number
          posts_count?: number
          tag: string
        }
        Update: {
          created_at?: string
          id?: number
          posts_count?: number
          tag?: string
        }
        Relationships: []
      }
      social_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_hashtags: {
        Row: {
          created_at: string
          hashtag_id: number
          post_id: string
        }
        Insert: {
          created_at?: string
          hashtag_id: number
          post_id: string
        }
        Update: {
          created_at?: string
          hashtag_id?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "social_hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          position: number
          post_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          position?: number
          post_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          position?: number
          post_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          comments_count: number
          created_at: string
          id: string
          is_edited: boolean
          likes_count: number
          media_type: string
          media_url: string | null
          updated_at: string
          user_id: string
          views_count: number
          visibility: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          is_edited?: boolean
          likes_count?: number
          media_type?: string
          media_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number
          visibility?: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          is_edited?: boolean
          likes_count?: number
          media_type?: string
          media_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number
          visibility?: string
        }
        Relationships: []
      }
      social_stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      social_story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "social_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      social_story_views: {
        Row: {
          created_at: string
          story_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "social_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_history: {
        Row: {
          created_at: string
          id: string
          is_free: boolean
          reward_amount: number
          reward_type: string
          segment_id: string | null
          spin_cost: number
          spin_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_free?: boolean
          reward_amount?: number
          reward_type: string
          segment_id?: string | null
          spin_cost?: number
          spin_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_free?: boolean
          reward_amount?: number
          reward_type?: string
          segment_id?: string | null
          spin_cost?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spin_history_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "spin_wheel_config"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_settings: {
        Row: {
          extra_spin_cost_bac: number
          free_spins_per_day: number
          id: number
          is_enabled: boolean
          max_spins_per_day: number
          spin_cost_bac: number
          updated_at: string
        }
        Insert: {
          extra_spin_cost_bac?: number
          free_spins_per_day?: number
          id?: number
          is_enabled?: boolean
          max_spins_per_day?: number
          spin_cost_bac?: number
          updated_at?: string
        }
        Update: {
          extra_spin_cost_bac?: number
          free_spins_per_day?: number
          id?: number
          is_enabled?: boolean
          max_spins_per_day?: number
          spin_cost_bac?: number
          updated_at?: string
        }
        Relationships: []
      }
      spin_wheel_config: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          reward_amount: number
          reward_type: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          reward_amount?: number
          reward_type?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          reward_amount?: number
          reward_type?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
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
      theme_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          preview_color: string
          price_bac: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          is_default?: boolean
          name: string
          preview_color?: string
          price_bac?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          preview_color?: string
          price_bac?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          actor_id: string | null
          archived_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          link: string | null
          message: string
          notification_id: number | null
          read_at: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          archived_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          link?: string | null
          message: string
          notification_id?: number | null
          read_at?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          archived_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          link?: string | null
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
      user_quest_progress: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          is_claimed: boolean
          is_completed: boolean
          progress: number
          quest_date: string
          quest_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          progress?: number
          quest_date?: string
          quest_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          progress?: number
          quest_date?: string
          quest_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
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
      user_theme_purchases: {
        Row: {
          id: string
          price_paid_bac: number
          purchased_at: string
          theme_id: string
          user_id: string
        }
        Insert: {
          id?: string
          price_paid_bac?: number
          purchased_at?: string
          theme_id: string
          user_id: string
        }
        Update: {
          id?: string
          price_paid_bac?: number
          purchased_at?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_purchases_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "theme_config"
            referencedColumns: ["id"]
          },
        ]
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
      add_feed_comment: {
        Args: { p_parent?: number; p_post_id: number; p_text: string }
        Returns: number
      }
      admin_adjust_balance: {
        Args: { p_delta: number; p_note: string; p_user_id: string }
        Returns: number
      }
      admin_cancel_match: {
        Args: { p_match_id: number; p_reason: string }
        Returns: number
      }
      admin_delete_all_matches: { Args: never; Returns: number }
      admin_delete_all_non_admin_users: { Args: never; Returns: number }
      admin_delete_feed_category: { Args: { p_id: number }; Returns: undefined }
      admin_delete_feed_post: { Args: { p_id: number }; Returns: undefined }
      admin_delete_match: { Args: { p_match_id: number }; Returns: undefined }
      admin_delete_notification_template: {
        Args: { p_id: number }
        Returns: undefined
      }
      admin_delete_premium_plan: { Args: { p_id: number }; Returns: undefined }
      admin_delete_shop_category: { Args: { p_id: number }; Returns: undefined }
      admin_delete_shop_package: { Args: { p_id: number }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_force_logout_all: { Args: never; Returns: number }
      admin_force_logout_user: { Args: { _user_id: string }; Returns: number }
      admin_publish_match_result: {
        Args: {
          p_match_id: number
          p_result_description?: string
          p_result_image_url?: string
          p_results: Json
        }
        Returns: number
      }
      admin_reset_user_history: {
        Args: { p_scopes: string[]; p_user_id: string }
        Returns: Json
      }
      admin_resolve_security_alert: {
        Args: { p_id: number }
        Returns: undefined
      }
      admin_review_delete_request: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: undefined
      }
      admin_review_deposit: {
        Args: { p_approve: boolean; p_id: number; p_reason?: string }
        Returns: undefined
      }
      admin_review_shop_purchase: {
        Args: { p_approve: boolean; p_id: number; p_note?: string }
        Returns: undefined
      }
      admin_review_withdrawal: {
        Args: {
          p_approve: boolean
          p_fiat_amount?: number
          p_id: number
          p_reason?: string
        }
        Returns: undefined
      }
      admin_save_feed_category: {
        Args: { p_id: number; p_name: string; p_slug: string }
        Returns: number
      }
      admin_save_feed_post: {
        Args: {
          p_category_id: number
          p_cover_image_url: string
          p_description_html: string
          p_id: number
          p_premium_only: boolean
          p_status: string
          p_title: string
        }
        Returns: number
      }
      admin_save_match: {
        Args: { p_match_id: number; p_payload: Json }
        Returns: number
      }
      admin_save_notification_template: {
        Args: { p_id: number; p_payload: Json }
        Returns: number
      }
      admin_save_premium_plan: {
        Args: {
          p_benefits_text: string
          p_duration_days: number
          p_id: number
          p_is_active: boolean
          p_price_bac: number
        }
        Returns: number
      }
      admin_save_referral_config: { Args: { p_payload: Json }; Returns: number }
      admin_save_shop_category: {
        Args: {
          p_id: number
          p_name: string
          p_slug: string
          p_sort_order?: number
        }
        Returns: number
      }
      admin_save_shop_package: {
        Args: { p_id: number; p_payload: Json }
        Returns: number
      }
      admin_save_theme: { Args: { p_payload: Json }; Returns: string }
      admin_send_notification: {
        Args: {
          p_message: string
          p_target: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: number
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_unpublish_match_result: {
        Args: { p_match_id: number }
        Returns: number
      }
      admin_unsuspend_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_update_profile: {
        Args: {
          p_avatar_url?: string
          p_country_code?: string
          p_game_server?: string
          p_in_game_username?: string
          p_is_active?: boolean
          p_mobile_number?: string
          p_pubg_id?: string
          p_referral_code?: string
          p_user_id: string
          p_username?: string
        }
        Returns: undefined
      }
      archive_notification: { Args: { p_id: number }; Returns: undefined }
      buy_premium: { Args: { p_plan_id: number }; Returns: number }
      check_rate_limit: {
        Args: { _action: string; _max: number; _window_secs: number }
        Returns: undefined
      }
      claim_active_session: { Args: { _token: string }; Returns: undefined }
      claim_daily_login: { Args: never; Returns: Json }
      claim_quest_reward: { Args: { _quest_id: string }; Returns: Json }
      close_support_ticket: {
        Args: { p_ticket_id: number }
        Returns: undefined
      }
      create_support_ticket: {
        Args: { p_message: string; p_subject: string }
        Returns: number
      }
      get_match_credentials: {
        Args: { _match_id: string }
        Returns: {
          room_id: string
          room_password: string
        }[]
      }
      get_or_create_thread: { Args: { other_user: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heartbeat_session: {
        Args: { _session_token: string }
        Returns: undefined
      }
      increment_feed_view: { Args: { p_post_id: number }; Returns: undefined }
      increment_social_post_view: {
        Args: { p_post_id: string }
        Returns: number
      }
      is_active_session: { Args: { _token: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      join_match: { Args: { p_match_id: number }; Returns: number }
      mark_notifications_read: { Args: { p_ids?: number[] }; Returns: number }
      mark_ticket_read: { Args: { p_ticket_id: number }; Returns: undefined }
      notify_premium_lifecycle: { Args: never; Returns: number }
      notify_user: {
        Args: {
          p_default_message: string
          p_default_title: string
          p_key: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      perform_spin: { Args: never; Returns: Json }
      purchase_theme: { Args: { p_theme_id: string }; Returns: Json }
      record_login_event: {
        Args: {
          _browser: string
          _browser_version: string
          _country_code: string
          _country_name: string
          _device: string
          _ip: string
          _os: string
          _platform: string
          _session_token: string
          _user_agent: string
        }
        Returns: undefined
      }
      send_support_message: {
        Args: { p_message: string; p_ticket_id: number }
        Returns: number
      }
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
      submit_shop_purchase: {
        Args: {
          p_business_wallet_id: number
          p_package_id: number
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
      sync_daily_quest_progress: { Args: never; Returns: undefined }
      toggle_feed_like: { Args: { p_post_id: number }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "sub_admin" | "super_admin"
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
        | "theme_purchase"
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
      app_role: ["admin", "moderator", "user", "sub_admin", "super_admin"],
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
        "theme_purchase",
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
