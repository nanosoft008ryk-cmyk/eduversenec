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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_assessments: {
        Row: {
          academic_year: string | null
          assessment_date: string | null
          assessment_type: string
          class_section_id: string | null
          created_at: string
          id: string
          max_marks: number
          name: string
          school_id: string
          term: string | null
          weightage: number
        }
        Insert: {
          academic_year?: string | null
          assessment_date?: string | null
          assessment_type?: string
          class_section_id?: string | null
          created_at?: string
          id?: string
          max_marks?: number
          name: string
          school_id: string
          term?: string | null
          weightage?: number
        }
        Update: {
          academic_year?: string | null
          assessment_date?: string | null
          assessment_type?: string
          class_section_id?: string | null
          created_at?: string
          id?: string
          max_marks?: number
          name?: string
          school_id?: string
          term?: string | null
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_assessments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classes: {
        Row: {
          academic_year: string | null
          created_at: string
          grade_level: number | null
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_pins: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_pins_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_recipients: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_id: string
          read_at: string | null
          recipient_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id: string
          read_at?: string | null
          recipient_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id?: string
          read_at?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          school_id: string
          sender_user_id: string
          subject: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          school_id: string
          sender_user_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          school_id?: string
          sender_user_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_academic_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          factors: Json | null
          id: string
          predicted_grade: string | null
          school_id: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          predicted_grade?: string | null
          school_id: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          predicted_grade?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_academic_predictions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_academic_predictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_academic_predictions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_career_suggestions: {
        Row: {
          analysis: string | null
          created_at: string
          id: string
          school_id: string
          student_id: string
          suggestions: Json | null
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          id?: string
          school_id: string
          student_id: string
          suggestions?: Json | null
        }
        Update: {
          analysis?: string | null
          created_at?: string
          id?: string
          school_id?: string
          student_id?: string
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_career_suggestions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_career_suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_counseling_queue: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          priority: string
          reason: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          reason?: string | null
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          reason?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_counseling_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_counseling_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_early_warnings: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          is_resolved: boolean
          school_id: string
          severity: string
          student_id: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          school_id: string
          severity?: string
          student_id: string
          warning_type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          school_id?: string
          severity?: string
          student_id?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_early_warnings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_early_warnings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_parent_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_user_id: string | null
          school_id: string
          sent: boolean
          student_id: string
          update_type: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          parent_user_id?: string | null
          school_id: string
          sent?: boolean
          student_id: string
          update_type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_user_id?: string | null
          school_id?: string
          sent?: boolean
          student_id?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_parent_updates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_parent_updates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_school_reputation: {
        Row: {
          analysis: Json | null
          created_at: string
          factors: Json | null
          id: string
          school_id: string
          score: number | null
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          factors?: Json | null
          id?: string
          school_id: string
          score?: number | null
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          factors?: Json | null
          id?: string
          school_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_school_reputation_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_student_profiles: {
        Row: {
          analysis: Json | null
          created_at: string
          generated_at: string
          id: string
          recommendations: string[] | null
          school_id: string
          strengths: string[] | null
          student_id: string
          weaknesses: string[] | null
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          recommendations?: string[] | null
          school_id: string
          strengths?: string[] | null
          student_id: string
          weaknesses?: string[] | null
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          generated_at?: string
          id?: string
          recommendations?: string[] | null
          school_id?: string
          strengths?: string[] | null
          student_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_student_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_teacher_performance: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          recommendations: string[] | null
          school_id: string
          score: number | null
          teacher_user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          recommendations?: string[] | null
          school_id: string
          score?: number | null
          teacher_user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          recommendations?: string[] | null
          school_id?: string
          score?: number | null
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_teacher_performance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          read_at: string | null
          school_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          school_id?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          school_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          id: string
          marks: number | null
          status: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          marks?: number | null
          status?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          marks?: number | null
          status?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_marks: number | null
          school_id: string
          section_id: string | null
          status: string
          subject_id: string | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          school_id: string
          section_id?: string | null
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          school_id?: string
          section_id?: string | null
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_entries: {
        Row: {
          created_at: string
          id: string
          remarks: string | null
          school_id: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          remarks?: string | null
          school_id: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          remarks?: string | null
          school_id?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          period: string | null
          school_id: string
          section_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          period?: string | null
          school_id: string
          section_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          period?: string | null
          school_id?: string
          section_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          school_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          note_type: string
          school_id: string
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          school_id: string
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          school_id?: string
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_main: boolean
          name: string
          school_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_main?: boolean
          name: string
          school_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_main?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_section_subjects: {
        Row: {
          created_at: string
          id: string
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          section_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          section_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_section_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_section_subjects_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_section_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sections: {
        Row: {
          capacity: number | null
          class_id: string
          class_teacher_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          capacity?: number | null
          class_id: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id: string
        }
        Update: {
          capacity?: number | null
          class_id?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "academic_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          school_id: string
        }
        Insert: {
          activity_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          school_id: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_call_logs: {
        Row: {
          caller_user_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          lead_id: string | null
          notes: string | null
          outcome: string | null
          school_id: string
        }
        Insert: {
          caller_user_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          school_id: string
        }
        Update: {
          caller_user_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_call_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_follow_ups: {
        Row: {
          assigned_to: string | null
          completed: boolean
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          scheduled_at: string
          school_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_at: string
          school_id: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_at?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_follow_ups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_attributions: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          lead_id: string
          school_id: string
          source_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          school_id: string
          source_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          school_id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attributions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attributions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attributions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_sources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          grade_applying: string | null
          id: string
          notes: string | null
          parent_name: string | null
          phone: string | null
          school_id: string
          source_id: string | null
          stage_id: string | null
          status: string
          student_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          grade_applying?: string | null
          id?: string
          notes?: string | null
          parent_name?: string | null
          phone?: string | null
          school_id: string
          source_id?: string | null
          stage_id?: string | null
          status?: string
          student_name?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          grade_applying?: string | null
          id?: string
          notes?: string | null
          parent_name?: string | null
          phone?: string | null
          school_id?: string
          source_id?: string | null
          stage_id?: string | null
          status?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_papers: {
        Row: {
          created_at: string
          date: string | null
          duration_minutes: number | null
          exam_id: string
          id: string
          max_marks: number
          school_id: string
          section_id: string | null
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          duration_minutes?: number | null
          exam_id: string
          id?: string
          max_marks?: number
          school_id: string
          section_id?: string | null
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          duration_minutes?: number | null
          exam_id?: string
          id?: string
          max_marks?: number
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_papers_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "school_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_papers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_papers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plan_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          fee_plan_id: string
          id: string
          name: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          fee_plan_id: string
          id?: string
          name: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          fee_plan_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plan_installments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          academic_year: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          total_amount: number
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          total_amount?: number
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_slips: {
        Row: {
          created_at: string
          due_date: string | null
          generated_at: string
          id: string
          month: string
          paid_amount: number
          school_id: string
          status: string
          student_id: string
          total_amount: number
          year: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          generated_at?: string
          id?: string
          month: string
          paid_amount?: number
          school_id: string
          status?: string
          student_id: string
          total_amount?: number
          year: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          generated_at?: string
          id?: string
          month?: string
          paid_amount?: number
          school_id?: string
          status?: string
          student_id?: string
          total_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_slips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_slips_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          school_id: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          school_id: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          issued_at: string
          paid_amount: number
          school_id: string
          status: string
          student_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string
          paid_amount?: number
          school_id: string
          status?: string
          student_id?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string
          paid_amount?: number
          school_id?: string
          status?: string
          student_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payment_methods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method_id: string | null
          received_by: string | null
          reference_number: string | null
          school_id: string
          student_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          received_by?: string | null
          reference_number?: string | null
          school_id: string
          student_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          received_by?: string | null
          reference_number?: string | null
          school_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "finance_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          school_id: string
          section_id: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          school_id: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_contracts: {
        Row: {
          contract_type: string
          created_at: string
          department: string | null
          designation: string | null
          document_url: string | null
          end_date: string | null
          id: string
          school_id: string
          start_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          contract_type?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          school_id: string
          start_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          school_id?: string
          start_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_url: string | null
          id: string
          notes: string | null
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_count: number | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          school_id: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number | null
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          school_id: string
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          school_id?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_pay_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number | null
          processed_at: string | null
          school_id: string
          status: string
          title: string
          total_amount: number
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number | null
          processed_at?: string | null
          school_id: string
          status?: string
          title?: string
          total_amount?: number
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number | null
          processed_at?: string | null
          school_id?: string
          status?: string
          title?: string
          total_amount?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_pay_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_reviews: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          improvements: string | null
          rating: number | null
          review_period: string | null
          reviewer_id: string | null
          school_id: string
          status: string
          strengths: string | null
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          improvements?: string | null
          rating?: number | null
          review_period?: string | null
          reviewer_id?: string | null
          school_id: string
          status?: string
          strengths?: string | null
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          improvements?: string | null
          rating?: number | null
          review_period?: string | null
          reviewer_id?: string | null
          school_id?: string
          status?: string
          strengths?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_reviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_records: {
        Row: {
          allowances: number
          base_salary: number
          created_at: string
          deductions: number
          id: string
          is_active: boolean
          month: number | null
          net_salary: number | null
          pay_run_id: string | null
          school_id: string
          status: string
          user_id: string
          year: number | null
        }
        Insert: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          id?: string
          is_active?: boolean
          month?: number | null
          net_salary?: number | null
          pay_run_id?: string | null
          school_id: string
          status?: string
          user_id: string
          year?: number | null
        }
        Update: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          id?: string
          is_active?: boolean
          month?: number | null
          net_salary?: number | null
          pay_run_id?: string | null
          school_id?: string
          status?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_records_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "hr_pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          content: string | null
          created_at: string
          id: string
          plan_date: string | null
          school_id: string
          section_id: string | null
          status: string
          subject_id: string | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          plan_date?: string | null
          school_id: string
          section_id?: string | null
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          plan_date?: string | null
          school_id?: string
          section_id?: string | null
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id: string | null
          subject: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_user_id?: string
          school_id?: string
          sender_user_id?: string
          student_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          notification_type: string
          parent_user_id: string
          read_at: string | null
          school_id: string
          student_id: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          parent_user_id: string
          read_at?: string | null
          school_id: string
          student_id?: string | null
          title?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          parent_user_id?: string
          read_at?: string | null
          school_id?: string
          student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_user_id: string | null
          scheduled_at: string
          school_id: string
          sender_user_id: string
          sent: boolean
          sent_at: string | null
          subject: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          recipient_user_id?: string | null
          scheduled_at: string
          school_id: string
          sender_user_id: string
          sent?: boolean
          sent_at?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipient_user_id?: string | null
          scheduled_at?: string
          school_id?: string
          sender_user_id?: string
          sent?: boolean
          sent_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_bootstrap: {
        Row: {
          bootstrapped_at: string | null
          bootstrapped_by: string | null
          created_at: string
          id: string
          locked: boolean
          school_id: string
        }
        Insert: {
          bootstrapped_at?: string | null
          bootstrapped_by?: string | null
          created_at?: string
          id?: string
          locked?: boolean
          school_id: string
        }
        Update: {
          bootstrapped_at?: string | null
          bootstrapped_by?: string | null
          created_at?: string
          id?: string
          locked?: boolean
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_bootstrap_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_branding: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          school_id: string
          secondary_color: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          school_id: string
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          school_id?: string
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_branding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_diary_entries: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          school_id: string
          section_id: string | null
          subject_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          school_id: string
          section_id?: string | null
          subject_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_diary_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_diary_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_diary_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_exams: {
        Row: {
          academic_year: string | null
          created_at: string
          end_date: string | null
          exam_type: string
          id: string
          name: string
          school_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          end_date?: string | null
          exam_type?: string
          id?: string
          name: string
          school_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          end_date?: string | null
          exam_type?: string
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_holidays: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          school_id: string
          start_date: string
          type: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          school_id: string
          start_date: string
          type?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          school_id?: string
          start_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_holidays_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_notices: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          is_published: boolean
          notice_type: string
          priority: string
          published: boolean
          published_at: string | null
          school_id: string
          target_audience: string
          target_roles: string[] | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          notice_type?: string
          priority?: string
          published?: boolean
          published_at?: string | null
          school_id: string
          target_audience?: string
          target_roles?: string[] | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          notice_type?: string
          priority?: string
          published?: boolean
          published_at?: string | null
          school_id?: string
          target_audience?: string
          target_roles?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_user_directory: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_user_directory_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_salary_info: {
        Row: {
          account_number: string | null
          allowances: number
          bank_name: string | null
          base_salary: number
          created_at: string
          deductions: number
          effective_from: string | null
          id: string
          net_salary: number
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          allowances?: number
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          deductions?: number
          effective_from?: string | null
          id?: string
          net_salary?: number
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          allowances?: number
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          deductions?: number
          effective_from?: string | null
          id?: string
          net_salary?: number
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salary_info_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_certificates: {
        Row: {
          certificate_type: string
          content: string | null
          created_at: string
          id: string
          issued_by: string | null
          issued_date: string | null
          school_id: string
          status: string
          student_id: string
          title: string | null
        }
        Insert: {
          certificate_type?: string
          content?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          school_id: string
          status?: string
          student_id: string
          title?: string | null
        }
        Update: {
          certificate_type?: string
          content?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          school_id?: string
          status?: string
          student_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_certificates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year: string | null
          class_section_id: string
          created_at: string
          id: string
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          academic_year?: string | null
          class_section_id: string
          created_at?: string
          id?: string
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          academic_year?: string | null
          class_section_id?: string
          created_at?: string
          id?: string
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          academic_year: string | null
          assessment_id: string | null
          created_at: string
          grade: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          max_marks: number | null
          remarks: string | null
          school_id: string
          student_id: string
          subject_id: string | null
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          assessment_id?: string | null
          created_at?: string
          grade?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number | null
          remarks?: string | null
          school_id: string
          student_id: string
          subject_id?: string | null
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          assessment_id?: string | null
          created_at?: string
          grade?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number | null
          remarks?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string | null
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "academic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_emergency_contact: boolean
          is_primary: boolean
          phone: string | null
          relationship: string | null
          school_id: string
          student_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          phone?: string | null
          relationship?: string | null
          school_id: string
          student_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          phone?: string | null
          relationship?: string | null
          school_id?: string
          student_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_marks: {
        Row: {
          assessment_id: string | null
          computed_grade: string | null
          created_at: string
          grade_points: number | null
          graded_by: string | null
          id: string
          marks: number | null
          remarks: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          assessment_id?: string | null
          computed_grade?: string | null
          created_at?: string
          grade_points?: number | null
          graded_by?: string | null
          id?: string
          marks?: number | null
          remarks?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          assessment_id?: string | null
          computed_grade?: string | null
          created_at?: string
          grade_points?: number | null
          graded_by?: string | null
          id?: string
          marks?: number | null
          remarks?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_marks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "academic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_number: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          roll_number: string | null
          school_id: string
          section_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admission_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          roll_number?: string | null
          school_id: string
          section_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admission_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          roll_number?: string | null
          school_id?: string
          section_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          school_id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          school_id: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          school_id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          academic_year: string | null
          class_section_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string | null
          teacher_user_id: string
        }
        Insert: {
          academic_year?: string | null
          class_section_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id?: string | null
          teacher_user_id: string
        }
        Update: {
          academic_year?: string | null
          class_section_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string | null
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subject_assignments: {
        Row: {
          class_section_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_user_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_user_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subject_assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_periods: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_break: boolean
          name: string
          school_id: string
          sort_order: number
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_break?: boolean
          name: string
          school_id: string
          sort_order?: number
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_break?: boolean
          name?: string
          school_id?: string
          sort_order?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          period_id: string | null
          room: string | null
          school_id: string
          section_id: string | null
          subject_id: string | null
          teacher_id: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          period_id?: string | null
          room?: string | null
          school_id: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          period_id?: string | null
          room?: string | null
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timetable_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "timetable_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_versions: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          name: string
          published_at: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          published_at?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          published_at?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_versions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          parent_message_id: string | null
          school_id: string
          sender_user_id: string
        }
        Insert: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_message_id?: string | null
          school_id: string
          sender_user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_message_id?: string | null
          school_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "workspace_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_finance: { Args: { _school_id: string }; Returns: boolean }
      can_manage_staff: { Args: { _school_id: string }; Returns: boolean }
      can_manage_students: { Args: { _school_id: string }; Returns: boolean }
      can_work_crm: { Args: { _school_id: string }; Returns: boolean }
      get_school_public_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      has_role: {
        Args: { _role: string; _school_id: string }
        Returns: boolean
      }
      is_my_child: {
        Args: { _school_id: string; _student_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_school_member: { Args: { _school_id: string }; Returns: boolean }
      my_children: { Args: { _school_id: string }; Returns: string[] }
      my_student_id: { Args: { _school_id: string }; Returns: string }
    }
    Enums: {
      eduverse_role:
        | "super_admin"
        | "school_owner"
        | "principal"
        | "vice_principal"
        | "school_admin"
        | "academic_coordinator"
        | "teacher"
        | "accountant"
        | "hr_manager"
        | "counselor"
        | "student"
        | "parent"
        | "marketing_staff"
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
      eduverse_role: [
        "super_admin",
        "school_owner",
        "principal",
        "vice_principal",
        "school_admin",
        "academic_coordinator",
        "teacher",
        "accountant",
        "hr_manager",
        "counselor",
        "student",
        "parent",
        "marketing_staff",
      ],
    },
  },
} as const
