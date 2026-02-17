

/**
 * XEENAPS PKM - BRAINSTORMING API MODULE
 * Specialized for deep research recommendations.
 * STRATEGY: "Total Resilience Search" with Polite Pool Injection.
 */

function getBrainstormingDeepRecommendations(keywords, title) {
  try {
    let externalRefs = [];
    
    // Sanitasi Keywords
    let safeKeywords = [];
    if (Array.isArray(keywords)) {
      safeKeywords = keywords.filter(k => k && typeof k === 'string' && k.trim() !== '');
    } else if (typeof keywords === 'string' && keywords.trim() !== '') {
      safeKeywords = [keywords];
    }

    // --- STRATEGI CASCADING FALLBACK (Mundur Teratur) ---
    // Mencoba mencari dari yang paling spesifik (2 keyword) hingga paling umum.
    
    // Level 1: Gabungan 2 Keyword (Sweet Spot Konteks)
    if (safeKeywords.length >= 2) {
       const query = safeKeywords.slice(0, 2).join(" ");
       externalRefs = fetchOpenAlexByQuery(query);
    }

    // Level 2: 1 Keyword Utama (Luas) - Jika Level 1 Gagal atau Keyword Cuma 1
    if (externalRefs.length === 0 && safeKeywords.length >= 1) {
       const query = safeKeywords[0];
       externalRefs = fetchOpenAlexByQuery(query);
    }

    // Level 3: Judul Proyek (The Ultimate Backup via Crossref) - Jika semua keyword gagal
    if (externalRefs.length === 0) {
       const queryBackup = title && title.length > 3 ? title : "Research Methodology";
       externalRefs = fetchCrossrefByQuery(queryBackup);
    }
    
    // --- OTHER RECOMMENDATIONS (Unchanged) ---

    const youtubeUrl = getYoutubeRecommendation(safeKeywords);
    
    // Internal Relevance via Tokenized Search
    const searchQuery = (safeKeywords.length > 0) ? safeKeywords[0] : title;
    // Panggil fungsi internal library (pastikan fungsi ini ada di scope global GAS)
    let internalItems = [];
    try {
      if (typeof getPaginatedItems === 'function') {
        const libraryResult = getPaginatedItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections", 1, 10, searchQuery, "Literature", "research");
        internalItems = libraryResult.items;
      }
    } catch (e) {
      console.error("Internal search error: " + e.toString());
    }

    return {
      status: 'success',
      external: externalRefs, // Array string HTML citation
      youtube: youtubeUrl,
      internal: internalItems
    };
  } catch (e) {
    return { status: 'error', message: "API Error: " + e.toString() };
  }
}

/**
 * Fetch Citations from OpenAlex API
 * FORCE POLITE POOL & HTML LINK FORMATTING
 */
function fetchOpenAlexByQuery(query) {
  if (!query || query.trim() === "") return [];
  
  try {
    // Inject mailto directly into URL to guarantee polite pool access
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=10&mailto=team@xeenaps.app`;
    
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) return [];
    
    const data = JSON.parse(response.getContentText());
    const results = data.results || [];
    
    return results.map(item => {
      const authors = (item.authorships || []).map(a => a.author.display_name);
      let authorStr = authors.length > 2 
        ? authors[0] + " et al." 
        : (authors.join(" and ") || "Anon.");
        
      const year = item.publication_year || "n.d.";
      const itemTitle = item.title || item.display_name || "Untitled";
      const journal = item.primary_location?.source?.display_name || "Academic Source";
      
      // Clean and sanitize URL
      let linkUrl = item.doi || item.ids?.openalex || "";
      if (linkUrl) {
        linkUrl = linkUrl.replace(/['"]+/g, '').trim(); 
      }

      // Assemble Harvard Citation with Clickable Link
      let bib = `${authorStr} (${year}). '${itemTitle}'. <i>${journal}</i>.`;
      
      if (linkUrl) {
         // TRICK: Inject hidden clean URL first so frontend regex captures it cleanly without quotes
         bib += "<span style='display:none'>" + linkUrl + "</span>";
         // Then append the visual link
         bib += " <a href=\"" + linkUrl + "\" target=\"_blank\" style=\"text-decoration:underline; color:#004A74; font-weight:bold;\"></a>";
      }
      
      return bib.replace(/—/g, '-').trim();
    });
  } catch (e) {
    console.error("OpenAlex search failed: " + e.toString());
    return [];
  }
}

/**
 * Fetch Citations from Crossref API (Backup Source)
 * Changed query.bibliographic to query (Broader search) & HTML LINK FORMATTING
 */
function fetchCrossrefByQuery(query) {
  if (!query || query.trim() === "") return [];

  try {
    // Use general 'query' parameter instead of 'query.bibliographic' for broader matches
    // Inject mailto for polite pool
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10&sort=relevance&select=DOI,title,author,issued,container-title,URL&mailto=team@xeenaps.app`;
    
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) return [];

    const data = JSON.parse(response.getContentText());
    const items = data.message?.items || [];

    return items.map(item => {
      const authors = (item.author || []).map(a => (a.given ? a.given + " " : "") + (a.family || ""));
      let authorStr = authors.length > 2 
        ? authors[0] + " et al." 
        : (authors.join(" and ") || "Anon.");

      let year = "n.d.";
      if (item.issued && item.issued['date-parts'] && item.issued['date-parts'][0]) {
        year = item.issued['date-parts'][0][0];
      }

      const itemTitle = (item.title && item.title[0]) ? item.title[0] : "Untitled";
      const journal = (item['container-title'] && item['container-title'][0]) ? item['container-title'][0] : "Crossref Source";
      const doi = item.DOI || "";
      
      // Construct and sanitize URL
      let linkUrl = doi ? `https://doi.org/${doi}` : (item.URL || "");
      if (linkUrl) {
        linkUrl = linkUrl.replace(/['"]+/g, '').trim();
      }

      // Assemble Harvard Citation with Clickable Link
      let bib = `${authorStr} (${year}). '${itemTitle}'. <i>${journal}</i>.`;
      
      if (linkUrl) {
         // TRICK: Inject hidden clean URL first so frontend regex captures it cleanly without quotes
         bib += "<span style='display:none'>" + linkUrl + "</span>";
         // Then append the visual link
         bib += " <a href=\"" + linkUrl + "\" target=\"_blank\" style=\"text-decoration:underline; color:#004A74; font-weight:bold;\"></a>";
      }

      return bib.replace(/—/g, '-').trim();
    });
  } catch (e) {
    console.error("Crossref search failed: " + e.toString());
    return [];
  }
}
