
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LibraryItem, LibraryType, FileFormat, SourceType } from '../../types';
import { 
  XMarkIcon, 
  ArrowLeftIcon, 
  BookOpenIcon, 
  LinkIcon, 
  TagIcon,
  TrashIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  PresentationChartBarIcon,
  AcademicCapIcon,
  ShareIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  LightBulbIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon,
  BookmarkIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { 
  fetchFileContent, 
  generateCitations, 
  generateInsight, 
  translateInsightSection
} from '../../services/gasService';
import { 
  upsertLibraryItemToSupabase, 
  deleteLibraryItemFromSupabase 
} from '../../services/LibrarySupabaseService';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import ContentManagerModal from './ContentManagerModal';
import ConsultationChatModal from '../Consultation/ConsultationChatModal';
import SharboxWorkflowModal from '../Sharbox/SharboxWorkflowModal';
import RelatedPresentations from '../Presenter/RelatedPresentations';
import RelatedQuestion from '../QuestionBank/RelatedQuestion';
import { FormDropdown, FormField } from '../Common/FormComponents';
import { Loader2, Copy } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

// --- SHARED LOCAL COMPONENTS ---

const CitationModal: React.FC<{ item: LibraryItem; onClose: () => void }> = ({ item, onClose }) => {
  const [style, setStyle] = useState('Harvard');
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState<{ parenthetical: string; narrative: string; bibliography: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editableParenthetical, setEditableParenthetical] = useState('');
  const [editableNarrative, setEditableNarrative] = useState('');
  const [editableBibliography, setEditableBibliography] = useState('');

  const styles = ['Harvard', 'APA 7th Edition', 'IEEE', 'Chicago', 'Vancouver', 'MLA 9th Edition'];
  const languages = ['English', 'Indonesian', 'French', 'German', 'Dutch'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateCitations(item, style, language);
      if (result) {
        setResults(result);
        setEditableParenthetical(result.parenthetical);
        setEditableNarrative(result.narrative);
        setEditableBibliography(result.bibliography);
      } else {
        showXeenapsToast('error', 'Citation generation failed');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error');
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Citation Copied!');
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative border border-white/20 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><AcademicCapIcon className="w-7 h-7" /></div>
            <div><h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Citation Architect</h3></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><XMarkIcon className="w-8 h-8" /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Style"><FormDropdown value={style} onChange={setStyle} options={styles} placeholder="Select style" allowCustom={false} showSearch={false} /></FormField>
            <FormField label="Language"><FormDropdown value={language} onChange={setLanguage} options={languages} placeholder="Language" allowCustom={false} showSearch={false} /></FormField>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3">
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />} Cite Reference
          </button>
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              <div className="space-y-2"><div className="flex justify-between px-1"><span className="text-[9px] font-black text-gray-400 uppercase">In-Text</span><button onClick={() => copyToClipboard(editableParenthetical)} className="text-[#004A74] hover:scale-110 transition-transform"><Copy size={14} /></button></div><textarea value={editableParenthetical} onChange={e=>setEditableParenthetical(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-[#004A74] outline-none" rows={2}/></div>
              <div className="space-y-2"><div className="flex justify-between px-1"><span className="text-[9px] font-black text-gray-400 uppercase">Bibliography</span><button onClick={() => copyToClipboard(editableBibliography)} className="text-[#004A74] hover:scale-110 transition-transform"><Copy size={14} /></button></div><textarea value={editableBibliography} onChange={e=>setEditableBibliography(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-[#004A74] outline-none" rows={4}/></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TipsModal: React.FC<{ tips: string; onClose: () => void }> = ({ tips, onClose }) => {
  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-all"><XMarkIcon className="w-5 h-5" /></button>
        <div className="flex flex-col items-center text-center space-y-6">
           <div className="w-16 h-16 bg-[#FED400]/20 text-[#004A74] rounded-2xl flex items-center justify-center shadow-inner">
              <LightBulbIcon className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Quick Tips</h3>
           <div className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100 w-full text-left" dangerouslySetInnerHTML={{ __html: tips || "No tips available." }} />
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
  isLoading?: boolean;
  isMobileSidebarOpen?: boolean;
  onRefresh?: () => void;
  onUpdateOptimistic?: (item: LibraryItem) => void;
  onDeleteOptimistic?: (id: string) => void;
  isLocalOverlay?: boolean;
}

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ 
  item, 
  onClose, 
  isLoading: initialLoading, 
  isMobileSidebarOpen, 
  onRefresh, 
  onUpdateOptimistic,
  onDeleteOptimistic,
  isLocalOverlay
}) => {
  const navigate = useNavigate();
  const [currentItem, setCurrentItem] = useState<LibraryItem>(item);
  const [activeTab, setActiveTab] = useState<'info' | 'insight'>('info');
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [relatedView, setRelatedView] = useState<'presentation' | 'question' | null>(null);

  // Insight States
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  // Load Insights (Sharded JSON) when tab switches to 'insight'
  useEffect(() => {
    if (activeTab === 'insight' && currentItem.insightJsonId) {
      const loadInsights = async () => {
        setIsInsightsLoading(true);
        try {
          const data = await fetchFileContent(currentItem.insightJsonId, currentItem.storageNodeUrl);
          if (data) {
             setCurrentItem(prev => ({ ...prev, ...data }));
          }
        } catch(e) {
          console.error("Error loading insights", e);
        } finally {
          setIsInsightsLoading(false);
        }
      };
      // Only load if not already populated in memory
      if (!currentItem.summary && !currentItem.strength) {
        loadInsights();
      }
    }
  }, [activeTab, currentItem.insightJsonId]);

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const result = await generateInsight(currentItem);
      if (result) {
         const updated = { ...currentItem, ...result };
         setCurrentItem(updated);
         if (onUpdateOptimistic) onUpdateOptimistic(updated);
         showXeenapsToast('success', 'Insights Generated');
      } else {
         showXeenapsToast('error', 'Generation failed');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      if (onDeleteOptimistic) onDeleteOptimistic(currentItem.id);
      
      const success = await deleteLibraryItemFromSupabase(currentItem.id);
      if (!success) {
         showXeenapsToast('error', 'Failed to delete on server');
         if (onRefresh) onRefresh(); // Rollback via refresh
      } else {
         onClose();
      }
    }
  };

  const handleToggleProp = async (prop: 'isFavorite' | 'isBookmarked') => {
    const updated = { ...currentItem, [prop]: !currentItem[prop] };
    setCurrentItem(updated);
    if (onUpdateOptimistic) onUpdateOptimistic(updated);
    await upsertLibraryItemToSupabase(updated);
  };

  const handleEdit = () => {
    navigate(`/edit/${currentItem.id}`);
  };

  const renderInsightSection = (title: string, icon: React.ReactNode, content: string | undefined, colorClass: string) => {
    if (!content && !isGeneratingInsights) return null;
    return (
      <div className={`p-6 rounded-[2rem] border ${colorClass} space-y-3`}>
         <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-60">
            {icon} {title}
         </h4>
         {isGeneratingInsights && !content ? (
            <div className="space-y-2 animate-pulse">
               <div className="h-2 w-full bg-current opacity-10 rounded" />
               <div className="h-2 w-3/4 bg-current opacity-10 rounded" />
            </div>
         ) : (
            <div className="text-xs font-medium leading-relaxed opacity-80" dangerouslySetInnerHTML={{ __html: content || '' }} />
         )}
      </div>
    );
  };

  return createPortal(
    <div 
      className={`fixed top-0 right-0 bottom-0 z-[1200] bg-white flex flex-col will-change-transform overflow-hidden transition-all duration-500 animate-in slide-in-from-right shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] ${isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none scale-[0.98]' : ''}`}
      style={{ left: 'var(--sidebar-offset, 0px)' }}
    >
      {/* OVERLAYS */}
      {showCiteModal && <CitationModal item={currentItem} onClose={() => setShowCiteModal(false)} />}
      {showTips && <TipsModal tips={currentItem.quickTipsForYou || ""} onClose={() => setShowTips(false)} />}
      {isShareModalOpen && <SharboxWorkflowModal initialItem={currentItem} onClose={() => setIsShareModalOpen(false)} />}
      {isContentModalOpen && <ContentManagerModal item={currentItem} onClose={() => setIsContentModalOpen(false)} onSuccess={(updated) => { setCurrentItem(updated); if (onUpdateOptimistic) onUpdateOptimistic(updated); }} />}
      {isConsultModalOpen && <ConsultationChatModal collection={currentItem} onClose={() => setIsConsultModalOpen(false)} />}
      
      {/* RELATED VIEWS (FULL OVERLAY) */}
      {relatedView === 'presentation' && (
         <div className="absolute inset-0 z-[1300] bg-white">
            <RelatedPresentations collection={currentItem} onBack={() => setRelatedView(null)} />
         </div>
      )}
      {relatedView === 'question' && (
         <div className="absolute inset-0 z-[1300] bg-white">
            <RelatedQuestion collection={currentItem} onBack={() => setRelatedView(null)} />
         </div>
      )}

      {/* HEADER */}
      <div className="px-6 md:px-10 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all active:scale-90 shadow-sm">
               <ArrowLeftIcon className="w-5 h-5" strokeWidth={3} />
            </button>
            <div className="min-w-0">
               <h2 className="text-sm font-black text-[#004A74] uppercase tracking-widest truncate max-w-[200px]">{currentItem.category}</h2>
            </div>
         </div>
         
         <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-[#004A74] shadow-sm' : 'text-gray-400'}`}>Info</button>
            <button onClick={() => setActiveTab('insight')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insight' ? 'bg-white text-[#004A74] shadow-sm' : 'text-gray-400'}`}>Insights</button>
         </div>

         <div className="flex items-center gap-2">
            <button onClick={() => handleToggleProp('isFavorite')} className="p-2 hover:scale-110 transition-transform">
               {currentItem.isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5 text-gray-300" />}
            </button>
            <button onClick={() => handleToggleProp('isBookmarked')} className="p-2 hover:scale-110 transition-transform">
               {currentItem.isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5 text-gray-300" />}
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button onClick={handleDelete} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
            <button onClick={handleEdit} className="p-2 text-gray-300 hover:text-[#004A74] transition-colors"><PencilIcon className="w-5 h-5" /></button>
         </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#fcfcfc]">
         <div className="max-w-5xl mx-auto space-y-10 pb-32">
            
            {/* MAIN IDENTITY CARD */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#004A74]/5 -translate-y-24 translate-x-24 rounded-full" />
               <div className="relative z-10 space-y-6">
                  <div className="flex flex-wrap gap-2">
                     <span className="px-3 py-1 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-full">{currentItem.topic}</span>
                     {currentItem.subTopic && <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[9px] font-black uppercase tracking-widest rounded-full">{currentItem.subTopic}</span>}
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black text-[#004A74] leading-[1.1] uppercase tracking-tight">{currentItem.title}</h1>
                  <div className="flex flex-col gap-2 pt-2">
                     <p className="text-xs font-bold text-gray-500 uppercase italic tracking-wide">{Array.isArray(currentItem.authors) ? currentItem.authors.join(', ') : 'Unknown Authors'}</p>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{currentItem.publisher} • {currentItem.year}</p>
                  </div>
               </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'info' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6 flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Abstract</h3>
                     <div className="text-sm font-medium text-[#004A74] leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentItem.abstract || 'No abstract available.' }} />
                  </div>

                  {/* IDENTIFIERS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                        { l: 'DOI', v: currentItem.identifiers?.doi },
                        { l: 'ISSN', v: currentItem.identifiers?.issn },
                        { l: 'ISBN', v: currentItem.identifiers?.isbn },
                        { l: 'PMID', v: currentItem.identifiers?.pmid }
                     ].map(id => id.v && (
                        <div key={id.l} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{id.l}</span>
                           <span className="block text-[10px] font-bold text-[#004A74] font-mono truncate">{id.v}</span>
                        </div>
                     ))}
                  </div>

                  {/* ACTIONS GRID */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                     <button onClick={() => window.open(currentItem.url, '_blank')} className="p-5 bg-white border border-gray-100 rounded-[2rem] hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 group">
                        <LinkIcon className="w-8 h-8 text-gray-300 group-hover:text-[#004A74]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Source Link</span>
                     </button>
                     <button onClick={() => setIsContentModalOpen(true)} className="p-5 bg-white border border-gray-100 rounded-[2rem] hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 group">
                        <DocumentTextIcon className="w-8 h-8 text-gray-300 group-hover:text-[#004A74]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{currentItem.extractedJsonId ? 'Manage Content' : 'Add Content'}</span>
                     </button>
                     <button onClick={() => setShowCiteModal(true)} className="p-5 bg-white border border-gray-100 rounded-[2rem] hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 group">
                        <CheckBadgeIcon className="w-8 h-8 text-gray-300 group-hover:text-[#004A74]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Cite This</span>
                     </button>
                     <button onClick={() => setIsShareModalOpen(true)} className="p-5 bg-white border border-gray-100 rounded-[2rem] hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 group">
                        <ShareIcon className="w-8 h-8 text-gray-300 group-hover:text-[#004A74]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Share</span>
                     </button>
                  </div>
               </div>
            )}

            {activeTab === 'insight' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                     <button onClick={() => setIsConsultModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#004A74] text-[#FED400] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all whitespace-nowrap">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> AI Consultation
                     </button>
                     <button onClick={handleGenerateInsights} disabled={isGeneratingInsights} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#004A74] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all whitespace-nowrap">
                        {isGeneratingInsights ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />} Regenerate Analysis
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        {renderInsightSection("Executive Summary", <ClipboardDocumentListIcon className="w-4 h-4" />, currentItem.summary, "bg-white border-gray-100 text-[#004A74]")}
                     </div>
                     {renderInsightSection("Key Strengths", <ClipboardDocumentCheckIcon className="w-4 h-4" />, currentItem.strength, "bg-green-50 border-green-100 text-green-800")}
                     {renderInsightSection("Limitations", <ExclamationTriangleIcon className="w-4 h-4" />, currentItem.weakness, "bg-red-50 border-red-100 text-red-800")}
                     <div className="md:col-span-2">
                        {renderInsightSection("Terminology & Concepts", <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />, currentItem.unfamiliarTerminology, "bg-[#004A74]/5 border-[#004A74]/10 text-[#004A74]")}
                     </div>
                     <div className="md:col-span-2">
                         {currentItem.quickTipsForYou && (
                           <div onClick={() => setShowTips(true)} className="p-6 rounded-[2rem] bg-[#FED400] text-[#004A74] cursor-pointer hover:scale-[1.01] transition-all shadow-xl">
                              <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2"><LightBulbIcon className="w-4 h-4" /> Quick Tips</h4>
                              <p className="text-xs font-bold line-clamp-2">Click to view actionable tips extracted from this document.</p>
                           </div>
                         )}
                     </div>
                  </div>

                  {/* CROSS-MODULE ACTIONS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-100">
                     <button onClick={() => setRelatedView('presentation')} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] text-left hover:shadow-xl hover:border-[#004A74]/30 transition-all group">
                        <div className="w-12 h-12 bg-[#004A74]/5 text-[#004A74] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#004A74] group-hover:text-white transition-colors">
                           <PresentationChartBarIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-[#004A74] uppercase tracking-tight">Presentation Deck</h4>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Create slides from this source</p>
                     </button>
                     <button onClick={() => setRelatedView('question')} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] text-left hover:shadow-xl hover:border-[#004A74]/30 transition-all group">
                        <div className="w-12 h-12 bg-[#004A74]/5 text-[#004A74] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#004A74] group-hover:text-white transition-colors">
                           <AcademicCapIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-[#004A74] uppercase tracking-tight">Question Bank</h4>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Generate quiz items</p>
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>,
    document.body
  );
};

export default LibraryDetailView;
