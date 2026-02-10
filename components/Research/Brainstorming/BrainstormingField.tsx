
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCcw, 
  Maximize2, 
  Loader2,
  X
} from 'lucide-react';
import { BrainstormingItem } from '../../../types';
import { refineBrainstormingField } from '../../../services/BrainstormingService';
import { showXeenapsToast } from '../../../utils/toastUtils';

interface BrainstormingFieldProps {
  label: React.ReactNode;
  value: string;
  fieldKey: keyof BrainstormingItem; // The actual key in the data object
  context: BrainstormingItem; // The full object for context
  onChange: (val: string) => void;
  onSave?: (val: string) => void; // Optional trigger for auto-save
  className?: string; // Custom class for textarea styling
  isDark?: boolean; // For fields with dark background (like Gap)
  placeholder?: string;
  minHeight?: string;
}

const BrainstormingField: React.FC<BrainstormingFieldProps> = ({
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
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic extracted here for encapsulation
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
    
    // Toast handled by service or here? Let's do generic feedback here.
    const modeLabel = mode === 'REWRITE' ? 'Rewriting' : 'Expanding';
    
    try {
      const result = await refineBrainstormingField(fieldKey as string, value, context, mode);
      if (result) {
        onChange(result);
        if (onSave) onSave(result); // Trigger auto-save if provided
      }
    } catch (e) {
      console.error(e);
      showXeenapsToast('error', `Failed to ${modeLabel.toLowerCase()} content.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 relative group/field">
      {/* Label */}
      <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-[#004A74]'}`}>
        {label}
      </label>

      <div className="relative">
        {/* Magic Button (Absolute Top Right) */}
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
              title="AI Co-Pilot"
              type="button"
            >
              <Sparkles size={14} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-30 animate-in fade-in zoom-in-95 origin-top-right">
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
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
             <div className="flex items-center gap-2 px-4 py-2 bg-white shadow-lg rounded-full border border-gray-100">
                <Loader2 size={14} className="animate-spin text-[#004A74]" />
                <span className="text-[9px] font-black text-[#004A74] uppercase tracking-widest">Thinking...</span>
             </div>
          </div>
        )}

        {/* Textarea */}
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

export default BrainstormingField;
