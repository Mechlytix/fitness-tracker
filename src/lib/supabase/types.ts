export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          preferences: Json | null
          withings_tokens: Json | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          preferences?: Json | null
          withings_tokens?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          preferences?: Json | null
          withings_tokens?: Json | null
          created_at?: string
        }
      }
      exercise_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
      }
      exercises: {
        Row: {
          id: string
          name: string
          category_id: string | null
          equipment: string | null
          notes: string | null
          is_custom: boolean
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          equipment?: string | null
          notes?: string | null
          is_custom?: boolean
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          equipment?: string | null
          notes?: string | null
          is_custom?: boolean
          user_id?: string | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          workout_date: string
          notes: string | null
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_date: string
          notes?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_date?: string
          notes?: string | null
          duration_seconds?: number | null
          created_at?: string
        }
      }
      workout_sets: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          set_order: number
          weight_kg: number | null
          reps: number | null
          distance: number | null
          distance_unit: string | null
          time_seconds: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          set_order: number
          weight_kg?: number | null
          reps?: number | null
          distance?: number | null
          distance_unit?: string | null
          time_seconds?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string
          set_order?: number
          weight_kg?: number | null
          reps?: number | null
          distance?: number | null
          distance_unit?: string | null
          time_seconds?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      body_measurements: {
        Row: {
          id: string
          user_id: string
          measured_at: string
          weight_kg: number | null
          fat_pct: number | null
          muscle_mass_kg: number | null
          bone_mass_kg: number | null
          fat_free_mass_kg: number | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          measured_at: string
          weight_kg?: number | null
          fat_pct?: number | null
          muscle_mass_kg?: number | null
          bone_mass_kg?: number | null
          fat_free_mass_kg?: number | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          measured_at?: string
          weight_kg?: number | null
          fat_pct?: number | null
          muscle_mass_kg?: number | null
          bone_mass_kg?: number | null
          fat_free_mass_kg?: number | null
          source?: string
          created_at?: string
        }
      }
      foods: {
        Row: {
          id: string
          name: string
          brand: string | null
          barcode: string | null
          source: string
          source_id: string | null
          calories_per_100g: number | null
          protein_per_100g: number | null
          carbs_per_100g: number | null
          fat_per_100g: number | null
          fiber_per_100g: number | null
          full_nutrients: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          barcode?: string | null
          source: string
          source_id?: string | null
          calories_per_100g?: number | null
          protein_per_100g?: number | null
          carbs_per_100g?: number | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          full_nutrients?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          barcode?: string | null
          source?: string
          source_id?: string | null
          calories_per_100g?: number | null
          protein_per_100g?: number | null
          carbs_per_100g?: number | null
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          full_nutrients?: Json | null
          created_at?: string
        }
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          meal_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          meal_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          meal_type?: string
          created_at?: string
        }
      }
      food_log_items: {
        Row: {
          id: string
          food_log_id: string
          food_id: string
          quantity_g: number
          serving_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          food_log_id: string
          food_id: string
          quantity_g: number
          serving_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          food_log_id?: string
          food_id?: string
          quantity_g?: number
          serving_description?: string | null
          created_at?: string
        }
      }
      llm_conversations: {
        Row: {
          id: string
          user_id: string
          conversation_type: string
          messages: Json
          context_snapshot: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_type: string
          messages: Json
          context_snapshot?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_type?: string
          messages?: Json
          context_snapshot?: Json | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
