
import { TeachingItem, TeachingVaultItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchTeachingPaginatedFromSupabase, 
  upsertTeachingToSupabase, 
  deleteTeachingFromSupabase,
  fetchTeachingByIdFromSupabase
} from './TeachingSupabaseService';
import { deleteRemoteFile } from './ActivityService';

/**
 * XEENAPS TEACHING SERVICE (HYBRID ARCHITECTURE)
 * Metadata & Vault: Supabase (JSONB)
 * File Storage: GAS (Binary)
 */

export const fetchTeachingPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  signal?: AbortSignal
): Promise<{ items: TeachingItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchTeachingPaginatedFromSupabase(
    page, 
    limit, 
    search, 
    startDate, 
    endDate
  );
};

export const saveTeachingItem = async (item: TeachingItem): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-updated', { detail: item }));

  // Direct call to Supabase Registry
  return await upsertTeachingToSupabase(item);
};

export const deleteTeachingItem = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-deleted', { detail: id }));

  try {
    // 1. Fetch Item to get Vault Files
    const item = await fetchTeachingByIdFromSupabase(id);

    // 2. Physical File Cleanup (Vault attachments)
    if (item && item.vault_data && Array.isArray(item.vault_data)) {
      item.vault_data.forEach(vItem => {
        if (vItem.type === 'FILE' && vItem.fileId && vItem.nodeUrl) {
          deleteRemoteFile(vItem.fileId, vItem.nodeUrl);
        }
      });
    }

    // 3. Metadata Cleanup (Supabase)
    return await deleteTeachingFromSupabase(id);
  } catch (e) {
    console.error("Delete Teaching Failed:", e);
    return false;
  }
};

/**
 * HYBRID: Vault content extractor from Item
 */
export const fetchTeachingVaultContent = async (item: TeachingItem): Promise<TeachingVaultItem[]> => {
  return item.vault_data || [];
};

/**
 * HYBRID: Vault content updator (via Item upsert)
 */
export const updateTeachingVaultContent = async (
  item: TeachingItem, 
  newContent: TeachingVaultItem[]
): Promise<boolean> => {
  const updatedItem = {
    ...item,
    vault_data: newContent,
    updatedAt: new Date().toISOString()
  };
  return await saveTeachingItem(updatedItem);
};
