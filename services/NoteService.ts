
import { NoteItem, NoteContent, NoteAttachment, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchNotesPaginatedFromSupabase, 
  upsertNoteToSupabase, 
  deleteNoteFromSupabase 
} from './NoteSupabaseService';
import { deleteRemoteFile } from './ActivityService';

/**
 * XEENAPS NOTEBOOK SERVICE
 * Handles Metadata on Supabase.
 * Content is now stored directly in JSONB (Hybrid Storage).
 * Attachments (Binary) still go to GAS.
 */

export const fetchNotesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  collectionId: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: NoteItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchNotesPaginatedFromSupabase(page, limit, search, collectionId, sortKey, sortDir);
};

export const fetchNoteContent = async (item: NoteItem): Promise<NoteContent | null> => {
  // Hybrid Storage: Content is now embedded in the item
  return item.content_data || { description: '', attachments: [] };
};

export const saveNote = async (item: NoteItem, content: NoteContent): Promise<NoteItem | null> => {
  try {
    // 1. Merge Content into Item (JSONB)
    // GAS Worker for search indexing is no longer needed as Supabase handles it via triggers on metadata
    // or we assume client-side search/filter on JSONB if needed.
    // For large text search, Supabase search_all trigger can be updated to include content text.
    
    // Construct search index from content description + labels
    const descText = (content.description || "").replace(/<[^>]*>/g, ' '); 
    const attachText = content.attachments?.map(a => a.label).join(' ') || "";
    const searchIndex = (descText + " " + attachText).substring(0, 5000);

    const updatedItem = {
      ...item,
      content_data: content,
      searchIndex: searchIndex,
      updatedAt: new Date().toISOString()
    };

    // 2. Save Metadata + Content to Supabase
    const success = await upsertNoteToSupabase(updatedItem);
    return success ? updatedItem : null;

  } catch (e) {
    console.error("Save Note Failed:", e);
    return null;
  }
};

export const deleteNote = async (id: string, itemContext?: NoteItem): Promise<boolean> => {
  try {
    // 1. Clean up physical files (Attachments)
    // We need the item context to know which files to delete.
    // If not provided, we might leave orphans (Lazy Cleanup).
    // Ideally, the UI passes the itemContext.
    if (itemContext && itemContext.content_data && itemContext.content_data.attachments) {
       itemContext.content_data.attachments.forEach(att => {
         if (att.type === 'FILE' && att.fileId && att.nodeUrl) {
           deleteRemoteFile(att.fileId, att.nodeUrl);
         }
       });
    }

    // 2. Delete Metadata (Supabase)
    return await deleteNoteFromSupabase(id);
  } catch (e) {
    return false;
  }
};

export const uploadNoteAttachment = async (file: File): Promise<{ fileId: string, nodeUrl: string, mimeType: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  try {
    const response = await fetch(GAS_WEB_APP_URL, { 
      method: 'POST', 
      body: JSON.stringify({ 
        action: 'vaultFileUpload', 
        fileData: base64Data, 
        fileName: file.name, 
        mimeType: file.type 
      })
    });
    const result = await response.json();
    return result.status === 'success' ? { fileId: result.fileId, nodeUrl: result.nodeUrl, mimeType: file.type } : null;
  } catch (e) {
    return null;
  }
};
