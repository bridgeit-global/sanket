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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      AdmFundingCategory: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          master_budget: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          master_budget?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          master_budget?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      AdmWork: {
        Row: {
          after_photo_name: string | null
          after_photo_url: string | null
          before_photo_name: string | null
          before_photo_url: string | null
          bhoomi_pujan_date: string | null
          bhoomi_pujan_done: boolean
          category_id: string
          created_at: string
          created_by: string
          id: string
          lokarpan_date: string | null
          lokarpan_done: boolean
          name: string
          physical_status: string
          project_id: string | null
          updated_at: string
          work_budget: number
        }
        Insert: {
          after_photo_name?: string | null
          after_photo_url?: string | null
          before_photo_name?: string | null
          before_photo_url?: string | null
          bhoomi_pujan_date?: string | null
          bhoomi_pujan_done?: boolean
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          lokarpan_date?: string | null
          lokarpan_done?: boolean
          name: string
          physical_status?: string
          project_id?: string | null
          updated_at?: string
          work_budget?: number
        }
        Update: {
          after_photo_name?: string | null
          after_photo_url?: string | null
          before_photo_name?: string | null
          before_photo_url?: string | null
          bhoomi_pujan_date?: string | null
          bhoomi_pujan_done?: boolean
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          lokarpan_date?: string | null
          lokarpan_done?: boolean
          name?: string
          physical_status?: string
          project_id?: string | null
          updated_at?: string
          work_budget?: number
        }
        Relationships: [
          {
            foreignKeyName: "AdmWork_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "AdmFundingCategory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AdmWork_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AdmWork_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "MlaProject"
            referencedColumns: ["id"]
          },
        ]
      }
      BeneficiaryService: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          priority: string
          programme_id: string | null
          requested_by: string
          service_name: string
          service_type: string
          status: string
          token: string
          updated_at: string
          voter_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          programme_id?: string | null
          requested_by: string
          service_name: string
          service_type: string
          status?: string
          token: string
          updated_at?: string
          voter_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          programme_id?: string | null
          requested_by?: string
          service_name?: string
          service_type?: string
          status?: string
          token?: string
          updated_at?: string
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BeneficiaryService_assigned_to_User_id_fk"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BeneficiaryService_programme_id_DailyProgramme_id_fk"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "DailyProgramme"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BeneficiaryService_requested_by_User_id_fk"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BeneficiaryService_voter_id_VoterMaster_epic_number_fk"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
        ]
      }
      BoothMaster: {
        Row: {
          booth_address: string | null
          booth_name: string | null
          booth_no: string
          created_at: string
          election_id: string
          updated_at: string
        }
        Insert: {
          booth_address?: string | null
          booth_name?: string | null
          booth_no: string
          created_at?: string
          election_id: string
          updated_at?: string
        }
        Update: {
          booth_address?: string | null
          booth_name?: string | null
          booth_no?: string
          created_at?: string
          election_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "BoothMaster_election_id_ElectionMaster_election_id_fk"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "ElectionMaster"
            referencedColumns: ["election_id"]
          },
        ]
      }
      CadreGeographicUnit: {
        Row: {
          ac_no: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          ac_no?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          ac_no?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreGeographicUnit_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "CadreGeographicUnit"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreMember: {
        Row: {
          appointed_at: string | null
          constituency_id: string | null
          created_at: string
          created_by: string | null
          epic_number: string | null
          id: string
          is_active: boolean
          notes: string | null
          person_email: string | null
          person_name: string | null
          person_phone: string | null
          photo_url: string | null
          term_ends_at: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          appointed_at?: string | null
          constituency_id?: string | null
          created_at?: string
          created_by?: string | null
          epic_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          person_email?: string | null
          person_name?: string | null
          person_phone?: string | null
          photo_url?: string | null
          term_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          appointed_at?: string | null
          constituency_id?: string | null
          created_at?: string
          created_by?: string | null
          epic_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          person_email?: string | null
          person_name?: string | null
          person_phone?: string | null
          photo_url?: string | null
          term_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CadreMember_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMember_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMember_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreMemberPost: {
        Row: {
          booth_no: string | null
          created_at: string
          election_id: string | null
          id: string
          is_primary: boolean
          label: string | null
          member_id: string
          position_id: string
          sort_order: number
          taluka_id: string | null
          updated_at: string
          ward_geo_id: string | null
        }
        Insert: {
          booth_no?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          member_id: string
          position_id: string
          sort_order?: number
          taluka_id?: string | null
          updated_at?: string
          ward_geo_id?: string | null
        }
        Update: {
          booth_no?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          member_id?: string
          position_id?: string
          sort_order?: number
          taluka_id?: string | null
          updated_at?: string
          ward_geo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CadreMemberPost_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "ElectionMaster"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "CadreMemberPost_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "CadreMember"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMemberPost_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "CadrePosition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMemberPost_taluka_id_fkey"
            columns: ["taluka_id"]
            isOneToOne: false
            referencedRelation: "CadreGeographicUnit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMemberPost_ward_geo_id_fkey"
            columns: ["ward_geo_id"]
            isOneToOne: false
            referencedRelation: "CadreGeographicUnit"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreMemberVertical: {
        Row: {
          created_at: string
          is_primary: boolean
          member_id: string
          vertical_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          member_id: string
          vertical_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          member_id?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreMemberVertical_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "CadreMember"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMemberVertical_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "CadreVertical"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreMemberWhatsApp: {
        Row: {
          member_id: string
          updated_at: string
          updated_by: string | null
          whatsapp_phone: string
        }
        Insert: {
          member_id: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_phone: string
        }
        Update: {
          member_id?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreMemberWhatsApp_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "CadreMember"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreMemberWhatsApp_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CadrePosition: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level_id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadrePosition_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "CadrePositionLevel"
            referencedColumns: ["id"]
          },
        ]
      }
      CadrePositionLevel: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      CadreVertical: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreVertical_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "CadreVerticalCategory"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreVerticalCategory: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      CadreWhatsAppBroadcast: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_urls: Json
          message: string
          recipient_count: number
          skipped_no_whatsapp: number
          target: Json
          target_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_urls?: Json
          message: string
          recipient_count?: number
          skipped_no_whatsapp?: number
          target: Json
          target_label: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_urls?: Json
          message?: string
          recipient_count?: number
          skipped_no_whatsapp?: number
          target?: Json
          target_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreWhatsAppBroadcast_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CadreWhatsAppMessage: {
        Row: {
          broadcast_id: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          image_urls: Json
          member_id: string | null
          message: string
          processed_at: string | null
          status: string
          updated_at: string
          whatsapp_phone: string
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_urls?: Json
          member_id?: string | null
          message: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_phone: string
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_urls?: Json
          member_id?: string | null
          message?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "CadreWhatsAppMessage_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "CadreWhatsAppBroadcast"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreWhatsAppMessage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CadreWhatsAppMessage_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "CadreMember"
            referencedColumns: ["id"]
          },
        ]
      }
      Chat: {
        Row: {
          createdAt: string
          id: string
          title: string
          userId: string
          visibility: string
        }
        Insert: {
          createdAt: string
          id?: string
          title: string
          userId: string
          visibility?: string
        }
        Update: {
          createdAt?: string
          id?: string
          title?: string
          userId?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "Chat_userId_User_id_fk"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CommunityServiceArea: {
        Row: {
          ac_no: string | null
          booth_no: string | null
          created_at: string
          election_id: string | null
          id: string
          service_id: string
          ward_no: string | null
        }
        Insert: {
          ac_no?: string | null
          booth_no?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          service_id: string
          ward_no?: string | null
        }
        Update: {
          ac_no?: string | null
          booth_no?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          service_id?: string
          ward_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CommunityServiceArea_election_id_ElectionMaster_election_id_fk"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "ElectionMaster"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "CommunityServiceArea_service_id_BeneficiaryService_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "BeneficiaryService"
            referencedColumns: ["id"]
          },
        ]
      }
      DailyProgramme: {
        Row: {
          attended: boolean | null
          created_at: string
          created_by: string
          date: string
          end_date: string | null
          end_time: string | null
          id: string
          location: string
          programme_type: string
          remarks: string | null
          sort_order: number
          start_date: string | null
          start_time: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string
          created_by: string
          date: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          location: string
          programme_type?: string
          remarks?: string | null
          sort_order?: number
          start_date?: string | null
          start_time: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string
          created_by?: string
          date?: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          location?: string
          programme_type?: string
          remarks?: string | null
          sort_order?: number
          start_date?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "DailyProgramme_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DailyProgramme_updated_by_User_id_fk"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DailyProgrammeAttachment: {
        Row: {
          created_at: string
          file_name: string
          file_size_kb: number
          file_url: string | null
          id: string
          programme_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_kb: number
          file_url?: string | null
          id?: string
          programme_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_kb?: number
          file_url?: string | null
          id?: string
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "DailyProgrammeAttachment_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "DailyProgramme"
            referencedColumns: ["id"]
          },
        ]
      }
      Document: {
        Row: {
          content: string | null
          createdAt: string
          id: string
          text: string
          title: string
          userId: string
        }
        Insert: {
          content?: string | null
          createdAt: string
          id?: string
          text?: string
          title: string
          userId: string
        }
        Update: {
          content?: string | null
          createdAt?: string
          id?: string
          text?: string
          title?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_userId_User_id_fk"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ElectionMapping: {
        Row: {
          booth_no: number | null
          election_id: string
          epic_number: string
          has_voted: boolean | null
          sr_no: number | null
        }
        Insert: {
          booth_no?: number | null
          election_id: string
          epic_number: string
          has_voted?: boolean | null
          sr_no?: number | null
        }
        Update: {
          booth_no?: number | null
          election_id?: string
          epic_number?: string
          has_voted?: boolean | null
          sr_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ElectionMapping_election_id_ElectionMaster_election_id_fk"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "ElectionMaster"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "ElectionMapping_epic_number_VoterMaster_epic_number_fk"
            columns: ["epic_number"]
            isOneToOne: false
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
        ]
      }
      ElectionMaster: {
        Row: {
          constituency_id: string | null
          constituency_type: string | null
          created_at: string
          data_source: string | null
          delimitation_version: string | null
          election_id: string
          election_type: string
          updated_at: string
          year: number
        }
        Insert: {
          constituency_id?: string | null
          constituency_type?: string | null
          created_at?: string
          data_source?: string | null
          delimitation_version?: string | null
          election_id: string
          election_type: string
          updated_at?: string
          year: number
        }
        Update: {
          constituency_id?: string | null
          constituency_type?: string | null
          created_at?: string
          data_source?: string | null
          delimitation_version?: string | null
          election_id?: string
          election_type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      ExportJob: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          file_name: string | null
          file_size_kb: number | null
          file_url: string | null
          filters: Json | null
          format: string
          id: string
          processed_records: number | null
          progress: number
          status: string
          total_records: number | null
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          filters?: Json | null
          format: string
          id?: string
          processed_records?: number | null
          progress?: number
          status?: string
          total_records?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          filters?: Json | null
          format?: string
          id?: string
          processed_records?: number | null
          progress?: number
          status?: string
          total_records?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ExportJob_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ExportJob_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Letter: {
        Row: {
          created_at: string
          created_by: string | null
          fields: Json
          id: string
          letter_locale: string
          letter_master_id: string | null
          letter_type: string
          paper_size: string
          pdf_storage_path: string | null
          reference_no: string
          rendered_html: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          letter_locale: string
          letter_master_id?: string | null
          letter_type: string
          paper_size?: string
          pdf_storage_path?: string | null
          reference_no: string
          rendered_html: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          letter_locale?: string
          letter_master_id?: string | null
          letter_type?: string
          paper_size?: string
          pdf_storage_path?: string | null
          reference_no?: string
          rendered_html?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Letter_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Letter_letter_master_id_fkey"
            columns: ["letter_master_id"]
            isOneToOne: false
            referencedRelation: "LetterMaster"
            referencedColumns: ["id"]
          },
        ]
      }
      LetterMaster: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          letter_locale: string
          letter_type: string
          letterhead_mode: string
          letterhead_url: string | null
          name: string
          paper_size: string
          template_html: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          letter_locale: string
          letter_type: string
          letterhead_mode?: string
          letterhead_url?: string | null
          name: string
          paper_size?: string
          template_html: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          letter_locale?: string
          letter_type?: string
          letterhead_mode?: string
          letterhead_url?: string | null
          name?: string
          paper_size?: string
          template_html?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "LetterMaster_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LetterMaster_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          chatId: string
          content: Json
          createdAt: string
          id: string
          role: string
        }
        Insert: {
          chatId: string
          content: Json
          createdAt: string
          id?: string
          role: string
        }
        Update: {
          chatId?: string
          content?: Json
          createdAt?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_chatId_Chat_id_fk"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
      Message_v2: {
        Row: {
          attachments: Json
          chatId: string
          createdAt: string
          id: string
          parts: Json
          role: string
        }
        Insert: {
          attachments: Json
          chatId: string
          createdAt: string
          id?: string
          parts: Json
          role: string
        }
        Update: {
          attachments?: Json
          chatId?: string
          createdAt?: string
          id?: string
          parts?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_v2_chatId_Chat_id_fk"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
      MlaProject: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          status: string
          type: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: string
          type?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: string
          type?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MlaProject_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PhoneUpdateHistory: {
        Row: {
          created_at: string
          epic_number: string
          id: string
          new_mobile_no_primary: string | null
          new_mobile_no_secondary: string | null
          old_mobile_no_primary: string | null
          old_mobile_no_secondary: string | null
          source_module: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          epic_number: string
          id?: string
          new_mobile_no_primary?: string | null
          new_mobile_no_secondary?: string | null
          old_mobile_no_primary?: string | null
          old_mobile_no_secondary?: string | null
          source_module: string
          updated_by: string
        }
        Update: {
          created_at?: string
          epic_number?: string
          id?: string
          new_mobile_no_primary?: string | null
          new_mobile_no_secondary?: string | null
          old_mobile_no_primary?: string | null
          old_mobile_no_secondary?: string | null
          source_module?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "PhoneUpdateHistory_epic_number_VoterMaster_epic_number_fk"
            columns: ["epic_number"]
            isOneToOne: false
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
          {
            foreignKeyName: "PhoneUpdateHistory_updated_by_User_id_fk"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectAttachment: {
        Row: {
          created_at: string
          file_name: string
          file_size_kb: number
          file_url: string | null
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_kb: number
          file_url?: string | null
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_kb?: number
          file_url?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProjectAttachment_project_id_MlaProject_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "MlaProject"
            referencedColumns: ["id"]
          },
        ]
      }
      PushSubscription: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "PushSubscription_user_id_User_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      RegisterAttachment: {
        Row: {
          created_at: string
          entry_id: string
          file_name: string
          file_size_kb: number
          file_url: string | null
          id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          file_name: string
          file_size_kb: number
          file_url?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          file_name?: string
          file_size_kb?: number
          file_url?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "RegisterAttachment_entry_id_RegisterEntry_id_fk"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "RegisterEntry"
            referencedColumns: ["id"]
          },
        ]
      }
      RegisterEntry: {
        Row: {
          created_at: string
          created_by: string
          date: string
          document_type: string
          from_to: string
          id: string
          mode: string | null
          officer: string | null
          project_id: string | null
          ref_no: string | null
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          document_type?: string
          from_to: string
          id?: string
          mode?: string | null
          officer?: string | null
          project_id?: string | null
          ref_no?: string | null
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          document_type?: string
          from_to?: string
          id?: string
          mode?: string | null
          officer?: string | null
          project_id?: string | null
          ref_no?: string | null
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "RegisterEntry_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RegisterEntry_project_id_MlaProject_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "MlaProject"
            referencedColumns: ["id"]
          },
        ]
      }
      Role: {
        Row: {
          created_at: string
          default_landing_module: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_landing_module?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_landing_module?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      RoleModulePermissions: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          module_key: string
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key: string
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "RoleModulePermissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RoleModulePermissions_role_id_Role_id_fk"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
        ]
      }
      ServiceCatalog: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      Stream: {
        Row: {
          chatId: string
          createdAt: string
          id: string
        }
        Insert: {
          chatId: string
          createdAt: string
          id?: string
        }
        Update: {
          chatId?: string
          createdAt?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Stream_chatId_Chat_id_fk"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
      Suggestion: {
        Row: {
          createdAt: string
          description: string | null
          documentCreatedAt: string
          documentId: string
          id: string
          isResolved: boolean
          originalText: string
          suggestedText: string
          userId: string
        }
        Insert: {
          createdAt: string
          description?: string | null
          documentCreatedAt: string
          documentId: string
          id?: string
          isResolved?: boolean
          originalText: string
          suggestedText: string
          userId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          documentCreatedAt?: string
          documentId?: string
          id?: string
          isResolved?: boolean
          originalText?: string
          suggestedText?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f"
            columns: ["documentId", "documentCreatedAt"]
            isOneToOne: false
            referencedRelation: "Document"
            referencedColumns: ["id", "createdAt"]
          },
          {
            foreignKeyName: "Suggestion_userId_User_id_fk"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TaskHistory: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          performed_by: string
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          performed_by: string
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          performed_by?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "TaskHistory_performed_by_User_id_fk"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TaskHistory_task_id_VoterTask_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "VoterTask"
            referencedColumns: ["id"]
          },
        ]
      }
      Tmp_VoterReligionUpdate: {
        Row: {
          epic_number: string | null
          full_name: string | null
          religion: string | null
        }
        Insert: {
          epic_number?: string | null
          full_name?: string | null
          religion?: string | null
        }
        Update: {
          epic_number?: string | null
          full_name?: string | null
          religion?: string | null
        }
        Relationships: []
      }
      User: {
        Row: {
          created_at: string
          id: string
          last_login: string | null
          metadata: Json | null
          password: string | null
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login?: string | null
          metadata?: Json | null
          password?: string | null
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login?: string | null
          metadata?: Json | null
          password?: string | null
          role_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "User_role_id_Role_id_fk"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
        ]
      }
      UserModulePermissions: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          module_key: string
          updated_at: string
          userId: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key: string
          updated_at?: string
          userId: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key?: string
          updated_at?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserModulePermissions_userId_User_id_fk"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      UserPartAssignment: {
        Row: {
          booth_no: string
          created_at: string
          election_id: string
          id: string
          user_id: string
        }
        Insert: {
          booth_no: string
          created_at?: string
          election_id: string
          id?: string
          user_id: string
        }
        Update: {
          booth_no?: string
          created_at?: string
          election_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserPartAssignment_election_id_ElectionMaster_election_id_fk"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "ElectionMaster"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "UserPartAssignment_user_id_User_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Visitor: {
        Row: {
          aadhar_number: string
          contact_number: string
          created_at: string
          created_by: string
          id: string
          name: string
          programme_event_id: string | null
          purpose: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          aadhar_number: string
          contact_number: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          programme_event_id?: string | null
          purpose: string
          updated_at?: string
          visit_date: string
        }
        Update: {
          aadhar_number?: string
          contact_number?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          programme_event_id?: string | null
          purpose?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "Visitor_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Visitor_programme_event_id_DailyProgramme_id_fk"
            columns: ["programme_event_id"]
            isOneToOne: false
            referencedRelation: "DailyProgramme"
            referencedColumns: ["id"]
          },
        ]
      }
      Vote: {
        Row: {
          chatId: string
          isUpvoted: boolean
          messageId: string
        }
        Insert: {
          chatId: string
          isUpvoted: boolean
          messageId: string
        }
        Update: {
          chatId?: string
          isUpvoted?: boolean
          messageId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Vote_chatId_Chat_id_fk"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Vote_messageId_Message_id_fk"
            columns: ["messageId"]
            isOneToOne: false
            referencedRelation: "Message"
            referencedColumns: ["id"]
          },
        ]
      }
      Vote_v2: {
        Row: {
          chatId: string
          isUpvoted: boolean
          messageId: string
        }
        Insert: {
          chatId: string
          isUpvoted: boolean
          messageId: string
        }
        Update: {
          chatId?: string
          isUpvoted?: boolean
          messageId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Vote_v2_chatId_Chat_id_fk"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Vote_v2_messageId_Message_v2_id_fk"
            columns: ["messageId"]
            isOneToOne: false
            referencedRelation: "Message_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      VoterMaster: {
        Row: {
          address: string | null
          age: number | null
          caste: string | null
          dob: string | null
          epic_number: string | null
          family_grouping: string | null
          full_name: string | null
          gender: string | null
          house_number: string | null
          locality_street: string | null
          pincode: string | null
          relation_name: string | null
          relation_type: string | null
          religion: string | null
          town_village: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          caste?: string | null
          dob?: string | null
          epic_number?: string | null
          family_grouping?: string | null
          full_name?: string | null
          gender?: string | null
          house_number?: string | null
          locality_street?: string | null
          pincode?: string | null
          relation_name?: string | null
          relation_type?: string | null
          religion?: string | null
          town_village?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          caste?: string | null
          dob?: string | null
          epic_number?: string | null
          family_grouping?: string | null
          full_name?: string | null
          gender?: string | null
          house_number?: string | null
          locality_street?: string | null
          pincode?: string | null
          relation_name?: string | null
          relation_type?: string | null
          religion?: string | null
          town_village?: string | null
        }
        Relationships: []
      }
      VoterMobileNumber: {
        Row: {
          created_at: string
          epic_number: string
          mobile_number: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          epic_number: string
          mobile_number: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          epic_number?: string
          mobile_number?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "VoterMobileNumber_epic_number_VoterMaster_epic_number_fk"
            columns: ["epic_number"]
            isOneToOne: false
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
        ]
      }
      VoterProfile: {
        Row: {
          caste: string | null
          created_at: string
          education: string | null
          epic_number: string
          feedback: string | null
          influencer_type: string | null
          is_our_supporter: boolean | null
          is_profiled: boolean
          occupation_detail: string | null
          occupation_type: string | null
          profiled_at: string | null
          profiled_by: string | null
          region: string | null
          religion: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          caste?: string | null
          created_at?: string
          education?: string | null
          epic_number: string
          feedback?: string | null
          influencer_type?: string | null
          is_our_supporter?: boolean | null
          is_profiled?: boolean
          occupation_detail?: string | null
          occupation_type?: string | null
          profiled_at?: string | null
          profiled_by?: string | null
          region?: string | null
          religion?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          caste?: string | null
          created_at?: string
          education?: string | null
          epic_number?: string
          feedback?: string | null
          influencer_type?: string | null
          is_our_supporter?: boolean | null
          is_profiled?: boolean
          occupation_detail?: string | null
          occupation_type?: string | null
          profiled_at?: string | null
          profiled_by?: string | null
          region?: string | null
          religion?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "VoterProfile_epic_number_VoterMaster_epic_number_fk"
            columns: ["epic_number"]
            isOneToOne: true
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
          {
            foreignKeyName: "VoterProfile_profiled_by_User_id_fk"
            columns: ["profiled_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      VoterTask: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          priority: string
          service_id: string
          status: string
          task_type: string
          updated_at: string
          updated_by: string | null
          voter_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          service_id: string
          status?: string
          task_type: string
          updated_at?: string
          updated_by?: string | null
          voter_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          service_id?: string
          status?: string
          task_type?: string
          updated_at?: string
          updated_by?: string | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "VoterTask_assigned_to_User_id_fk"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VoterTask_created_by_User_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VoterTask_service_id_BeneficiaryService_id_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "BeneficiaryService"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VoterTask_updated_by_User_id_fk"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VoterTask_voter_id_VoterMaster_epic_number_fk"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "VoterMaster"
            referencedColumns: ["epic_number"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
