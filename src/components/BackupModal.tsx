import React, { useState, useEffect, useRef } from 'react';
import { Download, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchBackupData, downloadBackup, markBackupDone, BackupData } from '../backupService';

interface BackupModalProps {
  assistenciaId: string;
  onClose: () => void;
}

export default function BackupModal({ assistenciaId, onClose }: BackupModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const didRun = useRef(false);

  const handleBackup = async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchBackupData(assistenciaId);
      if (data) {
        downloadBackup(data);
        markBackupDone(assistenciaId);
        setStatus('success');
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        throw new Error('Falha ao obter dados para backup.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar backup.');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!didRun.current) {
      didRun.current = true;
      handleBackup();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 duration-300">
        <div className="bg-blue-600 p-6 text-white text-center relative">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Backup Automático Diário</h2>
          <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest opacity-80">Segurança dos seus dados</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
              Iniciando o salvamento automático do seu backup de hoje para manter suas ordens de serviço e cadastros sempre seguros.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide mt-2">
              Basta autorizar ou salvar o arquivo em seu dispositivo.
            </p>
          </div>

          {status === 'loading' && (
            <div className="py-4 text-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">Processando e baixando dados...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 text-center text-emerald-600 animate-in zoom-in-90">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-black uppercase tracking-widest">Download Iniciado!</p>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold">A tela será fechada em instantes.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
              <button
                onClick={handleBackup}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-sm"
              >
                Tentar Backup Novamente
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-[10px] font-black text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 uppercase tracking-widest underline transition-colors"
            >
              Fechar ou Continuar sem salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
