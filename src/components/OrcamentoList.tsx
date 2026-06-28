import React, { useState } from 'react';
import { Orcamento, AssistenciaTecnica, AppUser, Part, StoreSettings } from '../types';
import { 
  Search, Eye, Trash2, CheckCircle2, XCircle, Clock, FileText, ArrowRightLeft, 
  MapPin, Phone, User, Calendar, DollarSign, Printer, ArrowRight, ClipboardCopy, Info,
  Pencil, FileDown
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { cleanOklabFromStylesheets } from '../utils';

interface OrcamentoListProps {
  orcamentos: Orcamento[];
  assistencias: AssistenciaTecnica[];
  usuarios: AppUser[];
  currentRole: string;
  activeRoleEntityId?: string;
  isReadOnly?: boolean;
  onUpdateOrcamento: (orc: Orcamento) => void;
  onDeleteOrcamento?: (id: string) => void;
  onConvertToOS: (orc: Orcamento) => void;
  onShowBlockedAlert?: (msg: string) => void;
  onEditOrcamento?: (orc: Orcamento) => void;
  storeSettings?: StoreSettings;
}

export default function OrcamentoList({
  orcamentos,
  assistencias,
  usuarios,
  currentRole,
  activeRoleEntityId,
  isReadOnly = false,
  onUpdateOrcamento,
  onDeleteOrcamento,
  onConvertToOS,
  onShowBlockedAlert,
  onEditOrcamento,
  storeSettings
}: OrcamentoListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [orcamentoToPrint, setOrcamentoToPrint] = useState<Orcamento | null>(null);

  const handleGeneratePDF = async () => {
    if (!orcamentoToPrint) return;
    
    const element = document.getElementById('print-section-orc');
    if (!element) return;

    // Save original styles
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;

    // Temporarily override to show entire content without scrolling for complete PDF capture
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    const opt = {
      margin:       10,
      filename:     `orcamento-${orcamentoToPrint.idFormatado}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              --color-neutral-50: #f9fafb !important;
              --color-neutral-100: #f3f4f6 !important;
              --color-neutral-200: #e5e7eb !important;
              --color-neutral-300: #d1d5db !important;
              --color-neutral-400: #9ca3af !important;
              --color-neutral-500: #6b7280 !important;
              --color-neutral-600: #4b5563 !important;
              --color-neutral-700: #374151 !important;
              --color-neutral-800: #1f2937 !important;
              --color-neutral-900: #111827 !important;
              
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-300: #6ee7b7 !important;
              --color-emerald-400: #34d399 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-emerald-800: #065f46 !important;
              --color-emerald-900: #064e3b !important;
 
              --color-red-50: #fef2f2 !important;
              --color-red-100: #fee2e2 !important;
              --color-red-200: #fecaca !important;
              --color-red-300: #fca5a5 !important;
              --color-red-400: #f87171 !important;
              --color-red-500: #ef4444 !important;
              --color-red-600: #dc2626 !important;
              --color-red-700: #b91c1c !important;
              --color-red-800: #991b1b !important;
              --color-red-900: #7f1d1d !important;
            }
          `;
          clonedDoc.head.appendChild(style);
 
          // Deep clean inline styles if they contain oklch
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            if (el.style) {
              const styleKeys = Object.keys(el.style);
              for (const key of styleKeys) {
                try {
                  const val = el.style.getPropertyValue(key);
                  if (val && val.includes('oklch')) {
                    el.style.removeProperty(key);
                  }
                } catch (e) {
                  // Ignore map index keys or non-string issues
                }
              }
            }
          }
        }
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
 
    const restoreStyles = await cleanOklabFromStylesheets();
 
    html2pdf()
      .from(element)
      .set(opt)
      .save()
      .then(() => {
        restoreStyles();
        // Restore original styles
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
      })
      .catch((err: any) => {
        restoreStyles();
        console.error('Erro ao gerar PDF:', err);
        // Restore original styles
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
      });
  };

  // Filter budgets by role and search
  const filteredOrcamentos = orcamentos.filter(orc => {
    // 1. Role boundaries
    if (currentRole === 'TECNICO' && activeRoleEntityId) {
      if (orc.tecnicoId !== activeRoleEntityId) return false;
    }

    // 2. Search query matching
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      orc.clientName.toLowerCase().includes(searchLower) ||
      orc.idFormatado.toLowerCase().includes(searchLower) ||
      orc.equipmentBrand.toLowerCase().includes(searchLower) ||
      orc.equipmentModel.toLowerCase().includes(searchLower) ||
      (orc.clientDocument && orc.clientDocument.toLowerCase().includes(searchLower));

    // 3. Status filter
    const matchesStatus = statusFilter === 'Todos' || orc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orc: Orcamento, newStatus: Orcamento['status']) => {
    if (isReadOnly) {
      onShowBlockedAlert?.("Acesso restrito: Não é permitido modificar o status do orçamento no modo somente leitura.");
      return;
    }
    if (newStatus === 'Aprovado') {
      onConvertToOS(orc);
      setSelectedOrcamento(null);
      return;
    }
    const updated = { ...orc, status: newStatus };
    onUpdateOrcamento(updated);
    if (selectedOrcamento?.id === orc.id) {
      setSelectedOrcamento(updated);
    }
  };

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeClass = (status: Orcamento['status']) => {
    switch (status) {
      case 'Pendente':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800';
      case 'Aprovado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800';
      case 'Reprovado':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
      case 'Transformado em OS':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800';
      case 'Expirado':
        return 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-900/40 dark:text-neutral-400 dark:border-neutral-800';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-4 sm:p-6 rounded-2xl shadow-sm dark:shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-3 text-neutral-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por cliente, código (ORC-XXXX), marca ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-2xl text-sm font-bold focus:outline-none placeholder-neutral-400"
            />
          </div>
          
          {/* Mobile filter selection */}
          <div className="sm:hidden">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1">Filtrar por Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 bg-white text-xs font-bold"
            >
              <option value="Todos">Todos os Orçamentos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Reprovado">Reprovados</option>
              <option value="Transformado em OS">Transformados em OS</option>
              <option value="Expirado">Expirados</option>
            </select>
          </div>
        </div>

        {/* Tab Filters for Desktop */}
        <div className="hidden sm:flex flex-wrap gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-2">
          {['Todos', 'Pendente', 'Aprovado', 'Reprovado', 'Transformado em OS', 'Expirado'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-700 shadow-sm'
                  : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {status}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                {status === 'Todos' 
                  ? orcamentos.length 
                  : orcamentos.filter(o => o.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Budget List Area */}
      {filteredOrcamentos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrcamentos.map((orc) => {
            const hasConverted = orc.status === 'Transformado em OS';
            const tech = usuarios.find(u => u.tecnicoId === orc.tecnicoId);

            return (
              <div 
                key={orc.id} 
                className={`bg-white dark:bg-neutral-800 border-2 rounded-2xl p-5 shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                  hasConverted 
                    ? 'border-blue-400 dark:border-blue-800/60 bg-blue-50/10 dark:bg-blue-950/5' 
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div>
                  {/* Card Header (ID + Name next to each other on BOTH mobile & desktop) */}
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 px-2.5 py-1 rounded-lg">
                        {orc.idFormatado}
                      </span>
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate max-w-[130px] sm:max-w-[180px]" title={orc.clientName}>
                        {orc.clientName}
                      </span>
                    </div>
                    {/* Desktop status position (hidden in mobile layout) */}
                    <span className={`hidden sm:inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeClass(orc.status)}`}>
                      {orc.status === 'Transformado em OS' 
                        ? `Transformado em OS (${orc.linkedOsFormatado || 'Sem Número'})` 
                        : orc.status}
                    </span>
                  </div>

                  {/* Mobile status position: Below the budget ID / Name */}
                  <div className="sm:hidden mt-2.5 mb-1.5">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeClass(orc.status)}`}>
                      {orc.status === 'Transformado em OS' 
                        ? `Transformado em OS (${orc.linkedOsFormatado || 'Sem Número'})` 
                        : orc.status}
                    </span>
                  </div>

                  {/* Technical Information & Equipment info */}
                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="font-semibold">Criado em: {safeFormatDate(orc.createdAt)}</span>
                    </div>
                    {orc.expiresAt && (
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="font-semibold">
                          Validade: {safeFormatDate(orc.expiresAt)}
                          {orc.status === 'Pendente' && (
                            <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              ({Math.max(0, Math.ceil((new Date(orc.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}d restantes)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 text-[10px] rounded">
                        {orc.equipmentType}
                      </span>
                      <span className="font-mono text-neutral-500 truncate dark:text-neutral-300">
                        {orc.equipmentBrand} • {orc.equipmentModel}
                      </span>
                    </div>
                    <div className="text-neutral-600 dark:text-neutral-300 font-medium line-clamp-2 mt-1 italic">
                      &quot;{orc.reportedIssue}&quot;
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 flex flex-col gap-3">
                  {/* Budget total cost estimation */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black uppercase tracking-wider text-neutral-400">Total Estimado</span>
                      <span className="text-base font-black text-neutral-900 dark:text-neutral-100 font-mono">
                        R$ {orc.totalCostValue.toFixed(2)}
                      </span>
                    </div>
                    {tech && (
                      <div className="text-right">
                        <span className="block text-[8px] font-black uppercase tracking-wider text-neutral-400">Técnico</span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{tech.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      onClick={() => setSelectedOrcamento(orc)}
                      className="p-2 text-neutral-900 bg-neutral-100 hover:bg-neutral-200 dark:text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl transition-all cursor-pointer"
                      title="Visualizar detalhes do orçamento"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {!isReadOnly && onEditOrcamento && orc.status !== 'Transformado em OS' && (
                      <button
                        onClick={() => onEditOrcamento(orc)}
                        className="p-2 text-neutral-900 bg-neutral-100 hover:bg-neutral-200 dark:text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl transition-all cursor-pointer"
                        title="Editar Orçamento"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => setOrcamentoToPrint(orc)}
                      className="p-2 text-neutral-900 bg-neutral-100 hover:bg-neutral-200 dark:text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl transition-all cursor-pointer"
                      title="Gerar PDF do Orçamento"
                    >
                      <FileDown className="w-4 h-4 text-emerald-600" />
                    </button>

                    {orc.status !== 'Transformado em OS' && (
                      <button
                        onClick={() => onConvertToOS(orc)}
                        className="bg-yellow-300 hover:bg-yellow-400 text-neutral-900 text-[10px] font-black uppercase tracking-wider px-3 py-2 border border-neutral-900 flex items-center gap-1 cursor-pointer transition-all rounded-xl"
                        title="Gerar Ordem de Serviço (OS) a partir deste orçamento"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Gerar OS</span>
                      </button>
                    )}

                    {onDeleteOrcamento && currentRole === 'ADMIN' && (
                      <button
                        onClick={() => {
                          if (window.confirm("Deseja realmente deletar este orçamento? Esta ação é irreversível.")) {
                            onDeleteOrcamento(orc.id);
                          }
                        }}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                        title="Deletar orçamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 border-2 border-dashed border-neutral-200 dark:border-neutral-700 p-12 text-center rounded-2xl">
          <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4 stroke-[1.5]" />
          <h4 className="font-black uppercase text-sm text-neutral-900 dark:text-neutral-100">Nenhum Orçamento Encontrado</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            Não há orçamentos correspondentes aos filtros selecionados no sistema ou nenhuma simulação foi criada ainda.
          </p>
        </div>
      )}

      {/* DETALHES DO ORÇAMENTO MODAL */}
      {selectedOrcamento && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-950 dark:border-neutral-700 max-w-3xl w-full rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
            {/* Header */}
            <div className="bg-neutral-900 dark:bg-neutral-100 p-5 text-white dark:text-neutral-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-300 dark:text-yellow-600 stroke-[2.5]" />
                <h3 className="font-black uppercase tracking-tight text-base">Orçamento #{selectedOrcamento.idFormatado}</h3>
              </div>
              <button 
                onClick={() => setSelectedOrcamento(null)}
                className="text-white dark:text-neutral-900 hover:text-red-400 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Linked OS status */}
              {selectedOrcamento.status === 'Transformado em OS' && (
                <div className="bg-blue-50 border-2 border-blue-400 p-4 text-blue-900 flex items-center justify-between rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wide">STATUS: TRANSFORMADO EM OS</span>
                      <span className="text-[11px] font-bold">
                        Este orçamento foi aprovado pelo cliente e convertido em uma Ordem de Serviço oficial.
                      </span>
                    </div>
                  </div>
                  {selectedOrcamento.linkedOsFormatado && (
                    <span className="bg-blue-900 text-white font-mono text-[11px] px-3 py-1 font-black rounded-lg">
                      {selectedOrcamento.linkedOsFormatado}
                    </span>
                  )}
                </div>
              )}

              {/* Status Update Buttons */}
              {selectedOrcamento.status !== 'Transformado em OS' && !isReadOnly && (
                <div className="bg-neutral-50 dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <span className="block text-xs font-black uppercase tracking-wider text-neutral-400">Controles do Atendimento</span>
                    <span className="text-[11px] font-bold text-neutral-500">Alterar o status atual do orçamento do cliente</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedOrcamento, 'Pendente')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                        selectedOrcamento.status === 'Pendente'
                          ? 'bg-amber-400 border-amber-500 text-neutral-900'
                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      Pendente
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrcamento, 'Aprovado')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                        selectedOrcamento.status === 'Aprovado'
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      Aprovado
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrcamento, 'Reprovado')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                        selectedOrcamento.status === 'Reprovado'
                          ? 'bg-red-500 border-red-600 text-white'
                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      Reprovado
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrcamento, 'Expirado')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                        selectedOrcamento.status === 'Expirado'
                          ? 'bg-neutral-500 border-neutral-600 text-white dark:bg-neutral-700 dark:border-neutral-600'
                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      Expirado
                    </button>
                  </div>
                </div>
              )}

              {/* Informações do Cliente */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Cliente e Contato
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Nome ou Razão Social</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-extrabold uppercase">{selectedOrcamento.clientName}</span>
                  </div>
                  {selectedOrcamento.clientDocument && (
                    <div>
                      <span className="block text-[9px] uppercase text-neutral-400">CPF ou CNPJ</span>
                      <span className="text-neutral-900 dark:text-neutral-100 font-mono">{selectedOrcamento.clientDocument}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Telefone</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-mono">{selectedOrcamento.clientPhone}</span>
                  </div>
                  {selectedOrcamento.clientEmail && (
                    <div>
                      <span className="block text-[9px] uppercase text-neutral-400">E-mail</span>
                      <span className="text-neutral-900 dark:text-neutral-100">{selectedOrcamento.clientEmail}</span>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="block text-[9px] uppercase text-neutral-400">Endereço de Atendimento</span>
                    <span className="text-neutral-900 dark:text-neutral-100">
                      {selectedOrcamento.address}, {selectedOrcamento.addressNumber}
                      {selectedOrcamento.addressComplement && ` - ${selectedOrcamento.addressComplement}`}
                      {selectedOrcamento.clientCity && ` • ${selectedOrcamento.clientCity} - ${selectedOrcamento.clientState}`}
                      {selectedOrcamento.clientZipCode && ` (CEP ${selectedOrcamento.clientZipCode})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações do Equipamento */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Detalhes do Equipamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold bg-neutral-50 dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Tipo</span>
                    <span className="text-neutral-900 dark:text-neutral-100">{selectedOrcamento.equipmentType}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Marca</span>
                    <span className="text-neutral-900 dark:text-neutral-100">{selectedOrcamento.equipmentBrand}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Modelo</span>
                    <span className="text-neutral-900 dark:text-neutral-100">{selectedOrcamento.equipmentModel}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs font-bold">
                  <div>
                    <span className="block text-[9px] uppercase text-neutral-400">Defeito Relatado</span>
                    <p className="bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium italic border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 mt-1 whitespace-pre-wrap">
                      &quot;{selectedOrcamento.reportedIssue}&quot;
                    </p>
                  </div>
                  {selectedOrcamento.technicalDiagnosis && (
                    <div>
                      <span className="block text-[9px] uppercase text-neutral-400">Laudo / Parecer Técnico</span>
                      <p className="bg-amber-50/50 dark:bg-amber-950/10 text-neutral-700 dark:text-neutral-300 font-medium border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-1 whitespace-pre-wrap">
                        {selectedOrcamento.technicalDiagnosis}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parts & Services Table */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Peças, Reposições ou Serviços inclusos
                </h4>
                {selectedOrcamento.parts && selectedOrcamento.parts.length > 0 ? (
                  <div className="border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-800 text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 text-[10px] font-black uppercase text-neutral-500 flex justify-between">
                      <span className="flex-1">Componente / Descrição</span>
                      <div className="flex gap-10">
                        <span className="w-12 text-center">Qtd</span>
                        <span className="w-16 text-right">Unitário</span>
                        <span className="w-20 text-right">Subtotal</span>
                      </div>
                    </div>
                    {selectedOrcamento.parts.map((p, i) => (
                      <div key={i} className="px-4 py-2.5 flex justify-between font-bold text-neutral-800 dark:text-neutral-200">
                        <span className="flex-1 truncate uppercase font-mono">{p.name}</span>
                        <div className="flex gap-10 font-mono">
                          <span className="w-12 text-center">{p.quantity}x</span>
                          <span className="w-16 text-right">R$ {p.value.toFixed(2)}</span>
                          <span className="w-20 text-right text-emerald-700">R$ {(p.value * p.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-black uppercase text-neutral-400 italic bg-neutral-50 dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">Sem peças de reposição adicionadas.</p>
                )}
              </div>

              {/* Custos Breakdown */}
              <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mão de Obra:</span>
                  <span className="font-mono">R$ {(selectedOrcamento.laborCostValue || 0).toFixed(2)} {selectedOrcamento.isLaborCourtesy && <span className="text-emerald-600 ml-1 text-[10px] uppercase font-black">(Cortesia)</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Taxa Deslocamento / Visita:</span>
                  <span className="font-mono">R$ {(selectedOrcamento.taxaDeslocamento || 0).toFixed(2)} {selectedOrcamento.isTravelCourtesy && <span className="text-emerald-600 ml-1 text-[10px] uppercase font-black">(Cortesia)</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Peças e Componentes:</span>
                  <span className="font-mono">R$ {(selectedOrcamento.partsCostValue || 0).toFixed(2)}</span>
                </div>
                {selectedOrcamento.discountValue ? (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto Aplicado ({selectedOrcamento.discountType === 'percentage' ? `${selectedOrcamento.discountValue}%` : 'Fixo'}):</span>
                    <span className="font-mono">
                      - R$ {selectedOrcamento.discountType === 'fixed' 
                        ? selectedOrcamento.discountValue.toFixed(2) 
                        : (((selectedOrcamento.partsCostValue || 0) + 
                            (selectedOrcamento.isLaborCourtesy ? 0 : (selectedOrcamento.laborCostValue || 0)) + 
                            (selectedOrcamento.isTravelCourtesy ? 0 : (selectedOrcamento.taxaDeslocamento || 0))) * selectedOrcamento.discountValue / 100).toFixed(2)}
                    </span>
                  </div>
                ) : null}
                {selectedOrcamento.paymentMethod && (
                  <div className="flex justify-between pt-1 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-500 font-black uppercase text-[10px]">Forma de Pagamento:</span>
                    <span className="font-mono text-[11px] font-black uppercase text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-right">
                      {selectedOrcamento.paymentMethod}
                      {selectedOrcamento.paymentMethod === 'Cartão de Crédito' && selectedOrcamento.installments && (
                        <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 normal-case">
                          {selectedOrcamento.installments}x de R$ {(selectedOrcamento.totalCostValue / selectedOrcamento.installments).toFixed(2)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2.5 border-t border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                  <span className="text-sm font-black uppercase">Valor Total Estimado:</span>
                  <span className="text-lg font-black font-mono">R$ {selectedOrcamento.totalCostValue.toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOrcamentoToPrint(selectedOrcamento);
                    setSelectedOrcamento(null);
                  }}
                  className="bg-white hover:bg-neutral-100 border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-800 dark:text-white px-4 py-2.5 font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <FileDown className="w-4 h-4 text-emerald-600" /> Gerar PDF
                </button>
              </div>

              <div className="flex gap-2">
                {selectedOrcamento.status !== 'Transformado em OS' && !isReadOnly && onEditOrcamento && (
                  <button
                    onClick={() => {
                      onEditOrcamento(selectedOrcamento);
                      setSelectedOrcamento(null);
                    }}
                    className="bg-white hover:bg-neutral-100 border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-800 dark:text-white px-4 py-2.5 font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" /> Editar Orçamento
                  </button>
                )}
                {selectedOrcamento.status !== 'Transformado em OS' && !isReadOnly && (
                  <button
                    onClick={() => {
                      onConvertToOS(selectedOrcamento);
                      setSelectedOrcamento(null);
                    }}
                    className="bg-yellow-300 hover:bg-yellow-400 text-neutral-900 border border-neutral-900 px-5 py-2.5 font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Gerar Ordem de Serviço (OS)
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrcamento(null)}
                  className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-5 py-2.5 font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPROVANTE PRINT DO ORÇAMENTO MODAL (INVOICE STYLE) */}
      {orcamentoToPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col justify-between gap-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <span className="font-black text-neutral-900 uppercase tracking-widest text-xs flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-emerald-600" /> Gerar PDF do Orçamento
              </span>
              <button 
                onClick={() => setOrcamentoToPrint(null)}
                className="text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Printable Frame Area */}
            <div 
              id="print-section-orc" 
              className="border border-neutral-200 p-6 rounded-lg text-neutral-900 space-y-6 bg-white font-sans max-h-[60vh] overflow-y-auto"
            >
              {/* Receipt Header */}
              {(() => {
                const company = assistencias.find(a => a.id === orcamentoToPrint.assistenciaId);
                const compLogoUrl = company?.logoUrl || storeSettings?.logoUrl;
                const compName = company?.name || storeSettings?.name || 'Oficina Fitness';
                return (
                  <div className="flex justify-between items-center border-b border-neutral-200 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                      {compLogoUrl ? (
                        <img 
                          src={compLogoUrl} 
                          alt={compName} 
                          className="w-14 h-14 object-contain shrink-0 border border-neutral-200 bg-white rounded-xl p-1" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200 shrink-0">
                          <FileText className="w-7 h-7 text-neutral-900" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xs font-black tracking-tight text-neutral-900 uppercase">ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS</h2>
                        <span className="text-[9px] text-neutral-400 font-mono block uppercase">ESTIMATIVA NÃO VINCULANTE ATÉ ANÁLISE COMPLETA</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-neutral-900 text-white px-3 py-1 text-xs font-black font-mono rounded">
                        #{orcamentoToPrint.idFormatado}
                      </div>
                      <span className="text-[9px] text-neutral-500 uppercase block font-mono mt-1">
                        Emitido em: {safeFormatDate(orcamentoToPrint.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Prestador */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium border-t border-b border-neutral-100 py-3">
                <div>
                  <span className="block text-[8px] font-black uppercase text-neutral-400">Prestador / Assistência</span>
                  {(() => {
                    const company = assistencias.find(a => a.id === orcamentoToPrint.assistenciaId);
                    return (
                      <div>
                        <strong className="text-neutral-900 uppercase block">{company?.name || 'Oficina Fitness'}</strong>
                        {company?.address && <span className="text-neutral-500 block text-[10px] mt-0.5">{company.address}</span>}
                        {company?.phone && <span className="text-neutral-500 block text-[10px] font-mono">TEL: {company.phone}</span>}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <span className="block text-[8px] font-black uppercase text-neutral-400">Cliente</span>
                  <strong className="text-neutral-900 uppercase block">{orcamentoToPrint.clientName}</strong>
                  <span className="text-neutral-500 block text-[10px] mt-0.5">{orcamentoToPrint.address}, {orcamentoToPrint.addressNumber} {orcamentoToPrint.addressComplement}</span>
                  <span className="text-neutral-500 block text-[10px] font-mono">TEL: {orcamentoToPrint.clientPhone}</span>
                </div>
              </div>

              {/* Equipamento */}
              <div className="space-y-1 bg-neutral-50 p-3 rounded border border-neutral-200">
                <span className="block text-[8px] font-black uppercase text-neutral-400">Equipamento para Reparo</span>
                <span className="text-xs font-black uppercase text-neutral-900">
                  {orcamentoToPrint.equipmentType} - {orcamentoToPrint.equipmentBrand} / {orcamentoToPrint.equipmentModel}
                </span>
                <p className="text-[10px] text-neutral-600 font-medium italic mt-1 leading-relaxed">
                  Defeito Relatado: &quot;{orcamentoToPrint.reportedIssue}&quot;
                </p>
                {orcamentoToPrint.technicalDiagnosis && (
                  <p className="text-[10px] text-neutral-800 font-bold border-t border-neutral-200/60 pt-1 mt-1 font-sans">
                    Laudo Técnico: {orcamentoToPrint.technicalDiagnosis}
                  </p>
                )}
              </div>

              {/* Peças list */}
              {orcamentoToPrint.parts && orcamentoToPrint.parts.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="block text-[8px] font-black uppercase text-neutral-400">Peças, Componentes e Serviços Inclusos</span>
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-neutral-100 text-[9px] uppercase text-neutral-500 border-b border-neutral-200">
                        <th className="py-1 px-2">Descrição da Peça / Serviço</th>
                        <th className="py-1 px-2 text-center">Qtd</th>
                        <th className="py-1 px-2 text-right">Unitário</th>
                        <th className="py-1 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {orcamentoToPrint.parts.map((p, i) => (
                        <tr key={i} className="text-neutral-800 font-mono text-[11px]">
                          <td className="py-1.5 px-2 uppercase">{p.name}</td>
                          <td className="py-1.5 px-2 text-center">{p.quantity}</td>
                          <td className="py-1.5 px-2 text-right">R$ {p.value.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-800">R$ {(p.value * p.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Custos breakdown table */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Mão de Obra Mecânica:</span>
                    <span className="font-mono">R$ {(orcamentoToPrint.laborCostValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Taxa Visita / Deslocamento:</span>
                    <span className="font-mono">R$ {(orcamentoToPrint.taxaDeslocamento || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Total Peças:</span>
                    <span className="font-mono">R$ {(orcamentoToPrint.partsCostValue || 0).toFixed(2)}</span>
                  </div>
                  {orcamentoToPrint.discountValue ? (
                    <div className="flex justify-between text-[11px] text-red-600">
                      <span>Desconto Aplicado:</span>
                      <span className="font-mono">
                        - R$ {orcamentoToPrint.discountType === 'fixed' 
                          ? orcamentoToPrint.discountValue.toFixed(2) 
                          : (((orcamentoToPrint.partsCostValue || 0) + 
                              (orcamentoToPrint.isLaborCourtesy ? 0 : (orcamentoToPrint.laborCostValue || 0)) + 
                              (orcamentoToPrint.isTravelCourtesy ? 0 : (orcamentoToPrint.taxaDeslocamento || 0))) * orcamentoToPrint.discountValue / 100).toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                  {orcamentoToPrint.paymentMethod && (
                    <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-neutral-200">
                      <span className="text-neutral-500">Forma de Pagamento Sugerida:</span>
                      <span className="font-bold text-neutral-800 text-right">
                        {orcamentoToPrint.paymentMethod}
                        {orcamentoToPrint.paymentMethod === 'Cartão de Crédito' && orcamentoToPrint.installments && (
                          <span className="block text-[9px] text-emerald-700 font-bold font-mono">
                            {orcamentoToPrint.installments}x de R$ {(orcamentoToPrint.totalCostValue / orcamentoToPrint.installments).toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-300">
                    <span className="text-xs font-black uppercase text-neutral-900">Total Geral Estimado:</span>
                    <span className="text-sm font-black font-mono text-emerald-900 bg-neutral-50 border border-neutral-300 px-2.5 py-0.5 rounded">R$ {orcamentoToPrint.totalCostValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Term */}
              <div className="text-[8px] leading-relaxed text-neutral-400 border-t border-neutral-200 pt-4 text-center space-y-1">
                <p>Este documento é apenas uma simulação de custos para análise preliminar de orçamento para conserto de equipamento.</p>
                <p>Validade deste orçamento: <strong>{orcamentoToPrint.validityDays || 10} dias</strong> a contar da data de emissão acima especificada.{orcamentoToPrint.expiresAt && ` (Válido até: ${safeFormatDate(orcamentoToPrint.expiresAt)})`}</p>
              </div>
            </div>

            {/* Print actions footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setOrcamentoToPrint(null)}
                className="bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 font-black uppercase text-xs tracking-wider px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleGeneratePDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Gerar PDF do Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
