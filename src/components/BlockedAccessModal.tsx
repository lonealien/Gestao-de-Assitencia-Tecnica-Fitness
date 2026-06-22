
import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface BlockedAccessModalProps {
  message: string;
  title?: string;
  onClose: () => void;
}

export default function BlockedAccessModal(userProps: BlockedAccessModalProps) {
  const { message, title = "Acesso Bloqueado", onClose } = userProps;
  const isExp = message.toLowerCase().includes("expir") || title.toLowerCase().includes("expir") || message.toLowerCase().includes("vencid");
  const displayTitle = isExp && title === "Acesso Bloqueado" ? "Tempo de Acesso Expirado" : title;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-neutral-800 border-2 border-rose-500 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center animate-scaleUp">
        <div className="bg-rose-100 dark:bg-rose-900/30 p-3 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-black uppercase text-rose-900 dark:text-rose-100 mb-2 leading-tight">
          {displayTitle}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-bold mb-6 italic leading-relaxed">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-black py-3 rounded-2xl text-xs uppercase tracking-wider hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
