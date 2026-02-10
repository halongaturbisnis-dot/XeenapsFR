
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCcw, 
  Maximize2, 
  Loader2,
  X,
  Languages,
  BrainCog
} from 'lucide-react';
import { TracerProject, BrainstormingItem } from '../../../types';
import { refineTracerField, translateTracerField } from '../../../services/TracerService';
import { showXeenapsToast } from '../../../utils/toastUtils';
import BrainstormingPicker from '../Brainstorming/BrainstormingPicker';

interface TracerFieldProps {
  label: React.ReactNode;
  value: string;
  fieldKey: keyof TracerProject; 
  context: TracerProject; 
  onChange: (val: string) => void;
  onSave?: (val: string) => void;
  className?: string;
  isDark?: boolean;
  placeholder?: string;
  minHeight?: string;
}

const TracerField: React.FC<TracerFieldProps> = ({
  label,
  value,
  fieldKey,
  context,
  onChange,
  onSave,
  className = "",
  isDark = false,
  placeholder = "...",
  minHeight = "100px"
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBrainstormingPickerOpen, setIsBrainstormingPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMagicAction = async (mode: 'REWRITE' | 'EXPAND') => {
    setIsMenuOpen(false);
    setIsLoading(true);
    
    try {
      const result = await refineTracerField(fieldKey as string, value, context, mode);
      if (result) {
        onChange(result);
        if (onSave) onSave(result);
      }
    } catch (e) {
      showXeenapsToast('error', `Failed to process content.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (lang: 'en' | 'id') => {
    setIsMenuOpen(false);
    setIsLoading(true);
    try {
       const result = await translateTracerField(value, lang);
       if (result) {
         onChange(result);
         if (onSave) onSave(result);
       }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getBrainstormingKey = (tracerKey: string): keyof BrainstormingItem | null => {
    if (tracerKey === 'title') return 'proposedTitle';
    if (tracerKey === 'problemStatement') return 'problemStatement';
    if (tracerKey === 'researchGap') return 'researchGap';
    if (tracerKey === 'researchQuestion') return 'researchQuestion';
    if (tracerKey === 'methodology') return 'methodology';
    if (tracerKey === 'population') return 'population';
    return null;
  };

  const handleImportFromBrainstorming = (source: BrainstormingItem) => {
    setIsBrainstormingPickerOpen(false);
    const sourceKey = getBrainstormingKey(fieldKey as string);
    if (!sourceKey) {
       showXeenapsToast('warning', 'No matching field in Brainstorming.');
       return;
    }
    
    const sourceVal = source[sourceKey];
    if (sourceVal && typeof sourceVal === 'string') {
      onChange(sourceVal);
      if (onSave) onSave(sourceVal);
      showXeenapsToast('success', `Imported from ${source.label}`);
    } else {
      showXeenapsToast('info', 'Source field is empty.');
    }
  };

  return (
    <div className="space-y-3 relative group/field">
      <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-[#004A74]'}`}>
        {label}
      </label>

      {isBrainstormingPickerOpen && (
        <BrainstormingPicker 
           onClose={() => setIsBrainstormingPickerOpen(false)}
           onSelect={handleImportFromBrainstorming}
        />
      )}

      <div className="relative">
        {!isLoading && (
          <div className="absolute top-2 right-2 z-20" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-xl transition-all shadow-sm active:scale-90 opacity-0 group-hover/field:opacity-100 ${
                isMenuOpen ? 'opacity-100' : ''
              } ${
                isDark 
                  ? 'bg-white/10 text-white hover:bg-white hover:text-[#004A74]' 
                  : 'bg-white border border-gray-100 text-[#004A74] hover:bg-[#FED400]/20'
              }`}
              title="AI Co-Pilot & Tools"
              type="button"
            >
              <Sparkles size={14} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-30 animate-in fade-in zoom-in-95 origin-top-right">
                <div className="p-2 border-b border-gray-50 mb-1 flex justify-between items-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Co-Pilot Actions</p>
                  <button onClick={() => setIsMenuOpen(false)}><X size={12} className="text-gray-300 hover:text-red-400"/></button>
                </div>
                <button
                  onClick={() => handleMagicAction('REWRITE')}
                  className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                  type="button"
                >
                  <RefreshCcw size={12} /> Regenerate (Rewrite)
                </button>
                <button
                  onClick={() => handleMagicAction('EXPAND')}
                  className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                  type="button"
                >
                  <Maximize2 size={12} /> Expand & Deepen
                </button>
                
                <div className="h-px bg-gray-50 my-1" />
                <p className="px-3 py-1 text-[8px] font-black text-gray-300 uppercase tracking-widest">Translation</p>
                <button onClick={() => handleTranslate('en')} className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg flex items-center gap-2">
                   <Languages size={12} /> To English
                </button>
                <button onClick={() => handleTranslate('id')} className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg flex items-center gap-2">
                   <Languages size={12} /> To Indonesian
                </button>

                <div className="h-px bg-gray-50 my-1" />
                <button 
                  onClick={() => { setIsMenuOpen(false); setIsBrainstormingPickerOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                  type="button"
                >
                   <BrainCog size={12} className="text-purple-500" /> Import from Idea
                </button>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
             <div className="flex items-center gap-2 px-4 py-2 bg-white shadow-lg rounded-full border border-gray-100">
                <Loader2 size={14} className="animate-spin text-[#004A74]" />
                <span className="text-[9px] font-black text-[#004A74] uppercase tracking-widest">Processing...</span>
             </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className={`${className} min-h-[${minHeight}]`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onFocus={adjustHeight}
          rows={1}
        />
      </div>
    </div>
  );
};

export default TracerField;
