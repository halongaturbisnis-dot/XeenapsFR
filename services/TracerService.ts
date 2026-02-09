
import { TracerProject, TracerLog, TracerReference, TracerReferenceContent, TracerTodo, TracerFinanceItem, TracerFinanceContent, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchTracerProjectsFromSupabase, 
  upsertTracerProjectToSupabase, 
  deleteTracerProjectFromSupabase,
  fetchTracerLogsFromSupabase,
  upsertTracerLogToSupabase,
  deleteTracerLogFromSupabase,
  fetchTracerReferencesFromSupabase,
  upsertTracerReferenceToSupabase,
  deleteTracerReferenceFromSupabase,
  fetchTracerTodosFromSupabase,
  upsertTracerTodoToSupabase,
  deleteTracerTodoFromSupabase,
  fetchTracerFinanceFromSupabase,
  upsertTracerFinanceToSupabase,
  deleteTracerFinanceFromSupabase
} from './TracerSupabaseService';
import { deleteRemoteFile } from './ActivityService';
import { fetchFileContent } from './gasService';

/**
 * XEENAPS TRACER SERVICE (HYBRID ARCHITECTURE)
 * Metadata & Structured Data: Supabase (JSONB)
 * Binary Files: GAS (Drive)
 */

// --- 1. PROJECTS ---

export const fetchTracerProjects = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  signal?: AbortSignal
): Promise<{ items: TracerProject[], totalCount: number }> => {
  return await fetchTracerProjectsFromSupabase(page, limit, search, "updatedAt", "desc");
};

export const saveTracerProject = async (item: TracerProject): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-updated', { detail: item }));
  return await upsertTracerProjectToSupabase(item);
};

export const deleteTracerProject = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-deleted', { detail: id }));
  return await deleteTracerProjectFromSupabase(id);
};

// --- 2. LOGS ---

export const fetchTracerLogs = async (projectId: string): Promise<TracerLog[]> => {
  // Data (log_data) is included in the fetch
  return await fetchTracerLogsFromSupabase(projectId);
};

export const saveTracerLog = async (item: TracerLog, content: { description: string }): Promise<boolean> => {
  try {
    const updatedItem = {
      ...item,
      log_data: content, // Save directly to JSONB
      updatedAt: new Date().toISOString()
    };
    return await upsertTracerLogToSupabase(updatedItem);
  } catch (e) {
    console.error("Save Tracer Log Failed:", e);
    return false;
  }
};

export const deleteTracerLog = async (id: string): Promise<boolean> => {
  return await deleteTracerLogFromSupabase(id);
};

// --- 3. REFERENCES ---

export const fetchTracerReferences = async (projectId: string): Promise<TracerReference[]> => {
  return await fetchTracerReferencesFromSupabase(projectId);
};

export const linkTracerReference = async (item: Partial<TracerReference>): Promise<TracerReference | null> => {
  try {
    const newRef: TracerReference = {
      id: item.id || crypto.randomUUID(),
      projectId: item.projectId || '',
      collectionId: item.collectionId || '',
      // quotes_data initialized empty
      quotes_data: { quotes: [] },
      storageNodeUrl: '', // Not needed for JSONB
      createdAt: new Date().toISOString()
    };
    
    const success = await upsertTracerReferenceToSupabase(newRef);
    return success ? newRef : null;
  } catch (e) {
    return null;
  }
};

export const unlinkTracerReference = async (id: string): Promise<boolean> => {
  return await deleteTracerReferenceFromSupabase(id);
};

export const fetchReferenceContent = async (item: TracerReference): Promise<TracerReferenceContent | null> => {
  return item.quotes_data || { quotes: [] };
};

export const saveReferenceContent = async (item: TracerReference, content: TracerReferenceContent): Promise<{quotes_data: TracerReferenceContent} | null> => {
  try {
    const updatedItem = {
      ...item,
      quotes_data: content
    };
    await upsertTracerReferenceToSupabase(updatedItem);
    return { quotes_data: content };
  } catch (e) {
    return null;
  }
};

// --- 4. TODOS ---

export const fetchTracerTodos = async (projectId: string): Promise<TracerTodo[]> => {
  return await fetchTracerTodosFromSupabase(projectId);
};

export const saveTracerTodo = async (item: TracerTodo): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-todo-updated', { detail: item }));
  return await upsertTracerTodoToSupabase(item);
};

export const deleteTracerTodo = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-todo-deleted', { detail: id }));
  return await deleteTracerTodoFromSupabase(id);
};

// --- 5. FINANCE ---

export const fetchTracerFinance = async (projectId: string, startDate = "", endDate = "", search = ""): Promise<TracerFinanceItem[]> => {
  return await fetchTracerFinanceFromSupabase(projectId, startDate, endDate, search);
};

/**
 * EXPORT PDF LOGIC (Hybrid Stitching)
 * Updated to use attachments_data from JSONB
 */
export const exportFinanceLedger = async (projectId: string, currency: string): Promise<{ base64: string, filename: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
     // 1. Fetch Finance Items (All)
     const financeItems = await fetchTracerFinanceFromSupabase(projectId);
     if (financeItems.length === 0) return null;

     // 2. Calculate Running Balance for Export
     const sortedItems = [...financeItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     let runningBalance = 0;
     const calculatedItems = sortedItems.map(item => {
         runningBalance += (item.credit || 0) - (item.debit || 0);
         return { ...item, balance: runningBalance };
     });

     // 3. Fetch Project Info
     const { items: projects } = await fetchTracerProjectsFromSupabase(1, 1000, ""); 
     const project = projects.find(p => p.id === projectId);
     const projectTitle = project?.title || project?.label || "Financial Report";
     const projectAuthors = Array.isArray(project?.authors) ? project.authors.join(", ") : "Xeenaps User";

     // 4. Enrich Items with Attachment Links (From JSONB)
     const enrichedTransactions = calculatedItems.map(item => {
        let linkString = "-";
        if (item.attachments_data && Array.isArray(item.attachments_data.attachments)) {
           const urls = item.attachments_data.attachments.map((a: any) => 
              a.url || (a.fileId ? `https://drive.google.com/file/d/${a.fileId}/view` : "")
           ).filter((u: string) => u !== "");
           if (urls.length > 0) linkString = urls.join(" | ");
        }
        return { ...item, links: linkString };
     });

     // 5. Construct Payload
     const payload = {
        transactions: enrichedTransactions,
        projectTitle,
        projectAuthors,
        currency
     };

     // 6. Send to GAS (PDF Engine)
     const res = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
           action: 'generateFinanceExport',
           payload: payload
        })
     });
     
     const result = await res.json();
     if (result.status === 'success') {
        return { base64: result.base64, filename: result.filename };
     }
     return null;
  } catch (e) {
    console.error("Finance Export Error:", e);
    return null;
  }
};

export const saveTracerFinance = async (item: TracerFinanceItem, content: TracerFinanceContent): Promise<boolean> => {
  try {
    const updatedItem = {
      ...item,
      attachments_data: content, // Save direct to JSONB
      updatedAt: new Date().toISOString()
    };
    return await upsertTracerFinanceToSupabase(updatedItem);
  } catch (e) {
    return false;
  }
};

export const deleteTracerFinance = async (id: string): Promise<GASResponse<any>> => {
  // Physical file cleanup should be handled if item context is known, 
  // but assuming deletion from list, we might not have it handy.
  // Standard protocol: Delete Metadata.
  const success = await deleteTracerFinanceFromSupabase(id);
  return { status: success ? 'success' : 'error' };
};

// --- AI TRACER PROXIES (Passthrough to GAS) ---

export const extractTracerQuotes = async (collectionId: string, contextQuery: string): Promise<Array<{ originalText: string; enhancedText: string }> | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'extractQuote', 
        payload: { collectionId, contextQuery } 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const enhanceTracerQuote = async (originalText: string, citation: string): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'enhanceQuote', 
        payload: { originalText, citation } 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};
