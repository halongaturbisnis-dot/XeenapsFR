
import { ConsultationItem, ConsultationAnswerContent } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchConsultationsFromSupabase, 
  upsertConsultationToSupabase, 
  deleteConsultationFromSupabase 
} from './ConsultationSupabaseService';

/**
 * XEENAPS CONSULTATION SERVICE
 * Hub for AI DeepSeek-R1 (Reasoning) Knowledge Partner.
 * Updated: Hybrid Cloud Architecture (Supabase Metadata + JSONB)
 */

export const fetchRelatedConsultations = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  signal?: AbortSignal
): Promise<{ items: ConsultationItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchConsultationsFromSupabase(collectionId, page, limit, search);
};

/**
 * Proxy call to DeepSeek-R1 reasoning model
 */
export const callAiConsult = async (
  collectionId: string,
  question: string
): Promise<{ answer: string, reasoning: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiConsultProxy',
        collectionId,
        question
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      return { 
        answer: result.data,
        reasoning: result.reasoning 
      };
    }
    throw new Error(result.message || "Consultation engine failed");
  } catch (error) {
    console.error("AI Consult Error:", error);
    return null;
  }
};

/**
 * PERSISTENCE: Save Consultation metadata & content to Supabase (JSONB).
 */
export const saveConsultation = async (
  item: ConsultationItem,
  answerContent: ConsultationAnswerContent
): Promise<boolean> => {
  try {
    // Merge answer content into the item structure (Hybrid Storage)
    const updatedItem = {
      ...item,
      answer_data: answerContent,
      updatedAt: new Date().toISOString()
    };
    
    return await upsertConsultationToSupabase(updatedItem);
  } catch (error) {
    console.error("Save Consultation Failed:", error);
    return false;
  }
};

export const deleteConsultation = async (id: string): Promise<boolean> => {
  try {
    return await deleteConsultationFromSupabase(id);
  } catch (error) {
    return false;
  }
};
