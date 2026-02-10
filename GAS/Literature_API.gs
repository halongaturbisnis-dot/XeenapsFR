
/**
 * XEENAPS PKM - GLOBAL LITERATURE SEARCH PROXY (SEMANTIC SCHOLAR, OPENALEX, CROSSREF & CORE EDITION)
 * Memproses pencarian ke berbagai sumber akademik dengan prioritas kualitas data.
 */

function handleGlobalArticleSearch(params) {
  const query = params.query || "";
  const yearStart = params.yearStart;
  const yearEnd = params.yearEnd;

  // 1. TERJEMAHAN OTOMATIS VIA LINGVA (Target: EN)
  let searchTerms = query;
  try {
    const translated = lingvaTranslateQuery(query);
    if (translated) {
      searchTerms = translated;
    }
  } catch (e) {
    console.log("Lingva Engine Error: " + e.toString());
  }

  // 2. PENYUSUNAN PARAMETER
  let limit = params.limit || 12;
  
  // A. OPENALEX REQUEST
  let openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerms)}&per_page=${limit}`;
  if (yearStart && yearEnd) {
    openAlexUrl += `&filter=publication_year:${yearStart}-${yearEnd}`;
  } else if (yearStart) {
    openAlexUrl += `&filter=publication_year:${yearStart}-2026`;
  }
  
  const reqOpenAlex = {
    url: openAlexUrl,
    muteHttpExceptions: true,
    headers: { "Accept": "application/json" }
  };

  // B. CROSSREF REQUEST
  let crossrefUrl = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(searchTerms)}&rows=${limit}&sort=relevance&select=DOI,title,subtitle,original-title,author,published-print,published-online,container-title,abstract,is-referenced-by-count,URL`;
  
  if (yearStart) {
    let dateFilter = `from-pub-date:${yearStart}-01-01`;
    if (yearEnd) {
      dateFilter += `,until-pub-date:${yearEnd}-12-31`;
    }
    crossrefUrl += `&filter=${dateFilter}`;
  }

  const reqCrossref = {
    url: crossrefUrl,
    muteHttpExceptions: true
  };

  // C. CORE API REQUEST
  const coreKey = getCoreApiKey();
  let reqCore = null;
  
  if (coreKey) {
    let corePayload = {
      "q": searchTerms,
      "limit": limit
    };
    if (yearStart) corePayload["year_from"] = parseInt(yearStart);
    if (yearEnd) corePayload["year_to"] = parseInt(yearEnd);

    reqCore = {
      url: "https://api.core.ac.uk/v3/search/works",
      method: "POST",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + coreKey },
      payload: JSON.stringify(corePayload),
      muteHttpExceptions: true
    };
  }

  // D. SEMANTIC SCHOLAR REQUEST (NEW - HIGH QUALITY SOURCE)
  // Fields: paperId, title, authors, year, venue, externalIds (DOI), citationCount, abstract, openAccessPdf
  let s2Url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchTerms)}&limit=${limit}&fields=paperId,title,authors,year,venue,externalIds,citationCount,abstract,openAccessPdf`;
  if (yearStart || yearEnd) {
    s2Url += `&year=${yearStart || ''}-${yearEnd || ''}`;
  }
  
  const reqSemantic = {
    url: s2Url,
    muteHttpExceptions: true
  };

  try {
    // 3. PARALLEL FETCHING (S2 + OA + CR + Core)
    const requests = [reqOpenAlex, reqCrossref, reqSemantic];
    if (reqCore) requests.push(reqCore);

    const responses = UrlFetchApp.fetchAll(requests);
    
    // --- PROCESS OPENALEX RESULTS ---
    let oaResults = [];
    if (responses[0].getResponseCode() === 200) {
      try {
        const resultOA = JSON.parse(responses[0].getContentText());
        oaResults = (resultOA.results || []).map(item => ({
          paperId: item.id,
          title: item.display_name || "Untitled",
          authors: (item.authorships || []).map(a => ({ name: a.author.display_name })),
          year: item.publication_year || null,
          doi: item.doi ? item.doi.replace('https://doi.org/', '') : "",
          url: item.doi || item.ids?.openalex || "",
          venue: item.primary_location?.source?.display_name || "Academic Source",
          citationCount: item.cited_by_count || 0,
          abstract: "" 
        }));
      } catch (e) { console.log("OA parse error: " + e.toString()); }
    }

    // --- PROCESS CROSSREF RESULTS ---
    let crResults = [];
    if (responses[1].getResponseCode() === 200) {
      try {
        const resultCR = JSON.parse(responses[1].getContentText());
        if (resultCR.message && resultCR.message.items) {
          crResults = resultCR.message.items.map(mapCrossrefData);
        }
      } catch (e) {
        console.log("Crossref parse error: " + e.toString());
      }
    }

    // --- PROCESS SEMANTIC SCHOLAR RESULTS (NEW) ---
    let s2Results = [];
    if (responses[2].getResponseCode() === 200) {
      try {
        const resultS2 = JSON.parse(responses[2].getContentText());
        if (resultS2.data) {
          s2Results = resultS2.data.map(mapSemanticScholarData);
        }
      } catch (e) {
        console.log("S2 parse error: " + e.toString());
      }
    }

    // --- PROCESS CORE RESULTS ---
    let coreResults = [];
    // CORE response is at index 3 if reqCore exists
    if (reqCore && responses[3] && responses[3].getResponseCode() === 200) {
      try {
        const resultCore = JSON.parse(responses[3].getContentText());
        if (resultCore.results) {
          coreResults = resultCore.results.map(mapCoreData);
        }
      } catch (e) {
        console.log("CORE parse error: " + e.toString());
      }
    }

    // 4. SMART AGGREGATION & STRICT FILTERING
    // Priority: Semantic Scholar > OpenAlex > CORE > Crossref
    // Logic: Use Map to deduplicate by DOI. If DOI missing, allow it but filtered aggressively.

    const finalResults = [];
    const seenDois = new Set();
    const seenTitles = new Set(); // Normalized title check

    const addToResults = (item, sourceName) => {
      // STRICT FILTER: Validate Title & Authors
      if (!isValidItem(item)) return;

      const normDOI = item.doi ? item.doi.toLowerCase().trim() : null;
      const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);

      // Check Duplicates
      if (normDOI && seenDois.has(normDOI)) return;
      if (!normDOI && seenTitles.has(normTitle)) return; // Avoid same title if no DOI

      // Add to list
      finalResults.push(item);
      
      // Mark as seen
      if (normDOI) seenDois.add(normDOI);
      if (normTitle) seenTitles.add(normTitle);
    };

    // Sequence by Quality Priority
    s2Results.forEach(i => addToResults(i, 'S2'));
    oaResults.forEach(i => addToResults(i, 'OA'));
    coreResults.forEach(i => addToResults(i, 'CORE'));
    crResults.forEach(i => addToResults(i, 'CR'));

    return { 
      status: 'success', 
      data: finalResults,
      translatedQuery: searchTerms !== query ? searchTerms : null
    };
  } catch (err) {
    return { status: 'error', message: 'Literature Search Proxy Error: ' + err.toString() };
  }
}

/**
 * STRICT FILTERING HELPER
 * Menolak item jika judul kosong, terlalu pendek, atau berisi kata kunci administratif (sampah).
 */
function isValidItem(item) {
  if (!item.title) return false;
  
  const title = item.title.trim();
  if (title.length < 5) return false;
  if (title.toLowerCase() === 'untitled') return false;

  // Filter kata kunci administratif yang sering muncul di Crossref
  const garbagePhrases = [
    /^front matter/i,
    /^back matter/i,
    /^volume\s?\d+/i,
    /^issue\s?information/i,
    /^table of contents/i,
    /^editorial board/i,
    /^masthead/i,
    /^author index/i,
    /^subject index/i,
    /^books received/i,
    /^erratum/i,
    /^corrigendum/i
  ];

  if (garbagePhrases.some(regex => regex.test(title))) return false;

  // Filter jika tidak ada author sama sekali (optional, tapi meningkatkan kualitas)
  // Kita beri toleransi jika sumbernya S2 atau OA karena kadang data author incomplete tapi paper valid
  // Untuk Crossref, strict check author.
  if ((!item.authors || item.authors.length === 0) && item.paperId.startsWith('cr_')) {
      // Cek apakah judul sangat generik
      if (title.split(' ').length < 3) return false; 
  }

  return true;
}

/**
 * NEW: handleGlobalBookSearch - Multi-Source Aggregator
 */
function handleGlobalBookSearch(params) {
  const query = params.query || "";
  const yearStart = params.yearStart;
  const yearEnd = params.yearEnd;
  let limit = params.limit || 12;

  const cleanQuery = query.replace(/[-\s]/g, "");
  const isISBN = /^(97(8|9))?\d{9}(\d|X)$/i.test(cleanQuery);

  let requests = [];

  // --- SOURCE 1: OPEN LIBRARY ---
  let olUrl = "";
  if (isISBN) {
    olUrl = `https://openlibrary.org/search.json?isbn=${cleanQuery}&limit=${limit}`;
  } else {
    const searchTerms = query.trim();
    olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerms)}&limit=${limit}`;
    if (yearStart && yearEnd) {
      olUrl += `&first_publish_year:[${yearStart}+TO+${yearEnd}]`;
    }
  }
  requests.push({ url: olUrl, muteHttpExceptions: true, type: 'OL' });

  // --- SOURCE 2: GOOGLE BOOKS ---
  let gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${isISBN ? 'isbn:' + cleanQuery : encodeURIComponent(query)}&maxResults=${limit}&printType=books`;
  requests.push({ url: gbUrl, muteHttpExceptions: true, type: 'GB' });

  // --- SOURCE 3: GUTENDEX ---
  if (!isISBN) {
    let gutUrl = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
    requests.push({ url: gutUrl, muteHttpExceptions: true, type: 'GD' });
  }

  try {
    const responses = UrlFetchApp.fetchAll(requests);
    let combinedResults = [];

    // PROCESS: OPEN LIBRARY
    if (responses[0].getResponseCode() === 200) {
      try {
        const olData = JSON.parse(responses[0].getContentText());
        const olMapped = (olData.docs || []).map(item => ({
          paperId: item.key,
          title: item.title || "Untitled Book",
          authors: (item.author_name || []).map(name => ({ name })),
          year: item.first_publish_year || null,
          isbn: (item.isbn || [])[0] || "",
          url: `https://openlibrary.org${item.key}`,
          venue: (item.publisher || [])[0] || "Open Library",
          citationCount: 0,
          abstract: ""
        }));
        combinedResults = combinedResults.concat(olMapped);
      } catch (e) {}
    }

    // PROCESS: GOOGLE BOOKS
    if (responses[1].getResponseCode() === 200) {
      try {
        const gbData = JSON.parse(responses[1].getContentText());
        const gbMapped = (gbData.items || []).map(item => mapGoogleBooksData(item));
        const gbFiltered = gbMapped.filter(b => {
          if (!yearStart && !yearEnd) return true;
          const y = parseInt(b.year);
          if (!y) return true;
          return (!yearStart || y >= parseInt(yearStart)) && (!yearEnd || y <= parseInt(yearEnd));
        });
        combinedResults = combinedResults.concat(gbFiltered);
      } catch (e) {}
    }

    // PROCESS: GUTENDEX
    if (!isISBN && responses[2] && responses[2].getResponseCode() === 200) {
      try {
        const gdData = JSON.parse(responses[2].getContentText());
        const gdMapped = (gdData.results || []).slice(0, limit).map(item => mapGutendexData(item));
        combinedResults = combinedResults.concat(gdMapped);
      } catch (e) {}
    }

    const uniqueResults = [];
    const titlesSeen = new Set();
    
    for (const item of combinedResults) {
      const normTitle = item.title.toLowerCase().trim().substring(0, 30);
      if (!titlesSeen.has(normTitle)) {
        uniqueResults.push(item);
        titlesSeen.add(normTitle);
      }
    }

    return { status: 'success', data: uniqueResults };

  } catch (err) {
    return { status: 'error', message: 'Multi-Source Search Error: ' + err.toString() };
  }
}

// --- HELPER MAPPERS ---

function getCoreApiKey() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName("Core");
    if (!sheet) return null;
    return sheet.getRange("A1").getValue();
  } catch (e) {
    return null;
  }
}

// MAPPER: Semantic Scholar (Kualitas Tinggi)
function mapSemanticScholarData(item) {
  const title = item.title || "Untitled";
  const authors = (item.authors || []).map(a => ({ name: a.name }));
  const year = item.year || null;
  const doi = item.externalIds ? item.externalIds.DOI : "";
  const venue = item.venue || "Semantic Scholar";
  const abstract = item.abstract || "";
  
  // Prioritize OpenAccess PDF, then DOI link, then S2 link
  let url = item.openAccessPdf ? item.openAccessPdf.url : null;
  if (!url && doi) url = `https://doi.org/${doi}`;
  if (!url) url = `https://www.semanticscholar.org/paper/${item.paperId}`;

  return {
    paperId: `s2_${item.paperId}`,
    title: title,
    authors: authors,
    year: year,
    doi: doi || "",
    url: url,
    venue: venue,
    citationCount: item.citationCount || 0,
    abstract: abstract
  };
}

function mapCoreData(item) {
  const title = item.title || "Untitled";
  const authors = (item.authors || []).map(a => ({ name: a.name }));
  const year = item.yearPublished || null;
  const doi = item.doi || "";
  const abstract = item.abstract || "";
  
  const url = item.downloadUrl || (item.links && item.links.length > 0 ? item.links[0] : "") || (doi ? `https://doi.org/${doi}` : "");
  
  let venue = "CORE Repository";
  if (item.journals && item.journals.length > 0) venue = item.journals[0].title || venue;
  else if (item.publisher) venue = item.publisher;

  return {
    paperId: `core_${item.id}`,
    title: title,
    authors: authors,
    year: year,
    doi: doi,
    url: url,
    venue: venue,
    citationCount: 0,
    abstract: abstract,
    pdfUrl: item.downloadUrl
  };
}

function mapCrossrefData(item) {
  // IMPROVED: Title Fallback Logic
  // Cek title[0], lalu subtitle[0], lalu original-title[0]
  let title = "Untitled";
  if (item.title && item.title.length > 0 && item.title[0]) {
    title = item.title[0];
  } else if (item.subtitle && item.subtitle.length > 0 && item.subtitle[0]) {
    title = item.subtitle[0];
  } else if (item['original-title'] && item['original-title'].length > 0 && item['original-title'][0]) {
    title = item['original-title'][0];
  }
  
  // Authors
  const authors = (item.author || []).map(a => ({
    name: (a.given ? a.given + " " : "") + (a.family || "")
  }));

  // Year
  let year = null;
  if (item['published-print'] && item['published-print']['date-parts']) {
    year = item['published-print']['date-parts'][0][0];
  } else if (item['published-online'] && item['published-online']['date-parts']) {
    year = item['published-online']['date-parts'][0][0];
  }

  // Abstract Clean
  let abstract = item.abstract || "";
  if (abstract) {
    abstract = abstract.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  return {
    paperId: item.DOI || `cr_${Math.random().toString(36).substr(2, 9)}`,
    title: title,
    authors: authors,
    year: year,
    doi: item.DOI || "",
    url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
    venue: (item['container-title'] && item['container-title'].length > 0) ? item['container-title'][0] : "Crossref Source",
    citationCount: item['is-referenced-by-count'] || 0,
    abstract: abstract
  };
}

function mapGoogleBooksData(item) {
  const info = item.volumeInfo || {};
  let isbn = "";
  if (info.industryIdentifiers) {
    const isbnObj = info.industryIdentifiers.find(id => id.type === "ISBN_13") || info.industryIdentifiers[0];
    if (isbnObj) isbn = isbnObj.identifier;
  }
  
  return {
    paperId: item.id,
    title: info.title || "Untitled Volume",
    authors: (info.authors || []).map(name => ({ name })),
    year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
    isbn: isbn,
    url: info.previewLink || info.infoLink || "",
    venue: "Google Books",
    citationCount: 0,
    abstract: info.description ? info.description.substring(0, 200) + "..." : ""
  };
}

function mapGutendexData(item) {
  let url = "";
  if (item.formats && item.formats['text/html']) url = item.formats['text/html'];
  else if (item.formats && item.formats['application/epub+zip']) url = item.formats['application/epub+zip'];
  
  return {
    paperId: `gutendex_${item.id}`,
    title: item.title || "Classic Literature",
    authors: (item.authors || []).map(a => ({ name: a.name.replace(/,/, '') })),
    year: null,
    isbn: "",
    url: url || `https://www.gutenberg.org/ebooks/${item.id}`,
    venue: "Project Gutenberg",
    citationCount: item.download_count || 0,
    abstract: "Public Domain Classic Literature"
  };
}

function lingvaTranslateQuery(text) {
  if (!text) return "";
  
  const instances = [
    "https://lingva.ml/api/v1/auto/en/",
    "https://lingva.garudalinux.org/api/v1/auto/en/",
    "https://lingva.lunar.icu/api/v1/auto/en/"
  ];

  for (let baseUrl of instances) {
    try {
      const url = baseUrl + encodeURIComponent(text);
      const res = UrlFetchApp.fetch(url, { 
        muteHttpExceptions: true, 
        timeoutInSeconds: 10 
      });
      
      if (res.getResponseCode() === 200) {
        const json = JSON.parse(res.getContentText());
        return json.translation || text;
      }
    } catch (e) {
      console.log("Instance failure: " + baseUrl);
    }
  }
  return text; 
}
