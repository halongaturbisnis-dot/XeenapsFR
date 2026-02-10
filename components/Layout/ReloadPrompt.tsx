import React from 'react';
// @ts-ignore - Virtual module from vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/90 backdrop-blur-xl border border-gray-200 p-5 rounded-[2rem] shadow-2xl flex items-start gap-4">
        <div className="w-10 h-10 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <ArrowPathIcon className="w-5 h-5 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
           <h4 className="text-sm font-black text-[#004A74] uppercase tracking-tight mb-1">New Version Available</h4>
           <p className="text-[10px] font-medium text-gray-500 leading-relaxed">
             New content available, click on reload button to update.
           </p>
           <div className="flex items-center gap-3 mt-3">
              <button 
                onClick={() => updateServiceWorker(true)}
                className="px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md hover:scale-105 transition-all"
              >
                Reload
              </button>
              <button 
                onClick={close}
                className="px-4 py-2 bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all"
              >
                Close
              </button>
           </div>
        </div>
        <button onClick={close} className="text-gray-400 hover:text-red-500 transition-colors">
           <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;