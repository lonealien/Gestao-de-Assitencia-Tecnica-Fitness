import { useState } from 'react';
import { OrdemServico, UserRole } from '../types';
import { 
  Plus, AlertTriangle, ShieldCheck, Activity, RotateCw, CheckCircle, 
  Clock, DollarSign, Hammer, Calendar, Eye, X, Phone, Mail, MapPin, 
  User, ClipboardCheck, ArrowRight, ShieldAlert, FileText, Lock,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';

interface DashboardStatsProps {
  ordens: OrdemServico[];
  onOpenNewOSForm: () => void;
  onOpenNewOrcamentoForm?: () => void;
  currentRole: UserRole;
  isReadOnly?: boolean;
  onEditOS?: (id: string) => void;
  onViewOS?: (id: string) => void;
  onShowBlockedAlert?: (message: string) => void;
}

export default function DashboardStats({
  ordens,
  onOpenNewOSForm,
  onOpenNewOrcamentoForm,
  currentRole,
  isReadOnly,
  onEditOS,
  onViewOS,
  onShowBlockedAlert
}: DashboardStatsProps) {
  const [listFilter, setListFilter] = useState<'dia' | 'amanha' | 'semana' | 'mes' | 'todos' | 'por-data' | 'historico' | 'pendentes' | 'conserto' | 'finalizadas' | 'aguardando-reagendamento'>('dia');

  // Helper to get YYYY-MM-DD in local time
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());
  // Default search range: current month
  const firstDayOfMonth = todayStr.substring(0, 8) + '01';

  const [customSearchStartDate, setCustomSearchStartDate] = useState<string>(firstDayOfMonth);
  const [customSearchEndDate, setCustomSearchEndDate] = useState<string>(todayStr);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [startCalendarViewDate, setStartCalendarViewDate] = useState<Date>(new Date());
  const [endCalendarViewDate, setEndCalendarViewDate] = useState<Date>(new Date());
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [expandedDashCards, setExpandedDashCards] = useState<Record<string, boolean>>({});

  const safeFormatDate = (dateVal: string | undefined | null) => {
    if (!dateVal) return '-';
    try {
      const parts = dateVal.split('T')[0].split('-');
      if (parts.length === 3) {
        // YYYY-MM-DD
        return `${parts[2].substring(0,2)}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR');
    } catch (e) {
      return '-';
    }
  };

  const total = ordens.length;
  const pendente = ordens.filter(o => o.status === 'Pendente').length;
  const emExecucaoCount = 0; // These statuses no longer exist in types
  const aguardandoPecas = ordens.filter(o => o.status === 'Aguardando Peça').length;
  const aguardandoReagendamento = ordens.filter(o => o.status === 'Aguardando Reagendamento').length;
  const concluida = ordens.filter(o => o.status === 'Finalizada').length;

  const totalRevenue = ordens
    .filter(o => o.status === 'Finalizada')
    .reduce((acc, current) => acc + current.totalCostValue, 0);

  const pendingRevenue = ordens
    .filter(o => o.status !== 'Finalizada' && o.status !== 'Cancelada')
    .reduce((acc, current) => acc + current.totalCostValue, 0);

  // Date matchers using local time comparison
  const isTodayMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.substring(0, 10);
    return cleanDate === todayStr;
  };

  const isTomorrowMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = getLocalDateStr(tomorrow);
    const cleanDate = dateStr.substring(0, 10);
    return cleanDate === tomStr;
  };

  const isWeekMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.substring(0, 10);
    
    const curr = new Date();
    const day = curr.getDay(); // 0 is Sunday, 6 is Saturday
    const start = new Date(curr);
    start.setDate(curr.getDate() - day);
    const end = new Date(curr);
    end.setDate(curr.getDate() + (6 - day));
    
    const startStr = getLocalDateStr(start);
    const endStr = getLocalDateStr(end);
    
    return cleanDate >= startStr && cleanDate <= endStr;
  };

  const isMonthMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.substring(0, 10);
    return cleanDate.substring(0, 7) === todayStr.substring(0, 7);
  };

  // Filter active and incomplete ordens
  const activeOrdens = ordens.filter(o => o.status !== 'Finalizada' && o.status !== 'Cancelada');

  // Today scheduled/created orders
  const ordensDoDia = ordens.filter(o => {
    const isTargetToday = isTodayMatch(o.scheduledVisitDate);
    const isCreatedToday = isTodayMatch(o.createdAt);
    const isDeliveryToday = isTodayMatch(o.deliveryTargetDate);
    return isTargetToday || isCreatedToday || isDeliveryToday;
  });

  // Tomorrow scheduled/created orders
  const ordensAmanha = ordens.filter(o => {
    const isTargetTomorrow = isTomorrowMatch(o.scheduledVisitDate);
    const isCreatedTomorrow = isTomorrowMatch(o.createdAt);
    const isDeliveryTomorrow = isTomorrowMatch(o.deliveryTargetDate);
    return isTargetTomorrow || isCreatedTomorrow || isDeliveryTomorrow;
  });

  // Week scheduled/created orders
  const ordensDaSemana = ordens.filter(o => {
    const isTargetWeek = isWeekMatch(o.scheduledVisitDate);
    const isCreatedWeek = isWeekMatch(o.createdAt);
    return isTargetWeek || isCreatedWeek;
  });

  // Month scheduled/created orders
  const ordensDoMes = ordens.filter(o => {
    const isTargetMonth = isMonthMatch(o.scheduledVisitDate);
    const isCreatedMonth = isMonthMatch(o.createdAt);
    return isTargetMonth || isCreatedMonth;
  });

  // Custom Search: access to history by date range (all status including Concluida/Cancelada!)
  const ordensCustomSearch = ordens.filter(o => {
    const visitDateStr = o.scheduledVisitDate;
    const createdDateStr = o.createdAt.split('T')[0];
    
    // Check if scheduledVisitDate falls in between [start, end] OR createdAt falls in between [start, end]
    const matchesVisit = visitDateStr ? (visitDateStr >= customSearchStartDate && visitDateStr <= customSearchEndDate) : false;
    const matchesCreated = createdDateStr >= customSearchStartDate && createdDateStr <= customSearchEndDate;
    
    return matchesVisit || matchesCreated;
  });

  // Decide which list is displayed
  let displayedOrdens = [];
  if (listFilter === 'dia') {
    displayedOrdens = ordensDoDia;
  } else if (listFilter === 'amanha') {
    displayedOrdens = ordensAmanha;
  } else if (listFilter === 'semana') {
    displayedOrdens = ordensDaSemana;
  } else if (listFilter === 'mes') {
    displayedOrdens = ordensDoMes;
  } else if (listFilter === 'por-data') {
    displayedOrdens = ordensCustomSearch;
  } else if (listFilter === 'historico') {
    displayedOrdens = ordens;
  } else if (listFilter === 'pendentes') {
    displayedOrdens = ordens.filter(o => o.status === 'Pendente');
  } else if (listFilter === 'conserto') {
    displayedOrdens = ordens.filter(o => o.status === 'Aguardando Peça');
  } else if (listFilter === 'aguardando-reagendamento') {
    displayedOrdens = ordens.filter(o => o.status === 'Aguardando Reagendamento');
  } else if (listFilter === 'finalizadas') {
    displayedOrdens = ordens.filter(o => o.status === 'Finalizada');
  } else {
    displayedOrdens = activeOrdens;
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic Action Banner with neubrutalist sharp outlines and offset shadow */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 rounded-2xl shadow-sm dark:shadow-none">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 font-display flex items-center gap-2 uppercase tracking-tight">
            <Activity className="w-6 h-6 stroke-[3]" />
            Painel Operacional Fitness OS
          </h2>
          <p className="text-xs text-neutral-700 mt-2 font-medium max-w-2xl">
            Painel de controle para monitorar chamados e ordens de serviços de esteiras, bicicletas, elípticos e estações de musculação de lojas fitness e academias conveniadas.
          </p>
        </div>

        {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE') ? (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (isReadOnly) {
                  onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Abertura de OS suspensa.");
                  return;
                }
                onOpenNewOSForm();
              }}
              className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm dark:shadow-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Abrir OS
            </button>
            <button
              onClick={() => {
                if (isReadOnly) {
                  onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Criação de orçamento suspensa.");
                  return;
                }
                onOpenNewOrcamentoForm && onOpenNewOrcamentoForm();
              }}
              className="bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-neutral-700 font-black uppercase tracking-wider px-5 py-2 rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Gerar Orçamento
            </button>
          </div>
        ) : null}
      </div>

      {/* Grid of stats - stark colors with heavy outlines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total OS opened */}
        <button
          onClick={() => setListFilter('historico')}
          className={`border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between min-h-[110px] cursor-pointer text-left transition-all hover:scale-[1.02] ${
            listFilter === 'historico'
              ? 'bg-neutral-200 dark:bg-neutral-700 shadow-sm dark:shadow-none ring-2 ring-black font-semibold'
              : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm dark:shadow-none'
          }`}
        >
          <div className="flex justify-between items-start text-neutral-900 dark:text-neutral-100 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Histórico Total</span>
            <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono tracking-tighter text-neutral-900 dark:text-neutral-100 block leading-none">{total}</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mt-1 block">Todas as OS</span>
          </div>
        </button>

        {/* Pending setup */}
        <button
          onClick={() => setListFilter('pendentes')}
          className={`border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between min-h-[110px] cursor-pointer text-left transition-all hover:scale-[1.02] ${
            listFilter === 'pendentes'
              ? 'bg-yellow-200 dark:bg-yellow-900/60 shadow-sm dark:shadow-none ring-2 ring-black font-semibold'
              : 'bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 shadow-sm dark:shadow-none'
          }`}
        >
          <div className="flex justify-between items-start text-neutral-900 dark:text-neutral-100 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Triagem / Pendentes</span>
            <span className="bg-yellow-400 text-neutral-900 dark:text-neutral-100 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono tracking-tighter text-neutral-900 dark:text-neutral-100 block leading-none">{pendente}</span>
            <span className="text-[10px] uppercase font-bold text-yellow-900 dark:text-yellow-300 tracking-wide mt-1 block">Aguardando início</span>
          </div>
        </button>

        {/* In Repairs / In Analysis */}
        <button
          onClick={() => setListFilter('conserto')}
          className={`border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between min-h-[110px] cursor-pointer text-left transition-all hover:scale-[1.02] ${
            listFilter === 'conserto'
              ? 'bg-blue-200 dark:bg-blue-900/60 shadow-sm dark:shadow-none ring-2 ring-black font-semibold'
              : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm dark:shadow-none'
          }`}
        >
          <div className="flex justify-between items-start text-neutral-900 dark:text-neutral-100 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Em Conserto</span>
            <span className="bg-blue-400 text-white dark:text-neutral-900 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono tracking-tighter text-neutral-900 dark:text-neutral-100 block leading-none">{emExecucaoCount + aguardandoPecas}</span>
            <span className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300 tracking-wide mt-1 block">
              {emExecucaoCount} Ativas • {aguardandoPecas} Peças
            </span>
          </div>
        </button>

        {/* Resolved completely */}
        <button
          onClick={() => setListFilter('finalizadas')}
          className={`border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between min-h-[110px] cursor-pointer text-left transition-all hover:scale-[1.02] ${
            listFilter === 'finalizadas'
              ? 'bg-emerald-200 dark:bg-emerald-900/60 shadow-sm dark:shadow-none ring-2 ring-black font-semibold'
              : 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm dark:shadow-none'
          }`}
        >
          <div className="flex justify-between items-start text-neutral-900 dark:text-neutral-100 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Finalizadas</span>
            <span className="bg-emerald-400 text-neutral-900 dark:text-neutral-100 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono tracking-tighter text-neutral-900 dark:text-neutral-100 block leading-none">{concluida}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-900 dark:text-emerald-300 tracking-wide mt-1 block">Serviços entregues</span>
          </div>
        </button>

      </div>

      {/* Advanced Budget Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="bg-neutral-900 dark:bg-neutral-100 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 text-white dark:text-neutral-900 flex items-center justify-between shadow-sm dark:shadow-none">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Faturamento Técnico</span>
            <span className="text-2xl lg:text-3xl font-black block font-mono text-emerald-400 leading-none">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-gray-400 uppercase tracking-tight mt-1">Soma de todas ordens de serviço concluídas.</p>
          </div>
          <div className="bg-emerald-400 text-neutral-900 dark:text-neutral-100 p-3 rounded-2xl border-2 border-white">
            <DollarSign className="w-7 h-7 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 text-white dark:text-neutral-900 flex items-center justify-between shadow-sm dark:shadow-none">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Pendência em Análise</span>
            <span className="text-2xl lg:text-3xl font-black block font-mono text-yellow-300 leading-none">
              R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-gray-400 uppercase tracking-tight mt-1">Orçamentos estimados para ordens em andamento.</p>
          </div>
          <div className="bg-yellow-400 text-neutral-900 dark:text-neutral-100 p-3 rounded-2xl border-2 border-white">
            <Hammer className="w-7 h-7 stroke-[2.5]" />
          </div>
        </div>

      </div>

      {/* SECÇÃO REQUERIDA: CRONOGRAMA DE AGENDAMENTOS */}
      <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 rounded-2xl shadow-sm dark:shadow-none space-y-4">
        
        {/* Header segment of active listings */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-300 border border-neutral-200 dark:border-neutral-700 p-2 rounded-2xl shadow-sm dark:shadow-none text-neutral-900 dark:text-neutral-100">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                CRONOGRAMA DE ATENDIMENTOS
              </h3>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                Filtre os agendamentos da semana, dia, mês ou acesse o histórico completo de datas
              </p>
            </div>
          </div>

          {/* Tab buttons to toggle today vs week vs month vs all active vs search history */}
          <div className="flex flex-wrap gap-2 self-start xl:self-center">
            <button
              onClick={() => setListFilter('dia')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'dia'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Hoje ({ordensDoDia.length})
            </button>
            <button
              onClick={() => setListFilter('amanha')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'amanha'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Amanhã ({ordensAmanha.length})
            </button>
            <button
              onClick={() => setListFilter('semana')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'semana'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Semana ({ordensDaSemana.length})
            </button>
            <button
              onClick={() => setListFilter('mes')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'mes'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Do Mês ({ordensDoMes.length})
            </button>
            <button
              onClick={() => setListFilter('todos')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'todos'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Ver Tudo ({activeOrdens.length})
            </button>
            <button
              onClick={() => setListFilter('pendentes')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'pendentes'
                  ? 'bg-yellow-400 text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Pendentes ({pendente})
            </button>
            <button
              onClick={() => setListFilter('conserto')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'conserto'
                  ? 'bg-blue-300 dark:bg-blue-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Aguardando Peça ({aguardandoPecas})
            </button>
            <button
              onClick={() => setListFilter('aguardando-reagendamento')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'aguardando-reagendamento'
                  ? 'bg-orange-300 dark:bg-orange-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Aguardando Reagendamento ({aguardandoReagendamento})
            </button>
            <button
              onClick={() => setListFilter('finalizadas')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'finalizadas'
                  ? 'bg-emerald-300 dark:bg-emerald-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Finalizadas ({concluida})
            </button>
            <button
              onClick={() => setListFilter('por-data')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'por-data'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Histórico por Data
            </button>
          </div>
        </div>

        {/* Custom search date sub-bar */}
        {listFilter === 'por-data' && (
          <div className="flex flex-col md:flex-row items-center gap-4 bg-neutral-100 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl shadow-sm dark:shadow-none w-full">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Início Calendar Picker */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100">Início:</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowStartCalendar(!showStartCalendar);
                    setShowEndCalendar(false);
                    if (customSearchStartDate) {
                      setStartCalendarViewDate(new Date(customSearchStartDate + 'T00:00:00'));
                    }
                  }}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-100"
                >
                  <Calendar className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                  {customSearchStartDate ? (
                    customSearchStartDate.split('-').reverse().join('/')
                  ) : (
                    'SELECIONAR'
                  )}
                </button>

                {showStartCalendar && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartCalendarViewDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() - 1);
                            return d;
                          });
                        }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                      </button>
                      
                      <span className="text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 select-none">
                        {startCalendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartCalendarViewDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() + 1);
                            return d;
                          });
                        }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                      </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <span key={i} className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const year = startCalendarViewDate.getFullYear();
                        const month = startCalendarViewDate.getMonth();
                        
                        const firstDay = new Date(year, month, 1);
                        const startDayOfWeek = firstDay.getDay();
                        
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const cells = [];
                        
                        for (let i = 0; i < startDayOfWeek; i++) {
                          cells.push(<div key={`empty-start-${i}`} className="h-7 w-7" />);
                        }
                        
                        const todayStr = getLocalDateStr(new Date());

                        for (let day = 1; day <= daysInMonth; day++) {
                          const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          
                          const osCount = ordens.filter(o => {
                            if (o.status === 'Finalizada' || o.status === 'Cancelada') return false;
                            const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                            return scheduledStr === dayDateStr;
                          }).length;

                          const isSelected = customSearchStartDate === dayDateStr;
                          const isToday = dayDateStr === todayStr;

                          cells.push(
                            <button
                              key={`day-start-${day}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomSearchStartDate(dayDateStr);
                                setShowStartCalendar(false);
                              }}
                              className={`group relative h-7 w-7 flex flex-col items-center justify-center text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-amber-400 dark:bg-amber-400 text-neutral-900 border border-neutral-900 dark:border-neutral-700 shadow-sm' 
                                  : isToday
                                    ? 'border border-amber-500/50 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                              }`}
                            >
                              <span>{day}</span>
                              
                              {osCount > 0 && (
                                <span 
                                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                                    isSelected ? 'bg-neutral-900' : 'bg-rose-500'
                                  }`} 
                                  title={`${osCount} OS aberta(s)`} 
                                />
                              )}
                            </button>
                          );
                        }
                        
                        return cells;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Fim Calendar Picker */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100">Fim:</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowEndCalendar(!showEndCalendar);
                    setShowStartCalendar(false);
                    if (customSearchEndDate) {
                      setEndCalendarViewDate(new Date(customSearchEndDate + 'T00:00:00'));
                    }
                  }}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-100"
                >
                  <Calendar className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                  {customSearchEndDate ? (
                    customSearchEndDate.split('-').reverse().join('/')
                  ) : (
                    'SELECIONAR'
                  )}
                </button>

                {showEndCalendar && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEndCalendarViewDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() - 1);
                            return d;
                          });
                        }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                      </button>
                      
                      <span className="text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 select-none">
                        {endCalendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEndCalendarViewDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() + 1);
                            return d;
                          });
                        }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                      </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <span key={i} className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const year = endCalendarViewDate.getFullYear();
                        const month = endCalendarViewDate.getMonth();
                        
                        const firstDay = new Date(year, month, 1);
                        const startDayOfWeek = firstDay.getDay();
                        
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const cells = [];
                        
                        for (let i = 0; i < startDayOfWeek; i++) {
                          cells.push(<div key={`empty-end-${i}`} className="h-7 w-7" />);
                        }
                        
                        const todayStr = getLocalDateStr(new Date());

                        for (let day = 1; day <= daysInMonth; day++) {
                          const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          
                          const osCount = ordens.filter(o => {
                            if (o.status === 'Finalizada' || o.status === 'Cancelada') return false;
                            const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                            return scheduledStr === dayDateStr;
                          }).length;

                          const isSelected = customSearchEndDate === dayDateStr;
                          const isToday = dayDateStr === todayStr;

                          cells.push(
                            <button
                              key={`day-end-${day}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomSearchEndDate(dayDateStr);
                                setShowEndCalendar(false);
                              }}
                              className={`group relative h-7 w-7 flex flex-col items-center justify-center text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-amber-400 dark:bg-amber-400 text-neutral-900 border border-neutral-900 dark:border-neutral-700 shadow-sm' 
                                  : isToday
                                    ? 'border border-amber-500/50 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                              }`}
                            >
                              <span>{day}</span>
                              
                              {osCount > 0 && (
                                <span 
                                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                                    isSelected ? 'bg-neutral-900' : 'bg-rose-500'
                                  }`} 
                                  title={`${osCount} OS aberta(s)`} 
                                />
                              )}
                            </button>
                          );
                        }
                        
                        return cells;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs uppercase font-black text-neutral-900 dark:text-neutral-100 md:ml-auto">
              Mostrando registros de <span className="font-mono text-neutral-900 dark:text-neutral-100 font-black bg-yellow-200 px-1 border border-neutral-200 dark:border-neutral-700">{customSearchStartDate.split('-').reverse().join('/')}</span> até <span className="font-mono text-neutral-900 dark:text-neutral-100 font-black bg-yellow-200 px-1 border border-neutral-200 dark:border-neutral-700">{customSearchEndDate.split('-').reverse().join('/')}</span> (inclusive Concluídas/Canceladas)
            </div>
          </div>
        )}

        {/* Display listings */}
        {displayedOrdens.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-300 bg-neutral-50">
            <Clock className="w-10 h-10 text-gray-400 mx-auto stroke-[1.5] mb-2" />
            <h4 className="text-sm font-black uppercase tracking-wider text-neutral-700">Não há ordens registradas para o filtro selecionado</h4>
            <p className="text-xs font-medium text-neutral-500 mt-1">Nenhum atendimento agendado ou criado corresponde a esta pesquisa.</p>
            {listFilter === 'dia' && activeOrdens.length > 0 && (
              <button 
                onClick={() => setListFilter('todos')}
                className="mt-4 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Ver Fila Total Ativa ({activeOrdens.length})
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {displayedOrdens.map(o => {
              // Priority styling
              const prioBg = o.priority === 'Alta' ? 'bg-rose-100 text-rose-800'
                : o.priority === 'Média' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800'
                : 'bg-neutral-100 text-neutral-700';

              // Status styling
              const statusColors = o.status === 'Pendente' ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900'
                : o.status === 'Aguardando Peça' ? 'bg-purple-100 text-purple-900 border-purple-300'
                : o.status === 'Aguardando Reagendamento' ? 'bg-orange-100 text-orange-900 border-orange-300'
                : o.status === 'Finalizada' ? 'bg-emerald-400 text-white dark:text-neutral-900'
                : 'bg-neutral-200 text-neutral-900 dark:text-neutral-100';

              const isPrevistoHoje = isTodayMatch(o.deliveryTargetDate);
              const isExpanded = !!expandedDashCards[o.id];

              return (
                <div 
                  key={o.id} 
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Clickable Header for Collapsing/Expanding */}
                  <div
                    onClick={() => setExpandedDashCards(prev => ({ [o.id]: !prev[o.id] }))}
                    className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-all flex flex-row items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Mobile Layout */}
                      <div className="flex flex-col gap-2.5 sm:hidden">
                        {/* 1. Número da OS, Cliente e Status */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black tracking-widest text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 px-2 py-0.5 rounded shrink-0">
                              {o.idFormatado}
                            </span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight truncate max-w-[180px]">
                              {o.clientName}
                            </span>
                            {isPrevistoHoje && (
                              <span className="bg-red-500 text-white dark:text-neutral-900 text-[9px] font-black uppercase px-1.5 py-0.5 tracking-wider border border-neutral-200 dark:border-neutral-700 animate-pulse rounded shrink-0">
                                PREVISTO HOJE
                              </span>
                            )}
                          </div>
                          <div className="self-start">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 block ${statusColors}`}>
                              {o.status}
                            </span>
                          </div>
                        </div>

                        {/* 2. Dados do Equipamento */}
                        <div className="space-y-1 mt-0.5">
                          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-tight block">
                            <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mr-1">Eqp:</span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                              {o.equipmentType} • {o.equipmentBrand} <span className="font-mono text-neutral-400 font-medium text-xs">({o.equipmentModel})</span>
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex flex-col gap-2">
                        {/* ID and Client Name row */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="font-mono text-xs font-black tracking-widest text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 px-2 py-0.5 rounded shrink-0">
                            {o.idFormatado}
                          </span>
                          <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 truncate min-w-0">
                            {o.clientName}
                          </span>
                          {isPrevistoHoje && (
                            <span className="bg-red-500 text-white dark:text-neutral-900 text-[9px] font-black uppercase px-1.5 py-0.5 tracking-wider border border-neutral-200 dark:border-neutral-700 animate-pulse rounded shrink-0">
                              PREVISTO HOJE
                            </span>
                          )}
                        </div>

                        {/* Machine detail below */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-tight text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <span className="shrink-0">🛠️ {o.equipmentType} • {o.equipmentBrand}</span>
                            <span className="font-mono text-sm font-black text-neutral-900 dark:text-neutral-100">
                              {o.equipmentModel}
                            </span>
                          </h4>
                        </div>
                      </div>
                    </div>

                    {/* Right side actions and collapse/expand */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto pt-0.5 sm:pt-0">
                      <div className="hidden sm:block text-right mr-1.5">
                        <span className="text-[8px] font-black text-neutral-400 block uppercase tracking-widest leading-none mb-0.5 text-right font-bold">Status</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl ${statusColors}`}>
                          {o.status}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewOS) {
                            onViewOS(o.id);
                          } else {
                            setSelectedOS(o);
                          }
                        }}
                        className="p-1.5 bg-amber-300 hover:bg-amber-400 text-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                        title="Visualizar OS"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      
                      {onEditOS && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isReadOnly) {
                              onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
                              return;
                            }
                            onEditOS(o.id);
                          }}
                          className="p-1.5 bg-yellow-300 hover:bg-yellow-400 text-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-all shadow-sm cursor-pointer"
                          title="Editar OS"
                        >
                          <Hammer className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      )}
                      
                      <span className="text-neutral-400 dark:text-neutral-500 ml-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Area with additional details and core functional actions */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-neutral-100 dark:border-neutral-700/50 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/10">
                      {/* Dates Row */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                          <span className="text-[8px] font-black uppercase text-neutral-400 block tracking-wider leading-none mb-1">Data do Chamado</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                            {safeFormatDate(o.createdAt)}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                          <span className="text-[8px] font-black uppercase text-neutral-400 block tracking-wider leading-none mb-1">Data de Conclusão</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                            {o.completionDate ? safeFormatDate(o.completionDate) : 'Em andamento'}
                          </span>
                        </div>
                      </div>

                      {/* Issue truncation block */}
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl">
                        <span className="font-black uppercase text-[10px] text-neutral-500 mr-1 block mb-1">Problema Relatado:</span>
                        {o.reportedIssue}
                      </p>

                      {/* Actions footer */}
                      <div className="flex items-center justify-end pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewOS) {
                                onViewOS(o.id);
                              } else {
                                setSelectedOS(o);
                              }
                            }}
                            className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer transition-all active:translate-x-0.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar OS
                          </button>
                          {onEditOS ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isReadOnly) {
                                  onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
                                  return;
                                }
                                onEditOS(o.id);
                              }}
                              className={`bg-yellow-300 hover:bg-yellow-400 text-neutral-900 dark:text-neutral-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer transition-all active:translate-x-0.5 ${isReadOnly ? 'opacity-50 grayscale' : ''}`}
                              title="Editar OS Diretamente"
                            >
                              <Hammer className="w-3.5 h-3.5" />
                              Editar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stark neubrutalist modal overlay for inspected OS */}
      {selectedOS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 w-full max-w-2xl rounded-2xl shadow-sm dark:shadow-none overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Heading Section */}
            <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-yellow-300 w-5 h-5 stroke-[2.5]" />
                <span className="font-mono font-black text-yellow-300 tracking-wider uppercase text-sm">FICHA TÉCNICA DETALHADA: {selectedOS.idFormatado}</span>
              </div>
              <button 
                onClick={() => setSelectedOS(null)}
                className="bg-rose-500 hover:bg-rose-600 text-white dark:text-neutral-900 p-1 border-2 border-white rounded-2xl cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Header metrics */}
              <div className="grid grid-cols-2 gap-2 bg-yellow-100 dark:bg-yellow-900/50 border border-neutral-200 dark:border-neutral-700 p-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">STATUS ATUAL</span>
                  <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 mt-1 inline-block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5">{selectedOS.status}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">TOTAL ESTIMADO</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-black uppercase text-emerald-700 inline-block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 font-mono">
                      R$ {(selectedOS.totalCostValue || 0).toFixed(2)}
                    </span>
                    {selectedOS.discountValue && selectedOS.discountValue > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded">
                        {selectedOS.discountType === 'percentage' ? `-${selectedOS.discountValue}%` : `-R$ ${selectedOS.discountValue.toFixed(2)}`}
                      </span>
                    )}
                    {(selectedOS.isLaborCourtesy || selectedOS.isTravelCourtesy) && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                        CORTESIA: {selectedOS.isLaborCourtesy && 'MÃO DE OBRA'}{selectedOS.isLaborCourtesy && selectedOS.isTravelCourtesy && ' + '}{selectedOS.isTravelCourtesy && 'DESLOC.'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Client and location info */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">1. Registro de Atendimento & Cliente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-neutral-800">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" />
                    <span><strong className="font-extrabold uppercase">Nome:</strong> {selectedOS.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" />
                    <span><strong className="font-extrabold uppercase">Fone:</strong> {selectedOS.clientPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                    <Mail className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" />
                    <span><strong className="font-extrabold uppercase">E-mail:</strong> {selectedOS.clientEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" />
                    <span><strong className="font-extrabold uppercase">Endereço de Campo:</strong> {selectedOS.address}</span>
                  </div>
                </div>
              </div>

              {/* Machine Specs and Defect */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">2. Dados do Equipamento & Defeito</h4>
                <div className="bg-neutral-50 border border-neutral-200 dark:border-neutral-700 p-4 space-y-3 text-xs">
                  <div>
                    <span className="font-black text-neutral-500 uppercase block tracking-wider text-[9px]">EQUIPAMENTO SOB MANUTENÇÃO</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-neutral-900 dark:text-neutral-100 text-sm uppercase">{selectedOS.equipmentType} — {selectedOS.equipmentBrand}</span>
                      <span className="font-mono text-lg font-black text-neutral-900 dark:text-neutral-100">
                        {selectedOS.equipmentModel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-neutral-500 uppercase block tracking-wider text-[9px]">DEFEITO RECLAMADO EM TRIAGEM</span>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 mt-1 italic">"{selectedOS.reportedIssue}"</p>
                  </div>
                  {selectedOS.technicalDiagnosis && (
                    <div>
                      <span className="font-black text-neutral-800 uppercase block tracking-wider text-[9px]">DIAGNÓSTICO TÉCNICO OFICIAL</span>
                      <p className="font-medium text-blue-900 mt-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 p-2 font-mono">
                        {selectedOS.technicalDiagnosis}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Datas de Início e Finalização */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">Data de Início e Finalização</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 p-3 rounded-2xl">
                    <span className="font-black text-amber-900 dark:text-amber-300 uppercase block tracking-wider text-[9px] mb-1">DATA DE INÍCIO</span>
                    <span className="text-sm font-mono font-black text-neutral-900 dark:text-neutral-100 block">
                      {safeFormatDate(selectedOS.createdAt)}
                    </span>
                    <span className="block text-[9px] text-amber-800 dark:text-amber-200 font-medium mt-1">Data em que a Ordem de Serviço foi iniciada e cadastrada.</span>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-400 p-3 rounded-2xl">
                    <span className="font-black text-green-900 dark:text-green-300 uppercase block tracking-wider text-[9px] mb-1">DATA DE FINALIZAÇÃO</span>
                    <span className="text-sm font-mono font-black text-neutral-900 dark:text-neutral-100 block">
                      {selectedOS.completionDate ? safeFormatDate(selectedOS.completionDate) : 'Em andamento'}
                    </span>
                    <span className="block text-[9px] text-green-800 dark:text-green-200 font-medium mt-1">Data de conclusão do conserto e encerramento técnico.</span>
                  </div>
                </div>
              </div>

              {/* Technical progression Log */}
              {selectedOS.history && selectedOS.history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">3. Histórico de Tramitação Técnica</h4>
                  <div className="space-y-2 text-xs">
                    {selectedOS.history.map((h, i) => (
                      <div key={i} className="border border-neutral-200 dark:border-neutral-700 p-2 rounded-2xl bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="space-y-0.5">
                          <span className="font-black uppercase text-[10px] text-gray-500 block">
                            {new Date(h.date).toLocaleString('pt-BR')}
                          </span>
                          <span className="font-medium text-neutral-800">{h.description}</span>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mt-1 sm:mt-0">
                          <span className="bg-neutral-200 border border-neutral-200 dark:border-neutral-700 text-[9px] px-1.5 font-bold uppercase py-0.5">
                            {h.author}
                          </span>
                          <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[9px] px-1.5 font-black uppercase py-0.5">
                            {h.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="bg-neutral-100 border-t-2 border-black p-4 flex justify-end gap-2">
              {onEditOS && (
                <button
                  onClick={() => {
                    if (isReadOnly) {
                      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
                      return;
                    }
                    onEditOS(selectedOS.id);
                    setSelectedOS(null);
                  }}
                  className={`bg-yellow-300 hover:bg-yellow-400 text-neutral-900 dark:text-neutral-100 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${isReadOnly ? 'opacity-50 grayscale' : ''}`}
                >
                  <Hammer className="w-4 h-4 stroke-[3]" />
                  Editar OS
                </button>
              )}
              <button
                onClick={() => setSelectedOS(null)}
                className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
