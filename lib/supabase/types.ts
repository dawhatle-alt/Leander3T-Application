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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      address_block_orders: {
        Row: {
          created_at: string
          delivered_date: string | null
          id: string
          job_id: string
          notes: string | null
          ordered_date: string | null
          status: Database["public"]["Enums"]["address_block_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          ordered_date?: string | null
          status?: Database["public"]["Enums"]["address_block_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          ordered_date?: string | null
          status?: Database["public"]["Enums"]["address_block_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "address_block_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      arch_lintel_orders: {
        Row: {
          airtable_id: string | null
          arch_type: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          job_id: string
          legs: number | null
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          quantity: number | null
          requested_delivery_date: string | null
          rise_in: number | null
          span_in: number | null
          supplier_id: string | null
          updated_at: string
          width_in: number | null
        }
        Insert: {
          airtable_id?: string | null
          arch_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id: string
          legs?: number | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          rise_in?: number | null
          span_in?: number | null
          supplier_id?: string | null
          updated_at?: string
          width_in?: number | null
        }
        Update: {
          airtable_id?: string | null
          arch_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id?: string
          legs?: number | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          rise_in?: number | null
          span_in?: number | null
          supplier_id?: string | null
          updated_at?: string
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arch_lintel_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arch_lintel_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arch_lintel_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      brick_colors: {
        Row: {
          active: boolean
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      builders: {
        Row: {
          active: boolean
          airtable_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          demo: boolean
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          airtable_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          demo?: boolean
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          airtable_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          demo?: boolean
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      construction_managers: {
        Row: {
          active: boolean
          airtable_id: string | null
          builder_id: string | null
          created_at: string
          demo: boolean
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          airtable_id?: string | null
          builder_id?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          airtable_id?: string | null
          builder_id?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_managers_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          active: boolean
          created_at: string
          crew_manager_id: string | null
          demo: boolean
          id: string
          name: string
          trade: Database["public"]["Enums"]["trade"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          crew_manager_id?: string | null
          demo?: boolean
          id?: string
          name: string
          trade: Database["public"]["Enums"]["trade"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          crew_manager_id?: string | null
          demo?: boolean
          id?: string
          name?: string
          trade?: Database["public"]["Enums"]["trade"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_crew_manager_id_fkey"
            columns: ["crew_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      info_requests: {
        Row: {
          airtable_id: string | null
          assignee_id: string | null
          company_name: string | null
          company_size: string | null
          created_at: string
          demo: boolean
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source_ip: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          assignee_id?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source_ip?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          assignee_id?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source_ip?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          created_at: string
          job_id: string
          kind: Database["public"]["Enums"]["assignment_kind"]
          profile_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          kind: Database["public"]["Enums"]["assignment_kind"]
          profile_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["assignment_kind"]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_documents: {
        Row: {
          airtable_id: string | null
          created_at: string
          file_name: string | null
          id: string
          job_id: string
          kind: Database["public"]["Enums"]["document_kind"]
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          airtable_id?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          job_id: string
          kind: Database["public"]["Enums"]["document_kind"]
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          airtable_id?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          airtable_id: string | null
          caption: string | null
          created_at: string
          id: string
          job_id: string
          storage_path: string
          taken_on: string | null
          trade: Database["public"]["Enums"]["trade"] | null
          uploaded_by: string | null
        }
        Insert: {
          airtable_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          storage_path: string
          taken_on?: string | null
          trade?: Database["public"]["Enums"]["trade"] | null
          uploaded_by?: string | null
        }
        Update: {
          airtable_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          storage_path?: string
          taken_on?: string | null
          trade?: Database["public"]["Enums"]["trade"] | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_notes: string | null
          airtable_id: string | null
          area: string | null
          area_directions: string | null
          brick_color_id: string | null
          brick_completion_date: string | null
          brick_crew_id: string | null
          brick_detail_ft: number | null
          brick_drop_slab_ft: number | null
          brick_end_date: string | null
          brick_mortar_color_id: string | null
          brick_notes: string | null
          brick_paver_ft: number | null
          brick_sqft: number | null
          brick_start_date: string | null
          builder_id: string | null
          company: Database["public"]["Enums"]["company"]
          completion_percent: number
          construction_manager_id: string | null
          created_at: string
          created_by: string | null
          date_received: string | null
          demo: boolean
          elevation: string | null
          fireplace_notes: string | null
          has_fireplace: boolean
          house_number: string
          id: string
          job_completed_date: string | null
          lot_swing: Database["public"]["Enums"]["lot_swing"] | null
          plan_name: string | null
          plan_number: string | null
          property_address: string | null
          sqft: number | null
          status: Database["public"]["Enums"]["job_status"]
          stone_color: string | null
          stone_completion_date: string | null
          stone_crew_id: string | null
          stone_drop_ft: number | null
          stone_end_date: string | null
          stone_mortar_color_id: string | null
          stone_notes: string | null
          stone_sqft: number | null
          stone_start_date: string | null
          street: string
          stucco_body_paint_color: string | null
          stucco_completion_date: string | null
          stucco_crew_id: string | null
          stucco_end_date: string | null
          stucco_notes: string | null
          stucco_percent_complete: number | null
          stucco_sqft: number | null
          stucco_start_date: string | null
          stucco_trim_paint_color: string | null
          subdivision: string | null
          supply_delivery_date: string | null
          targeted_completion_date: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          airtable_id?: string | null
          area?: string | null
          area_directions?: string | null
          brick_color_id?: string | null
          brick_completion_date?: string | null
          brick_crew_id?: string | null
          brick_detail_ft?: number | null
          brick_drop_slab_ft?: number | null
          brick_end_date?: string | null
          brick_mortar_color_id?: string | null
          brick_notes?: string | null
          brick_paver_ft?: number | null
          brick_sqft?: number | null
          brick_start_date?: string | null
          builder_id?: string | null
          company?: Database["public"]["Enums"]["company"]
          completion_percent?: number
          construction_manager_id?: string | null
          created_at?: string
          created_by?: string | null
          date_received?: string | null
          demo?: boolean
          elevation?: string | null
          fireplace_notes?: string | null
          has_fireplace?: boolean
          house_number: string
          id?: string
          job_completed_date?: string | null
          lot_swing?: Database["public"]["Enums"]["lot_swing"] | null
          plan_name?: string | null
          plan_number?: string | null
          property_address?: string | null
          sqft?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          stone_color?: string | null
          stone_completion_date?: string | null
          stone_crew_id?: string | null
          stone_drop_ft?: number | null
          stone_end_date?: string | null
          stone_mortar_color_id?: string | null
          stone_notes?: string | null
          stone_sqft?: number | null
          stone_start_date?: string | null
          street: string
          stucco_body_paint_color?: string | null
          stucco_completion_date?: string | null
          stucco_crew_id?: string | null
          stucco_end_date?: string | null
          stucco_notes?: string | null
          stucco_percent_complete?: number | null
          stucco_sqft?: number | null
          stucco_start_date?: string | null
          stucco_trim_paint_color?: string | null
          subdivision?: string | null
          supply_delivery_date?: string | null
          targeted_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          airtable_id?: string | null
          area?: string | null
          area_directions?: string | null
          brick_color_id?: string | null
          brick_completion_date?: string | null
          brick_crew_id?: string | null
          brick_detail_ft?: number | null
          brick_drop_slab_ft?: number | null
          brick_end_date?: string | null
          brick_mortar_color_id?: string | null
          brick_notes?: string | null
          brick_paver_ft?: number | null
          brick_sqft?: number | null
          brick_start_date?: string | null
          builder_id?: string | null
          company?: Database["public"]["Enums"]["company"]
          completion_percent?: number
          construction_manager_id?: string | null
          created_at?: string
          created_by?: string | null
          date_received?: string | null
          demo?: boolean
          elevation?: string | null
          fireplace_notes?: string | null
          has_fireplace?: boolean
          house_number?: string
          id?: string
          job_completed_date?: string | null
          lot_swing?: Database["public"]["Enums"]["lot_swing"] | null
          plan_name?: string | null
          plan_number?: string | null
          property_address?: string | null
          sqft?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          stone_color?: string | null
          stone_completion_date?: string | null
          stone_crew_id?: string | null
          stone_drop_ft?: number | null
          stone_end_date?: string | null
          stone_mortar_color_id?: string | null
          stone_notes?: string | null
          stone_sqft?: number | null
          stone_start_date?: string | null
          street?: string
          stucco_body_paint_color?: string | null
          stucco_completion_date?: string | null
          stucco_crew_id?: string | null
          stucco_end_date?: string | null
          stucco_notes?: string | null
          stucco_percent_complete?: number | null
          stucco_sqft?: number | null
          stucco_start_date?: string | null
          stucco_trim_paint_color?: string | null
          subdivision?: string | null
          supply_delivery_date?: string | null
          targeted_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_brick_color_id_fkey"
            columns: ["brick_color_id"]
            isOneToOne: false
            referencedRelation: "brick_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_brick_crew_id_fkey"
            columns: ["brick_crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_brick_mortar_color_id_fkey"
            columns: ["brick_mortar_color_id"]
            isOneToOne: false
            referencedRelation: "mortar_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_construction_manager_id_fkey"
            columns: ["construction_manager_id"]
            isOneToOne: false
            referencedRelation: "construction_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_stone_crew_id_fkey"
            columns: ["stone_crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_stone_mortar_color_id_fkey"
            columns: ["stone_mortar_color_id"]
            isOneToOne: false
            referencedRelation: "mortar_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_stucco_crew_id_fkey"
            columns: ["stucco_crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      lintel_orders: {
        Row: {
          airtable_id: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          hole_pattern: string | null
          id: string
          inches: number | null
          job_id: string
          lintel_type: string | null
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          quantity: number | null
          requested_delivery_date: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          hole_pattern?: string | null
          id?: string
          inches?: number | null
          job_id: string
          lintel_type?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          hole_pattern?: string | null
          id?: string
          inches?: number | null
          job_id?: string
          lintel_type?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lintel_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lintel_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lintel_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      mortar_colors: {
        Row: {
          active: boolean
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      mortar_orders: {
        Row: {
          airtable_id: string | null
          bags: number | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          job_id: string
          mortar_color_id: string | null
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          requested_delivery_date: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          bags?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id: string
          mortar_color_id?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          bags?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id?: string
          mortar_color_id?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortar_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortar_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortar_orders_mortar_color_id_fkey"
            columns: ["mortar_color_id"]
            isOneToOne: false
            referencedRelation: "mortar_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortar_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_forms: {
        Row: {
          created_at: string
          form_number: number
          generated_at: string
          generated_by: string | null
          id: string
          job_id: string
          layout: Database["public"]["Enums"]["order_form_layout"]
          notified_at: string | null
          orders: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["order_form_status"]
          storage_path: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          form_number?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          job_id: string
          layout: Database["public"]["Enums"]["order_form_layout"]
          notified_at?: string | null
          orders?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["order_form_status"]
          storage_path: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          form_number?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          job_id?: string
          layout?: Database["public"]["Enums"]["order_form_layout"]
          notified_at?: string | null
          orders?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["order_form_status"]
          storage_path?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_forms_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_forms_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_forms_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_orders: {
        Row: {
          airtable_id: string | null
          body_gallons: number | null
          body_item_number: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          delivery_phone: string | null
          id: string
          job_id: string
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          picked_up_by: string | null
          requested_delivery_date: string | null
          supplier_id: string | null
          trim_gallons: number | null
          trim_item_number: string | null
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          body_gallons?: number | null
          body_item_number?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_phone?: string | null
          id?: string
          job_id: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          picked_up_by?: string | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          trim_gallons?: number | null
          trim_item_number?: string | null
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          body_gallons?: number | null
          body_item_number?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_phone?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          picked_up_by?: string | null
          requested_delivery_date?: string | null
          supplier_id?: string | null
          trim_gallons?: number | null
          trim_item_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paint_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_archive_extras: {
        Row: {
          airtable_id: string
          id: string
          item: string | null
          item_number: number | null
          notes: string | null
          pay_request_id: string | null
          raw: Json
          status: string | null
        }
        Insert: {
          airtable_id: string
          id?: string
          item?: string | null
          item_number?: number | null
          notes?: string | null
          pay_request_id?: string | null
          raw?: Json
          status?: string | null
        }
        Update: {
          airtable_id?: string
          id?: string
          item?: string | null
          item_number?: number | null
          notes?: string | null
          pay_request_id?: string | null
          raw?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_archive_extras_pay_request_id_fkey"
            columns: ["pay_request_id"]
            isOneToOne: false
            referencedRelation: "payroll_archive_pay_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_archive_labor_types: {
        Row: {
          airtable_id: string
          id: string
          labor_type: string
          price_per_ft: number | null
          raw: Json
          status: string | null
        }
        Insert: {
          airtable_id: string
          id?: string
          labor_type: string
          price_per_ft?: number | null
          raw?: Json
          status?: string | null
        }
        Update: {
          airtable_id?: string
          id?: string
          labor_type?: string
          price_per_ft?: number | null
          raw?: Json
          status?: string | null
        }
        Relationships: []
      }
      payroll_archive_pay_requests: {
        Row: {
          airtable_id: string
          balance: number | null
          completed_100_date: string | null
          crew_member_name: string | null
          id: string
          job_id: string | null
          labor_type: string | null
          last_pay_request_date: string | null
          notes: string | null
          percentage_completed: number | null
          previous_percentage: number | null
          raw: Json
          status: string | null
          submitted_by_email: string | null
          transaction_number: number | null
        }
        Insert: {
          airtable_id: string
          balance?: number | null
          completed_100_date?: string | null
          crew_member_name?: string | null
          id?: string
          job_id?: string | null
          labor_type?: string | null
          last_pay_request_date?: string | null
          notes?: string | null
          percentage_completed?: number | null
          previous_percentage?: number | null
          raw?: Json
          status?: string | null
          submitted_by_email?: string | null
          transaction_number?: number | null
        }
        Update: {
          airtable_id?: string
          balance?: number | null
          completed_100_date?: string | null
          crew_member_name?: string | null
          id?: string
          job_id?: string | null
          labor_type?: string | null
          last_pay_request_date?: string | null
          notes?: string | null
          percentage_completed?: number | null
          previous_percentage?: number | null
          raw?: Json
          status?: string | null
          submitted_by_email?: string | null
          transaction_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_archive_pay_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          airtable_id: string | null
          builder_id: string | null
          construction_manager_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          reviews_order_forms: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          airtable_id?: string | null
          builder_id?: string | null
          construction_manager_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          reviews_order_forms?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          airtable_id?: string | null
          builder_id?: string | null
          construction_manager_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          reviews_order_forms?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_construction_manager_id_fkey"
            columns: ["construction_manager_id"]
            isOneToOne: false
            referencedRelation: "construction_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      rock_orders: {
        Row: {
          airtable_id: string | null
          brick_drop_ft: number | null
          color_style: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          job_id: string
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          requested_delivery_date: string | null
          stone_drop_ft: number | null
          supplier_id: string | null
          tons: number | null
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          brick_drop_ft?: number | null
          color_style?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          stone_drop_ft?: number | null
          supplier_id?: string | null
          tons?: number | null
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          brick_drop_ft?: number | null
          color_style?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          stone_drop_ft?: number | null
          supplier_id?: string | null
          tons?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rock_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sand_orders: {
        Row: {
          airtable_id: string | null
          bags: number | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          delivery_completed_date: string | null
          id: string
          job_id: string
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          requested_delivery_date: string | null
          sand_type: string | null
          supplier_id: string | null
          updated_at: string
          yards: number | null
        }
        Insert: {
          airtable_id?: string | null
          bags?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_completed_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          sand_type?: string | null
          supplier_id?: string | null
          updated_at?: string
          yards?: number | null
        }
        Update: {
          airtable_id?: string | null
          bags?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_completed_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          requested_delivery_date?: string | null
          sand_type?: string | null
          supplier_id?: string | null
          updated_at?: string
          yards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sand_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sand_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sand_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stucco_items: {
        Row: {
          active: boolean
          code: string
          default_unit: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          default_unit: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          default_unit?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      stucco_material_orders: {
        Row: {
          airtable_id: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          delivery_phone: string | null
          id: string
          job_id: string
          mortar_bags: number | null
          mortar_color_id: string | null
          mortar_notes: string | null
          mortar_supplier: string | null
          notes: string | null
          order_number: number
          ordered: boolean
          ordered_date: string | null
          other_items_notes: string | null
          requested_delivery_date: string | null
          sand_notes: string | null
          sand_supplier: string | null
          sand_type: string | null
          sand_yards: number | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_phone?: string | null
          id?: string
          job_id: string
          mortar_bags?: number | null
          mortar_color_id?: string | null
          mortar_notes?: string | null
          mortar_supplier?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          other_items_notes?: string | null
          requested_delivery_date?: string | null
          sand_notes?: string | null
          sand_supplier?: string | null
          sand_type?: string | null
          sand_yards?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          airtable_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_phone?: string | null
          id?: string
          job_id?: string
          mortar_bags?: number | null
          mortar_color_id?: string | null
          mortar_notes?: string | null
          mortar_supplier?: string | null
          notes?: string | null
          order_number?: number
          ordered?: boolean
          ordered_date?: string | null
          other_items_notes?: string | null
          requested_delivery_date?: string | null
          sand_notes?: string | null
          sand_supplier?: string | null
          sand_type?: string | null
          sand_yards?: number | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stucco_material_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stucco_material_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stucco_material_orders_mortar_color_id_fkey"
            columns: ["mortar_color_id"]
            isOneToOne: false
            referencedRelation: "mortar_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stucco_material_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stucco_order_items: {
        Row: {
          item_code: string
          note: string | null
          order_id: string
          quantity: number
          unit: string
        }
        Insert: {
          item_code: string
          note?: string | null
          order_id: string
          quantity: number
          unit: string
        }
        Update: {
          item_code?: string
          note?: string | null
          order_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stucco_order_items_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "stucco_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stucco_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stucco_material_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          airtable_id: string | null
          created_at: string
          demo: boolean
          email: string | null
          id: string
          name: string
          order_types: Database["public"]["Enums"]["order_type"][]
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          airtable_id?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name: string
          order_types?: Database["public"]["Enums"]["order_type"][]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          airtable_id?: string | null
          created_at?: string
          demo?: boolean
          email?: string | null
          id?: string
          name?: string
          order_types?: Database["public"]["Enums"]["order_type"][]
          phone?: string | null
          updated_at?: string
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
      address_block_status: "none" | "ordered" | "delivered"
      app_role: "admin" | "supervisor" | "employee" | "crew_manager" | "builder"
      assignment_kind: "supervisor" | "employee"
      company: "leander_3t" | "3t_construction_solutions"
      document_kind:
        | "plans"
        | "front_elevation"
        | "color_selection"
        | "order_form"
        | "other"
      job_status: "new" | "in_progress" | "completed"
      lot_swing: "right" | "left" | "other"
      order_form_layout: "masonry" | "stucco" | "paint"
      order_form_status: "pending_review" | "approved"
      order_type:
        | "sand"
        | "mortar"
        | "lintel"
        | "arch_lintel"
        | "rock"
        | "stucco_material"
        | "paint"
      request_status: "todo" | "in_progress" | "done"
      trade: "brick" | "stone" | "stucco"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      address_block_status: ["none", "ordered", "delivered"],
      app_role: ["admin", "supervisor", "employee", "crew_manager", "builder"],
      assignment_kind: ["supervisor", "employee"],
      company: ["leander_3t", "3t_construction_solutions"],
      document_kind: [
        "plans",
        "front_elevation",
        "color_selection",
        "order_form",
        "other",
      ],
      job_status: ["new", "in_progress", "completed"],
      lot_swing: ["right", "left", "other"],
      order_form_layout: ["masonry", "stucco", "paint"],
      order_form_status: ["pending_review", "approved"],
      order_type: [
        "sand",
        "mortar",
        "lintel",
        "arch_lintel",
        "rock",
        "stucco_material",
        "paint",
      ],
      request_status: ["todo", "in_progress", "done"],
      trade: ["brick", "stone", "stucco"],
    },
  },
} as const
