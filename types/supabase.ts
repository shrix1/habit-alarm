export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      alarms: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          time: string;
          verification_delay: string;
          days_of_week: number[];
          start_date: string;
          end_date: string | null;
          ringtone: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          time: string;
          verification_delay?: string;
          days_of_week: number[];
          start_date?: string;
          end_date?: string | null;
          ringtone?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          time?: string;
          verification_delay?: string;
          days_of_week?: number[];
          start_date?: string;
          end_date?: string | null;
          ringtone?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
      };
      alarm_completions: {
        Row: {
          id: string;
          alarm_id: string;
          user_id: string;
          date: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alarm_id: string;
          user_id: string;
          date?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          alarm_id?: string;
          user_id?: string;
          date?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
