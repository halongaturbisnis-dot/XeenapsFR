
import { SPREADSHEET_CONFIG } from '../assets';
import { VipAdItem } from '../types';

export const fetchVipAd = async (): Promise<VipAdItem | null> => {
  try {
    const response = await fetch(SPREADSHEET_CONFIG.VIP_ADS_CSV);
    if (!response.ok) {
      throw new Error('Failed to fetch ads');
    }
    const csvText = await response.text();
    
    // Simple CSV parser for this specific structure
    // Expected Columns: 
    // 0: No, 1: Status, 2: Category, 3: CollaboratorName, 4: StartDate, 
    // 5: Duration, 6: EndDate, 7: Image, 8: CTALink
    
    const parseRow = (row: string) => {
      const cols: string[] = [];
      let currentVal = '';
      let inQuote = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (inQuote && row[i+1] === '"') {
             currentVal += '"';
             i++;
          } else {
             inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          cols.push(currentVal);
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      cols.push(currentVal);
      return cols.map(c => c.trim().replace(/^"|"$/g, ''));
    };

    const rows = csvText.split(/\r?\n/).filter(row => row.trim().length > 0);
    // Skip Header (Row 0)
    
    // Iterate BACKWARDS to find the latest ACTIVE ad
    for (let i = rows.length - 1; i >= 1; i--) {
      const cols = parseRow(rows[i]);
      if (cols.length >= 9) {
        const status = cols[1]?.toUpperCase();
        if (status === 'ACTIVE') {
          return {
            imageUrl: cols[7],
            ctaLink: cols[8]
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Ad Service Error:", error);
    return null;
  }
};
