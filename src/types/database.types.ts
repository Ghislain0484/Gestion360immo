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
      tickets: {
        Row: {
          id: string
          agency_id: string
          property_id: string | null
          unit_id: string | null
          tenant_id: string | null
          owner_id: string | null
          title: string
          description: string | null
          status: "open" | "in_progress" | "resolved" | "closed"
          priority: "low" | "medium" | "high" | "urgent"
          cost: number
          charge_to: "owner" | "agency" | "tenant" | null
          is_billable: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          assigned_to: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          property_id?: string | null
          unit_id?: string | null
          tenant_id?: string | null
          owner_id?: string | null
          title: string
          description?: string | null
          status?: "open" | "in_progress" | "resolved" | "closed"
          priority?: "low" | "medium" | "high" | "urgent"
          cost?: number
          charge_to?: "owner" | "agency" | "tenant" | null
          is_billable?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          assigned_to?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          property_id?: string | null
          unit_id?: string | null
          tenant_id?: string | null
          owner_id?: string | null
          title?: string
          description?: string | null
          status?: "open" | "in_progress" | "resolved" | "closed"
          priority?: "low" | "medium" | "high" | "urgent"
          cost?: number
          charge_to?: "owner" | "agency" | "tenant" | null
          is_billable?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          assigned_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          }
        ]
      }
      cash_transactions: {
        Row: {
          id: string
          agency_id: string
          type: "credit" | "debit"
          amount: number
          category: string
          description: string | null
          transaction_date: string
          related_property_id: string | null
          related_owner_id: string | null
          related_tenant_id: string | null
          related_ticket_id: string | null
          payment_method: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          type: "credit" | "debit"
          amount: number
          category: string
          description?: string | null
          transaction_date?: string
          related_property_id?: string | null
          related_owner_id?: string | null
          related_tenant_id?: string | null
          related_ticket_id?: string | null
          payment_method?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          type?: "credit" | "debit"
          amount?: number
          category?: string
          description?: string | null
          transaction_date?: string
          related_property_id?: string | null
          related_owner_id?: string | null
          related_tenant_id?: string | null
          related_ticket_id?: string | null
          payment_method?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_related_property_id_fkey"
            columns: ["related_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      agencies: {
        Row: {
          accreditation_number: string | null
          address: string
          city: string
          commercial_register: string
          created_at: string | null
          director_id: string | null
          email: string
          id: string
          is_accredited: boolean | null
          logo_url: string | null
          name: string
          phone: string
          status: string
          updated_at: string | null
        }
        Insert: {
          accreditation_number?: string | null
          address: string
          city: string
          commercial_register: string
          created_at?: string | null
          director_id?: string | null
          email: string
          id?: string
          is_accredited?: boolean | null
          logo_url?: string | null
          name: string
          phone: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          accreditation_number?: string | null
          address?: string
          city?: string
          commercial_register?: string
          created_at?: string | null
          director_id?: string | null
          email?: string
          id?: string
          is_accredited?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_rankings: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          metrics: Json | null
          rank: number
          recovery_rate_score: number | null
          rewards: Json | null
          satisfaction_score: number | null
          total_score: number
          updated_at: string | null
          volume_score: number | null
          year: number
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          metrics?: Json | null
          rank: number
          recovery_rate_score?: number | null
          rewards?: Json | null
          satisfaction_score?: number | null
          total_score?: number
          updated_at?: string | null
          volume_score?: number | null
          year: number
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          metrics?: Json | null
          rank?: number
          recovery_rate_score?: number | null
          rewards?: Json | null
          satisfaction_score?: number | null
          total_score?: number
          updated_at?: string | null
          volume_score?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_rankings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_registration_requests: {
        Row: {
          accreditation_number: string | null
          address: string
          admin_notes: string | null
          agency_name: string
          city: string
          commercial_register: string
          created_at: string | null
          director_auth_user_id: string | null
          director_email: string
          director_first_name: string
          director_last_name: string
          director_password: string | null
          id: string
          is_accredited: boolean | null
          logo_temp_path: string | null
          logo_url: string | null
          phone: string
          processed_at: string | null
          processed_by: string | null
          status: string | null
        }
        Insert: {
          accreditation_number?: string | null
          address: string
          admin_notes?: string | null
          agency_name: string
          city: string
          commercial_register: string
          created_at?: string | null
          director_auth_user_id?: string | null
          director_email: string
          director_first_name: string
          director_last_name: string
          director_password?: string | null
          id?: string
          is_accredited?: boolean | null
          logo_temp_path?: string | null
          logo_url?: string | null
          phone: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
        }
        Update: {
          accreditation_number?: string | null
          address?: string
          admin_notes?: string | null
          agency_name?: string
          city?: string
          commercial_register?: string
          created_at?: string | null
          director_auth_user_id?: string | null
          director_email?: string
          director_first_name?: string
          director_last_name?: string
          director_password?: string | null
          id?: string
          is_accredited?: boolean | null
          logo_temp_path?: string | null
          logo_url?: string | null
          phone?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_registration_requests_director_auth_user_id_fkey"
            columns: ["director_auth_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_registration_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          created_at: string | null
          end_date: string | null
          id: string
          last_payment_date: string | null
          monthly_fee: number
          next_payment_date: string
          payment_history: Json | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          suspension_reason: string | null
          trial_days_remaining: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          last_payment_date?: string | null
          monthly_fee?: number
          next_payment_date?: string
          payment_history?: Json | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          suspension_reason?: string | null
          trial_days_remaining?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          last_payment_date?: string | null
          monthly_fee?: number
          next_payment_date?: string
          payment_history?: Json | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          suspension_reason?: string | null
          trial_days_remaining?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_users: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["agency_user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["agency_user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["agency_user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_interests: {
        Row: {
          agency_id: string
          announcement_id: string
          created_at: string | null
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          agency_id: string
          announcement_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          status: string
          user_id: string
        }
        Update: {
          agency_id?: string
          announcement_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_interests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_interests_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          agency_id: string
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          property_id: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string | null
          views: number | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          property_id: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          property_id?: string
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          agency_id: string | null
          body: string
          contract_type: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          metadata: Json | null
          name: string
          updated_at: string
          usage_type: string | null
          variables: string[]
          version: number
        }
        Insert: {
          agency_id?: string | null
          body: string
          contract_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          metadata?: Json | null
          name: string
          updated_at?: string
          usage_type?: string | null
          variables?: string[]
          version?: number
        }
        Update: {
          agency_id?: string | null
          body?: string
          contract_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
          usage_type?: string | null
          variables?: string[]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          body: string
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          version_number: number
        }
        Insert: {
          body: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          version_number: number
        }
        Update: {
          body?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_managed"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          agency_id: string
          charges: number | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          deposit: number | null
          documents: Json | null
          end_date: string | null
          id: string
          monthly_rent: number | null
          owner_id: string
          property_id: string | null
          sale_price: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string | null
          terms: string
          type: Database["public"]["Enums"]["contract_type"]
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          charges?: number | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          deposit?: number | null
          documents?: Json | null
          end_date?: string | null
          id?: string
          monthly_rent?: number | null
          owner_id: string
          property_id?: string | null
          sale_price?: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string | null
          terms: string
          type: Database["public"]["Enums"]["contract_type"]
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          charges?: number | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          deposit?: number | null
          documents?: Json | null
          end_date?: string | null
          id?: string
          monthly_rent?: number | null
          owner_id?: string
          property_id?: string | null
          sale_price?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string | null
          terms?: string
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_managed: {
        Row: {
          agency_id: string | null
          context_snapshot: Json
          contract_type: string
          created_at: string
          created_by: string | null
          document_url: string | null
          effective_date: string | null
          end_date: string | null
          financial_terms: Json | null
          id: string
          owner_id: string | null
          property_id: string | null
          renewal_date: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id?: string | null
          context_snapshot?: Json
          contract_type: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          effective_date?: string | null
          end_date?: string | null
          financial_terms?: Json | null
          id?: string
          owner_id?: string | null
          property_id?: string | null
          renewal_date?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string | null
          context_snapshot?: Json
          contract_type?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          effective_date?: string | null
          end_date?: string | null
          financial_terms?: Json | null
          id?: string
          owner_id?: string | null
          property_id?: string | null
          renewal_date?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_managed_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_managed_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_managed_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_managed_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_managed_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_statements: {
        Row: {
          agency_id: string
          created_at: string | null
          generated_at: string | null
          generated_by: string
          id: string
          net_balance: number | null
          owner_id: string | null
          pending_payments: number | null
          period_end: string
          period_start: string
          tenant_id: string | null
          total_expenses: number | null
          total_income: number | null
          transactions: Json | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          generated_at?: string | null
          generated_by: string
          id?: string
          net_balance?: number | null
          owner_id?: string | null
          pending_payments?: number | null
          period_end: string
          period_start: string
          tenant_id?: string | null
          total_expenses?: number | null
          total_income?: number | null
          transactions?: Json | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          net_balance?: number | null
          owner_id?: string | null
          pending_payments?: number | null
          period_end?: string
          period_start?: string
          tenant_id?: string | null
          total_expenses?: number | null
          total_income?: number | null
          transactions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_statements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          agency_id: string | null
          announcement_id: string | null
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          property_id: string | null
          receiver_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          agency_id?: string | null
          announcement_id?: string | null
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          property_id?: string | null
          receiver_id: string
          sender_id: string
          subject: string
        }
        Update: {
          agency_id?: string | null
          announcement_id?: string | null
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          property_id?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          contract_expiry: boolean
          created_at: string | null
          id: string
          new_interest: boolean
          new_message: boolean
          payment_reminder: boolean
          property_update: boolean
          rental_alert: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contract_expiry?: boolean
          created_at?: string | null
          id?: string
          new_interest?: boolean
          new_message?: boolean
          payment_reminder?: boolean
          property_update?: boolean
          rental_alert?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contract_expiry?: boolean
          created_at?: string | null
          id?: string
          new_interest?: boolean
          new_message?: boolean
          payment_reminder?: boolean
          property_update?: boolean
          rental_alert?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          priority: Database["public"]["Enums"]["notif_priority"]
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          priority: Database["public"]["Enums"]["notif_priority"]
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: Database["public"]["Enums"]["notif_priority"]
          title?: string
          type?: Database["public"]["Enums"]["notif_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string
          agency_id: string
          children_count: number | null
          city: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          phone: string
          property_title: Database["public"]["Enums"]["property_title"]
          property_title_details: string | null
          spouse_name: string | null
          spouse_phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          agency_id: string
          children_count?: number | null
          city: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          phone: string
          property_title: Database["public"]["Enums"]["property_title"]
          property_title_details?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          agency_id?: string
          children_count?: number | null
          city?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          marital_status?: Database["public"]["Enums"]["marital_status"]
          phone?: string
          property_title?: Database["public"]["Enums"]["property_title"]
          property_title_details?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owners_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agency_id: string
          created_at: string | null
          description: string | null
          details: Json
          for_rent: boolean | null
          for_sale: boolean | null
          id: string
          images: Json | null
          is_available: boolean | null
          location: Json
          owner_id: string
          rooms: Json | null
          standing: Database["public"]["Enums"]["property_standing"]
          title: string
          updated_at: string | null
          usage_type: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description?: string | null
          details?: Json
          for_rent?: boolean | null
          for_sale?: boolean | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          location?: Json
          owner_id: string
          rooms?: Json | null
          standing: Database["public"]["Enums"]["property_standing"]
          title: string
          updated_at?: string | null
          usage_type?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string | null
          details?: Json
          for_rent?: boolean | null
          for_sale?: boolean | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          location?: Json
          owner_id?: string
          rooms?: Json | null
          standing?: Database["public"]["Enums"]["property_standing"]
          title?: string
          updated_at?: string | null
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      property_tenant_assignments: {
        Row: {
          agency_id: string | null
          charges_amount: number | null
          created_at: string
          created_by: string | null
          id: string
          lease_end: string | null
          lease_start: string
          notes: string | null
          property_id: string
          rent_amount: number
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id?: string | null
          charges_amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lease_end?: string | null
          lease_start: string
          notes?: string | null
          property_id: string
          rent_amount?: number
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string | null
          charges_amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_tenant_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_tenant_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_tenant_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_receipts: {
        Row: {
          charges: number | null
          commission_amount: number
          contract_id: string
          created_at: string | null
          id: string
          issued_by: string
          notes: string | null
          owner_id: string | null
          owner_payment: number
          payment_date: string
          payment_method: Database["public"]["Enums"]["pay_method"]
          period_month: number
          period_year: number
          property_id: string | null
          receipt_number: string
          rent_amount: number
          tenant_id: string | null
          total_amount: number
        }
        Insert: {
          charges?: number | null
          commission_amount: number
          contract_id: string
          created_at?: string | null
          id?: string
          issued_by: string
          notes?: string | null
          owner_id?: string | null
          owner_payment: number
          payment_date: string
          payment_method: Database["public"]["Enums"]["pay_method"]
          period_month: number
          period_year: number
          property_id?: string | null
          receipt_number: string
          rent_amount: number
          tenant_id?: string | null
          total_amount: number
        }
        Update: {
          charges?: number | null
          commission_amount?: number
          contract_id?: string
          created_at?: string | null
          id?: string
          issued_by?: string
          notes?: string | null
          owner_id?: string | null
          owner_payment?: number
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["pay_method"]
          period_month?: number
          period_year?: number
          property_id?: string | null
          receipt_number?: string
          rent_amount?: number
          tenant_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["pay_method"]
          processed_by: string | null
          reference_number: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["pay_method"]
          processed_by?: string | null
          reference_number?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["pay_method"]
          processed_by?: string | null
          reference_number?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "agency_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string
          agency_id: string
          children_count: number | null
          city: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          id_card_url: string | null
          last_name: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          nationality: string
          payment_status: Database["public"]["Enums"]["payment_reliability"]
          phone: string
          photo_url: string | null
          profession: string
          spouse_name: string | null
          spouse_phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          agency_id: string
          children_count?: number | null
          city: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          id_card_url?: string | null
          last_name: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          nationality: string
          payment_status: Database["public"]["Enums"]["payment_reliability"]
          phone: string
          photo_url?: string | null
          profession: string
          spouse_name?: string | null
          spouse_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          agency_id?: string
          children_count?: number | null
          city?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          id_card_url?: string | null
          last_name?: string
          marital_status?: Database["public"]["Enums"]["marital_status"]
          nationality?: string
          payment_status?: Database["public"]["Enums"]["payment_reliability"]
          phone?: string
          photo_url?: string | null
          profession?: string
          spouse_name?: string | null
          spouse_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          permissions: Json | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          permissions?: Json | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          permissions?: Json | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_rent_receipts_by_agency: {
        Args: {
          p_agency_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          contract_id: string
          period_month: number
          period_year: number
          total_amount: number
        }[]
      }
    }
    Enums: {
      agency_user_role: "director" | "manager" | "agent"
      announcement_type: "location" | "vente"
      contract_status: "draft" | "active" | "expired" | "terminated" | "renewed"
      contract_type: "location" | "vente" | "gestion"
      marital_status: "celibataire" | "marie" | "divorce" | "veuf"
      notif_priority: "low" | "medium" | "high"
      notif_type:
      | "rental_alert"
      | "payment_reminder"
      | "new_message"
      | "property_update"
      | "contract_expiry"
      | "new_interest"
      pay_method:
      | "especes"
      | "cheque"
      | "virement"
      | "mobile_money"
      | "bank_transfer"
      | "cash"
      | "check"
      payment_reliability: "bon" | "irregulier" | "mauvais"
      plan_type: "basic" | "premium" | "enterprise"
      property_standing: "economique" | "moyen" | "haut"
      property_title:
      | "attestation_villageoise"
      | "lettre_attribution"
      | "permis_habiter"
      | "acd"
      | "tf"
      | "cpf"
      | "autres"
      subscription_status: "trial" | "active" | "suspended" | "cancelled"
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
      agency_user_role: ["director", "manager", "agent"],
      announcement_type: ["location", "vente"],
      contract_status: ["draft", "active", "expired", "terminated", "renewed"],
      contract_type: ["location", "vente", "gestion"],
      marital_status: ["celibataire", "marie", "divorce", "veuf"],
      notif_priority: ["low", "medium", "high"],
      notif_type: [
        "rental_alert",
        "payment_reminder",
        "new_message",
        "property_update",
        "contract_expiry",
        "new_interest",
      ],
      pay_method: [
        "especes",
        "cheque",
        "virement",
        "mobile_money",
        "bank_transfer",
        "cash",
        "check",
      ],
      payment_reliability: ["bon", "irregulier", "mauvais"],
      plan_type: ["basic", "premium", "enterprise"],
      property_standing: ["economique", "moyen", "haut"],
      property_title: [
        "attestation_villageoise",
        "lettre_attribution",
        "permis_habiter",
        "acd",
        "tf",
        "cpf",
        "autres",
      ],
      subscription_status: ["trial", "active", "suspended", "cancelled"],
    },
  },
} as const
