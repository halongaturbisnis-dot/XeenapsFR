
import { ReviewItem, ReviewContent, ReviewMatrixRow, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchReviewsPaginatedFromSupabase, 
  upsertReviewToSupabase, 
  deleteReviewFromSupabase 
} from './ReviewSupabaseService';

/**
 * XEENAPS LITERATURE REVIEW SERVICE (HYBRID ARCHITECTURE)
 * - Metadata & Content: Supabase (Fast Registry + JSONB)
 * - In-Memory Cache: Instant UI Consistency
 */

// SESSION SINGLETON CACHE
const reviewUpdateCache = new Map<string, ReviewItem>();
const reviewDeletedRegistry = new Set<string>();

/**
 * FETCH LIST (Metadata Only) - Uses Supabase
 */
export const fetchReviewsPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ReviewItem[], totalCount: number }> => {
  try {
    // Direct call to Supabase Registry
    const result = await fetchReviewsPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
    
    const serverItems: ReviewItem[] = result.items || [];
    
    // MERGE WITH SESSION MEMORY (DEFEATS LATENCY & STALE DATA)
    const mergedItems = serverItems
      .filter(item => !reviewDeletedRegistry.has(item.id))
      .map(item => {
        const cached = reviewUpdateCache.get(item.id);
        return cached ? { ...item, ...cached } : item;
      });

    return { 
      items: mergedItems, 
      totalCount: result.totalCount 
    };
  } catch (error) {
    return { items: [], totalCount: 0 };
  }
};

/**
 * FETCH CONTENT (Payload) - Now from Item's JSONB
 */
export const fetchReviewContent = async (item: ReviewItem): Promise<ReviewContent | null> => {
  return item.matrix_data || { matrix: [], finalSynthesis: '' };
};

/**
 * SAVE WORKFLOW
 * Save Metadata + Content to Supabase JSONB
 */
export const saveReview = async (item: ReviewItem, content: ReviewContent): Promise<boolean> => {
  // 1. UPDATE SESSION MEMORY (INSTANT TRUTH)
  reviewUpdateCache.set(item.id, item);
  
  // 2. BROADCAST TO ACTIVE COMPONENTS
  window.dispatchEvent(new CustomEvent('xeenaps-review-updated', { detail: item }));

  try {
    let updatedItem = { 
      ...item,
      matrix_data: content,
      updatedAt: new Date().toISOString()
    };

    // PHASE 2: REGISTRY UPSERT (Supabase)
    const dbSuccess = await upsertReviewToSupabase(updatedItem);
    return dbSuccess;

  } catch (error) {
    console.error("Save Review Failed:", error);
    return false;
  }
};

/**
 * DELETE WORKFLOW
 * 1. Delete Metadata (Supabase)
 */
export const deleteReview = async (id: string): Promise<boolean> => {
  // 1. UPDATE SESSION MEMORY (BLOCKLIST)
  reviewDeletedRegistry.add(id);
  reviewUpdateCache.delete(id);
  
  // 2. BROADCAST TO ACTIVE COMPONENTS
  window.dispatchEvent(new CustomEvent('xeenaps-review-deleted', { detail: id }));

  // IMPLEMENTATION: Metadata Delete Only (Fastest)
  const dbSuccess = await deleteReviewFromSupabase(id);
  
  return dbSuccess;
};

/**
 * AI Matrix Extraction: Memanggil proxy Groq khusus review
 */
export const runMatrixExtraction = async (
  collectionId: string, 
  centralQuestion: string
): Promise<{ answer: string, verbatim: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiReviewProxy', 
        subAction: 'extract',
        payload: { collectionId, centralQuestion }
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * AI Narrative Synthesis: Menggabungkan seluruh matrix menjadi narasi
 */
export const runReviewSynthesis = async (
  matrix: ReviewMatrixRow[], 
  centralQuestion: string
): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiReviewProxy', 
        subAction: 'synthesize',
        payload: { matrix, centralQuestion }
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const translateReviewRowContent = async (text: string, targetLang: string): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'translateReviewRow', text, targetLang })
    });
    const result = await res.json();
    return result.status === 'success' ? result.translated : null;
  } catch (e) {
    return null;
  }
};
