
/**
 * XEENAPS PKM - MAIN ROUTER (LIGHTWEIGHT WORKER MODE)
 * Metadata Registry has moved to Supabase.
 * GAS now acts as: AI Proxy, PDF Generator, File Sharding Storage, & External API Gateway.
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // ACTION: checkQuota (GET support for easy pinging/monitoring)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: getFileContent (Support for Sharding Retrieval)
    if (action === 'getFileContent') {
      const fileId = e.parameter.fileId;
      if (!fileId) return createJsonResponse({ status: 'error', message: 'No fileId provided' });
      const content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
      return createJsonResponse({ status: 'success', content: content });
    }

    // NEW: getNotifications with Server-Side Date Filtering
    // Note: In Hybrid mode, Sharbox notifications are mostly handled by Supabase client-side, 
    // but this endpoint might still be used for legacy or specific checks if needed. 
    if (action === 'getNotifications') {
      // For Inbox Buffer Strategy: GAS checks Sheet Inbox (Buffer) to notify of PENDING syncs
      const bufferItems = getInboxBufferFromRegistry(); 
      // Supabase handles the rest. This endpoint notifies about *unsynced* items in sheet.
      const unreadSharbox = bufferItems; 
      
      return createJsonResponse({
        status: 'success',
        data: {
          sharbox: unreadSharbox,
          todos: [] // Todos moved to Supabase completely
        }
      });
    }

    // UPDATED: getInboxBuffer (For Background Sync)
    if (action === 'getInboxBuffer') {
      const result = getInboxBufferFromRegistry();
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: searchGlobalArticles (Proxy for OpenAlex)
    if (action === 'searchGlobalArticles') {
      return createJsonResponse(handleGlobalArticleSearch(e.parameter));
    }

    // NEW: searchGlobalBooks (Proxy for Open Library)
    if (action === 'searchGlobalBooks') {
      return createJsonResponse(handleGlobalBookSearch(e.parameter));
    }

    if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(e) {
    return createJsonResponse({ status: 'error', message: 'Malformed JSON request' });
  }
  
  const action = body.action;
  
  try {
    // NEW: API Key Management
    if (action === 'manageApiKey') {
      return createJsonResponse(handleApiKeyManager(body));
    }
  
    // Only Sharbox setup remains in GAS (for Buffer Sheet)
    if (action === 'setupSharboxDatabase') return createJsonResponse(setupSharboxDatabase());
    
    // NEW: Sharbox Actions (Updated for Inbox Buffer)
    // FIX: Pass senderProfile from body to handleSendToSharbox
    if (action === 'sendToSharbox') return createJsonResponse(handleSendToSharbox(
      body.targetUniqueAppId, 
      body.receiverName, 
      body.receiverPhotoUrl, 
      body.message, 
      body.item, 
      body.receiverContacts,
      body.senderProfile // Pass Supabase Profile Data
    ));
    if (action === 'clearInboxBuffer') return createJsonResponse(clearInboxBuffer(body.ids)); // New Buffer Cleanup
    
    // Legacy Sharbox Actions
    if (action === 'claimSharboxItem') return createJsonResponse(handleClaimSharboxItem(body.id)); 

    // MODIFIED: saveNoteContent (Worker Only)
    if (action === 'saveNoteContent') return createJsonResponse(saveNoteContentToDrive(body.item, body.content));

    // NEW: aiTracerProxy
    if (action === 'aiTracerProxy') {
      const { subAction, payload } = body;
      if (subAction === 'extractQuote') return createJsonResponse(handleAiTracerQuoteExtraction(payload));
      if (subAction === 'enhanceQuote') return createJsonResponse(handleAiTracerQuoteEnhancement(payload));
    }

    // NEW: aiReviewProxy
    if (action === 'aiReviewProxy') return createJsonResponse(handleAiReviewRequest(body.subAction, body.payload));
    
    // ACTION: translateReviewRow (Refined with Error Catching)
    if (action === 'translateReviewRow') {
      try {
        const { text, targetLang } = body;
        const result = fetchTranslation(text, targetLang);
        return createJsonResponse({ status: 'success', translated: result });
      } catch (tErr) {
        return createJsonResponse({ status: 'error', message: "Translation failed: " + tErr.toString() });
      }
    }

    // MODIFIED ACTION: saveConsultation -> saveConsultationContent (Storage Worker Only)
    if (action === 'saveConsultationContent') {
      return createJsonResponse(saveConsultationContentToDrive(body.item, body.answerContent));
    }
    
    // NEW ACTION: aiConsultProxy
    if (action === 'aiConsultProxy') {
      return createJsonResponse(handleAiConsultRequest(body.collectionId, body.question));
    }

    // NEW ACTION: generateCV_PDF
    if (action === 'generateCV_PDF') {
      // FIX: Pass FULL BODY so engine can extract payload properly
      return createJsonResponse(handleGenerateCV_PDF(body));
    }

    // NEW ACTION: translateResearchSource
    if (action === 'translateResearchSource') {
      const { findings, methodology, limitations, targetLang } = body;
      const tFindings = fetchTranslation(findings, targetLang);
      const tMethod = fetchTranslation(methodology, targetLang);
      const tLimits = fetchTranslation(limitations, targetLang);
      return createJsonResponse({ 
        status: 'success', 
        findings: tFindings, 
        methodology: tMethod, 
        limitations: tLimits 
      });
    }

    // NEW ACTION: getHybridSnippet (Research Context)
    if (action === 'getHybridSnippet') {
      const { fileId, nodeUrl } = body;
      const snippet = getHybridSnippet(fileId, nodeUrl);
      return createJsonResponse({ status: 'success', snippet: snippet });
    }

    // NEW ACTION: generateCitations
    if (action === 'generateCitations') {
      const { item, style, language } = body;
      const result = formatCitations(item, style, language);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW ACTION: generateInsight (AI Insighter)
    if (action === 'generateInsight') {
      return createJsonResponse(handleGenerateInsight(body.item));
    }

    // NEW ACTION: savePresentation (Conversion + Registry)
    if (action === 'savePresentation') {
      return createJsonResponse(handleSavePresentation(body));
    }

    // NEW ACTION: deletePresentation
    if (action === 'deletePresentation') {
      return createJsonResponse(deletePresentationRecord(body.id));
    }

    // NEW ACTION: generateQuestionsAI
    if (action === 'generateQuestionsAI') {
      return createJsonResponse(handleGenerateQuestions(body));
    }

    // NEW ACTION: translateInsightSection (TRANSLATION + TOTAL REWRITE)
    if (action === 'translateInsightSection') {
      const { fileId, sectionName, targetLang, nodeUrl } = body;
      if (!fileId) throw new Error("Missing fileId");

      const myUrl = ScriptApp.getService().getUrl();
      const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;
      let insightJson;

      // 1. Ambil data JSON asli
      if (isLocal) {
        insightJson = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
      } else {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + fileId);
        insightJson = JSON.parse(JSON.parse(remoteRes.getContentText()).content);
      }

      // 2. Terjemahkan bagian spesifik
      const originalText = insightJson[sectionName];
      if (!originalText) throw new Error("Section text is empty");
      
      const translatedText = fetchTranslation(originalText, targetLang);
      insightJson[sectionName] = translatedText;

      // 3. Simpan balik (Total Rewrite)
      const newContent = JSON.stringify(insightJson);
      if (isLocal) {
        DriveApp.getFileById(fileId).setContent(newContent);
      } else {
        // ENHANCED: Pass fileId to remote node to perform overwrite instead of create
        UrlFetchApp.fetch(nodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'saveJsonFile', fileId: fileId, content: newContent })
        });
      }

      return createJsonResponse({ status: 'success', translatedText: translatedText });
    }

    // NEW ACTION: vaultFileUpload (Dynamic Sharding for Activity Vault)
    if (action === 'vaultFileUpload') {
      const threshold = CONFIG.STORAGE.THRESHOLD;
      const target = getViableStorageTarget(threshold);
      if (!target) return createJsonResponse({ status: 'error', message: 'Storage critical threshold reached.' });

      let fileId;
      if (target.isLocal) {
        const folder = DriveApp.getFolderById(target.folderId);
        const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
        fileId = folder.createFile(blob).getId();
      } else {
        const res = UrlFetchApp.fetch(target.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveFileDirect', 
            fileName: body.fileName, 
            mimeType: body.mimeType, 
            fileData: body.fileData, 
            folderId: target.folderId 
          }),
          muteHttpExceptions: true
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') fileId = resJson.fileId;
        else throw new Error(resJson.message);
      }
      return createJsonResponse({ status: 'success', fileId: fileId, nodeUrl: target.url });
    }

    // ACTION: checkQuota (POST support for Master-Slave communication)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: saveJsonFile (ID-AWARE OVERWRITE SUPPORT)
    if (action === 'saveJsonFile') {
      let file;
      if (body.fileId) {
        // TOTAL REWRITE LOGIC
        file = DriveApp.getFileById(body.fileId);
        file.setContent(body.content);
      } else {
        // INITIAL CREATION LOGIC
        const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
        const folder = DriveApp.getFolderById(folderId);
        const blob = Utilities.newBlob(body.content, 'application/json', body.fileName);
        file = folder.createFile(blob);
      }
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: saveFileDirect
    if (action === 'saveFileDirect') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: deleteRemoteFiles (Support for Sharding Deletion)
    if (action === 'deleteRemoteFiles') {
      const fileIds = body.fileIds || [];
      fileIds.forEach(id => {
        if (id) permanentlyDeleteFile(id);
      });
      return createJsonResponse({ status: 'success' });
    }
    
    // ACTION: saveItem (Library Item Worker - Content Only)
    // Modified: Removes Metadata Registry to Sheet. Only handles File/Content Sharding.
    if (action === 'saveItem') {
      const item = body.item;
      // SYSTEM ASSET GUARD: Avoid sharding/AI for internal assets
      const isSystemAsset = (String(item.id).toUpperCase() === 'PHOTO_PROFILE');
      
      const extractedText = body.extractedText || "";
      
      // Determine required threshold based on method
      const isFileUpload = (body.file && body.file.fileData);
      const threshold = isFileUpload ? CONFIG.STORAGE.THRESHOLD : CONFIG.STORAGE.CRITICAL_THRESHOLD;
      const storageTarget = getViableStorageTarget(threshold);

      // STORAGE GUARD: If no storage (Master or any Slaves) has enough space
      if (!storageTarget) {
        return createJsonResponse({ 
          status: 'error', 
          title: 'REGISTERING FAILED', 
          message: 'Your Storage is critical (below 2GB). Please register a new storage node to continue.' 
        });
      }

      item.storageNodeUrl = storageTarget.url;

      // 1. SHARDING: Extracted Content JSON - SKIP IF SYSTEM ASSET
      if (extractedText && !isSystemAsset) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: jsonContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.extractedJsonId = resJson.fileId;
        }
      }

      // 2. SHARDING: Insight Data JSON - SKIP IF SYSTEM ASSET
      if (!item.insightJsonId && !isSystemAsset) {
        const insightFileName = `insight_${item.id}.json`;
        const insightContent = JSON.stringify({});
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(insightContent, 'application/json', insightFileName));
          item.insightJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: insightFileName, content: insightContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.insightJsonId = resJson.fileId;
        }
      }

      // 3. SHARDING: Original File / Binary Data
      if (body.file && body.file.fileData) {
        const mimeType = body.file.mimeType || 'application/octet-stream';
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const blob = Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName);
          const file = folder.createFile(blob);
          item.fileId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveFileDirect', fileName: body.file.fileName, mimeType: mimeType, fileData: body.file.fileData, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') {
            item.fileId = resJson.fileId;
          }
        }
      }

      // Removed saveToSheet(...) call. Metadata is now handled by Supabase in frontend.
      
      return createJsonResponse({ 
        status: 'success', 
        fileId: item.fileId, 
        nodeUrl: item.storageNodeUrl,
        extractedJsonId: item.extractedJsonId,
        insightJsonId: item.insightJsonId
      });
    }
    
    if (action === 'extractOnly') {
      let extractedText = "";
      let fileName = body.fileName || "Extracted Content";
      let imageView = null;
      let detectedMime = null;
      let primaryDoiFromMeta = null;
      
      // Wrap regex variables in a block to avoid identifier duplication errors in Main.gs
      {
        const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]{5,}/i;
        const isbnPattern = /ISBN(?:-1[03])?:?\s*((?:97[89][\s-]?)?[0-9]{1,5}[\s-]?[0-9]+[\s-]?[0-9]+[\s-]?[0-9X])/i;
        const issnPattern = /ISSN:?\s*([0-9]{4}-?[0-9]{3}[0-9X])/i;
        const pmidPattern = /PMID:?\s*(\d{4,11})/i;
        const arxivPattern = /arXiv:?\s*(\d{4}\.\d{4,5}(?:v\d+)?)/i;

        let detectedDoi = null;
        let detectedIsbn = null;
        let detectedIssn = null;
        let detectedPmid = null;
        let detectedArxiv = null;

        try {
          if (body.url) {
            // STEP 1: SNIFF URL STRING (Strict checking)
            const urlDoiMatch = body.url.match(doiPattern);
            if (urlDoiMatch) detectedDoi = urlDoiMatch[0];
            
            const urlPmidMatch = body.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
            if (urlPmidMatch) detectedPmid = urlPmidMatch[1];

            const urlArxivMatch = body.url.match(/arxiv\.org\/(?:pdf|abs)\/(\d{4}\.\d{4,5})/i);
            if (urlArxivMatch) detectedArxiv = urlArxivMatch[1];

            const driveId = getFileIdFromUrl(body.url);
            if (driveId && (body.url.includes('drive.google.com') || body.url.includes('docs.google.com'))) {
              try {
                const fileMeta = Drive.Files.get(driveId);
                detectedMime = fileMeta.mimeType;
                const isAudioVideo = detectedMime.includes('audio/') || detectedMime.includes('video/');
                if (isAudioVideo) {
                  return createJsonResponse({ status: 'error', message: 'Audio/Video from Drive not supported.' });
                }
                if (detectedMime && detectedMime.toLowerCase().includes('image/')) imageView = 'https://lh3.googleusercontent.com/d/' + driveId;
              } catch (e) {}
            }
            
            extractedText = routerUrlExtraction(body.url);
            const doiMetaMatch = extractedText.match(/PRIMARY_DOI:\s*([^\n]+)/);
            if (doiMetaMatch) primaryDoiFromMeta = doiMetaMatch[1].trim();
          } else if (body.fileData) {
            extractedText = handleFileExtraction(body.fileData, body.mimeType, fileName);
            detectedMime = body.mimeType;
          }
        } catch (err) {
          extractedText = "Extraction failed: " + err.toString();
        }

        const snippet = extractedText.substring(0, 15000);
        
        // STEP 2: Content Scanning (Fallback)
        if (!detectedDoi) detectedDoi = primaryDoiFromMeta || (snippet.match(doiPattern) ? snippet.match(doiPattern)[0] : null);
        if (!detectedIsbn) detectedIsbn = snippet.match(isbnPattern) ? snippet.match(isbnPattern)[1] : null;
        if (!detectedIssn) detectedIssn = snippet.match(issnPattern) ? snippet.match(issnPattern)[1] : null;
        if (!detectedPmid) detectedPmid = snippet.match(pmidPattern) ? snippet.match(pmidPattern)[1] : null;
        if (!detectedArxiv) detectedArxiv = snippet.match(arxivPattern) ? (snippet.match(arxivPattern)[1] || snippet.match(arxivPattern)[0]) : null;

        // DOI CLEANUP
        if (detectedDoi && !primaryDoiFromMeta) {
          detectedDoi = detectedDoi.replace(/[.,;)]+$/, '');
          if (/[0-9][A-Z]{3,}$/.test(detectedDoi)) {
            const cleaned = detectedDoi.replace(/[A-Z]{3,}$/, '');
            if (cleaned.length > 7) detectedDoi = cleaned;
          }
        }

        return createJsonResponse({ 
          status: 'success', 
          extractedText: extractedText,
          fileName: fileName,
          mimeType: detectedMime,
          detectedDoi: detectedDoi,
          detectedIsbn: detectedIsbn,
          detectedIssn: detectedIssn,
          detectedPmid: detectedPmid,
          detectedArxiv: detectedArxiv,
          imageView: imageView
        });
      }
    }

    if (action === 'searchByIdentifier') return createJsonResponse(handleIdentifierSearch(body.idValue));
    
    // MODIFIED: Injeksi parameter responseType ke handleAiRequest
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride, responseType } = body;
      return createJsonResponse(handleAiRequest(provider, prompt, modelOverride, responseType));
    }
    
    // NEW: fetchImageProxy (Bypass CORS via Server-side fetch)
    if (action === 'fetchImageProxy') {
      try {
        const imgRes = UrlFetchApp.fetch(body.url);
        const blob = imgRes.getBlob();
        const b64 = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({ status: 'success', data: 'data:' + blob.getContentType() + ';base64,' + b64 });
      } catch (e) {
        return createJsonResponse({ status: 'error', message: e.toString() });
      }
    }

    // UPDATED ACTION: getSupportingReferences (Protected Logic)
    if (action === 'getSupportingReferences') {
      const keywords = body.keywords || [];
      let references = [];
      let videoUrl = "";
      
      try {
        references = getSupportingReferencesFromOpenAlex(keywords);
      } catch (e) { console.error("Ref fetch fail: " + e.toString()); }
      
      try {
        videoUrl = getYoutubeRecommendation(keywords);
      } catch (e) { console.error("YT fetch fail: " + e.toString()); }
      
      return createJsonResponse({
        status: 'success',
        data: {
          references: references,
          videoUrl: videoUrl || ""
        }
      });
    }

    // NEW ACTION: translateBrainstorming
    if (action === 'translateBrainstorming') {
      const { data, targetLang } = body;
      const translated = {};
      const fields = ['proposedTitle', 'problemStatement', 'researchGap', 'researchQuestion', 'methodology', 'population', 'proposedAbstract'];
      
      fields.forEach(field => {
        if (data[field]) {
          translated[field] = fetchTranslation(data[field], targetLang);
        }
      });

      if (data.pillars && Array.isArray(data.pillars)) {
        translated.pillars = data.pillars.map(p => fetchTranslation(p, targetLang));
      }

      return createJsonResponse({ status: 'success', data: translated });
    }

    // MODIFIED ACTION: getBrainstormingRecommendations (Now calls Brainstorming_API module)
    if (action === 'getBrainstormingRecommendations') {
      const { keywords, title } = body;
      return createJsonResponse(getBrainstormingDeepRecommendations(keywords, title));
    }
    
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * ------------------------------------------------------------------
 * XEENAPS KEEP-ALIVE SYSTEM
 * Mencegah Project Supabase Pause karena inaktivitas.
 * ------------------------------------------------------------------
 */
function keepSupabaseAlive() {
  const scriptProps = PropertiesService.getScriptProperties();
  const SUPABASE_URL = scriptProps.getProperty('SUPABASE_URL');
  const SUPABASE_KEY = scriptProps.getProperty('SUPABASE_KEY');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Keep-Alive Skipped: Harap set SUPABASE_URL dan SUPABASE_KEY di Script Properties.");
    return;
  }

  try {
    const targetUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`;
    
    const options = {
      method: 'get',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(targetUrl, options);
    console.log(`Keep-Alive Heartbeat: ${response.getResponseCode()}`);
    
  } catch (e) {
    console.error("Keep-Alive Error: " + e.toString());
  }
}