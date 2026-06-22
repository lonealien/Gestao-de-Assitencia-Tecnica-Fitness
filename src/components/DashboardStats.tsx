import { useState } from 'react';
import { OrdemServico, UserRole } from '../types';
import { 
  Plus, AlertTriangle, ShieldCheck, Activity, RotateCw, CheckCircle, 
  Clock, DollarSign, Hammer, Calendar, Eye, X, Phone, Mail, MapPin, 
  User, ClipboardCheck, ArrowRight, ShieldAlert, FileText, Lock
} from 'lucide-react';

interface DashboardStatsProps {
  ordens: OrdemServico[];
  onOpenNewOSForm: () => void;
  currentRole: UserRole;
  isReadOnly?: boolean;
  onEditOS?: (id: string) => void;
  onShowBlockedAlert?: (message: string) => void;
}

export default function DashboardStats({
  ordens,
  onOpenNewOSForm,
  currentRole,
  isReadOnly,
  onEditOS,
  onShowBlockedAlert
}: DashboardStatsProps) {
  const [listFilter, setListFilter] = useState<'dia' | 'semana' | 'mes' | 'todos' | 'por-data' | 'historico' | 'pendentes' | 'conserto' | 'finalizadas'>('dia');
  const [customSearchStartDate, setCustomSearchStartDate] = useState<string>('2026-06-01');
  const [customSearchEndDate, setCustomSearchEndDate] = useState<string>('2026-06-18');
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);

  const total = ordens.length;
  const pendente = ordens.filter(o => o.status === 'Pendente').length;
  const emExecucao = ordens.filter(o => o.status === 'Em Conserto' || o.status === 'Em Execução' || o.status === 'Em Análise').length;
  const aguardandoPecas = ordens.filter(o => o.status === 'Aguardando Peças').length;
  const concluida = ordens.filter(o => o.status === 'Concluída').length;

  const totalRevenue = ordens
    .filter(o => o.status === 'Concluída')
    .reduce((acc, current) => acc + current.totalCostValue, 0);

  const pendingRevenue = ordens
    .filter(o => o.status !== 'Concluída' && o.status !== 'Cancelada')
    .reduce((acc, current) => acc + current.totalCostValue, 0);

  // Today Date calculation (simulated metadata today's date "2026-06-18" or local clock date)
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];

  // Helpers matching simulated date of metadata or standard clock
  const isTodayMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const cleanDate = d.toISOString().split('T')[0];
    return cleanDate === '2026-06-18' || cleanDate === todayStr;
  };

  const isWeekMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const cleanDate = d.toISOString().split('T')[0];
    const isSimWeek = cleanDate >= '2026-06-14' && cleanDate <= '2026-06-20';
    
    // System current week calculation
    const curr = new Date();
    const day = curr.getDay();
    const start = new Date(curr);
    start.setDate(curr.getDate() - day);
    const end = new Date(curr);
    end.setDate(curr.getDate() + (6 - day));
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const isSysWeek = cleanDate >= fmt(start) && cleanDate <= fmt(end);
    
    return isSimWeek || isSysWeek;
  };

  const isMonthMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const cleanDate = d.toISOString().split('T')[0];
    const isSimMonth = cleanDate.startsWith('2026-06');
    const isSysMonth = cleanDate.startsWith(todayStr.slice(0, 7));
    return isSimMonth || isSysMonth;
  };

  // Filter active and incomplete ordens
  const activeOrdens = ordens.filter(o => o.status !== 'Concluída' && o.status !== 'Cancelada');

  // Today scheduled/created orders
  const ordensDoDia = activeOrdens.filter(o => {
    const isTargetToday = isTodayMatch(o.scheduledVisitDate);
    const isCreatedToday = isTodayMatch(o.createdAt);
    return isTargetToday || isCreatedToday;
  });

  // Week scheduled/created orders
  const ordensDaSemana = activeOrdens.filter(o => {
    const isTargetWeek = isWeekMatch(o.scheduledVisitDate);
    const isCreatedWeek = isWeekMatch(o.createdAt);
    return isTargetWeek || isCreatedWeek;
  });

  // Month scheduled/created orders
  const ordensDoMes = activeOrdens.filter(o => {
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
    displayedOrdens = ordens.filter(o => o.status === 'Em Conserto' || o.status === 'Em Execução' || o.status === 'Em Análise' || o.status === 'Aguardando Peças');
  } else if (listFilter === 'finalizadas') {
    displayedOrdens = ordens.filter(o => o.status === 'Concluída');
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
                  onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura.");
                  return;
                }
                onOpenNewOSForm();
              }}
              className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm dark:shadow-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Abrir OS
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
              : 'bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:bg-yellow-900/50/50 dark:hover:bg-yellow-900/50 shadow-sm dark:shadow-none'
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
              : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-105/50 dark:hover:bg-blue-900/50 shadow-sm dark:shadow-none'
          }`}
        >
          <div className="flex justify-between items-start text-neutral-900 dark:text-neutral-100 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Em Conserto</span>
            <span className="bg-blue-400 text-white dark:text-neutral-900 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono tracking-tighter text-neutral-900 dark:text-neutral-100 block leading-none">{emExecucao + aguardandoPecas}</span>
            <span className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300 tracking-wide mt-1 block">
              {emExecucao} Ativas • {aguardandoPecas} Peças
            </span>
          </div>
        </button>

        {/* Resolved completely */}
        <button
          onClick={() => setListFilter('finalizadas')}
          className={`border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between min-h-[110px] cursor-pointer text-left transition-all hover:scale-[1.02] ${
            listFilter === 'finalizadas'
              ? 'bg-emerald-200 dark:bg-emerald-900/60 shadow-sm dark:shadow-none ring-2 ring-black font-semibold'
              : 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-105/50 dark:hover:bg-emerald-900/50 shadow-sm dark:shadow-none'
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
                CRONOGRAMA DE ATENDIMENTOS & VISITAS
              </h3>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                Filtre os agendamentos do dia, semana, mês ou acesse o histórico completo de datas
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
              Do Dia ({ordensDoDia.length})
            </button>
            <button
              onClick={() => setListFilter('semana')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-neutral-200 dark:border-neutral-700 transition-all rounded-2xl cursor-pointer ${
                listFilter === 'semana'
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Da Semana ({ordensDaSemana.length})
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
                  ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900 shadow-sm dark:shadow-none'
                  : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Fila Total Ativa ({activeOrdens.length})
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
              Em Conserto ({emExecucao + aguardandoPecas})
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
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100">Início:</span>
                <input 
                  type="date"
                  value={customSearchStartDate}
                  onChange={(e) => setCustomSearchStartDate(e.target.value)}
                  className="border border-neutral-200 dark:border-neutral-700 px-3 py-1 font-mono text-xs font-black text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none focus:bg-yellow-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100">Fim:</span>
                <input 
                  type="date"
                  value={customSearchEndDate}
                  onChange={(e) => setCustomSearchEndDate(e.target.value)}
                  className="border border-neutral-200 dark:border-neutral-700 px-3 py-1 font-mono text-xs font-black text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none focus:bg-yellow-50"
                />
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-700 md:ml-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedOrdens.map(o => {
              // Priority styling
              const prioBg = o.priority === 'Alta' ? 'bg-rose-100 text-rose-850'
                : o.priority === 'Média' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-850'
                : 'bg-neutral-100 text-neutral-700';

              // Status styling
              const statusColors = o.status === 'Pendente' ? 'bg-yellow-300 dark:bg-yellow-400 text-neutral-900'
                : o.status === 'Em Execução' ? 'bg-blue-400 text-white dark:text-neutral-900'
                : o.status === 'Aguardando Peças' ? 'bg-purple-100 text-purple-900 border-purple-300'
                : o.status === 'Em Análise' ? 'bg-cyan-100 text-cyan-900'
                : 'bg-neutral-200 text-neutral-900 dark:text-neutral-100';

              const isPrevistoHoje = isTodayMatch(o.deliveryTargetDate);

              return (
                <div 
                  key={o.id} 
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md  transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    {/* ID and Badges row */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black tracking-widest text-neutral-900 dark:text-neutral-100 bg-neutral-100 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5">
                        {o.idFormatado}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isPrevistoHoje && (
                          <span className="bg-red-500 text-white dark:text-neutral-900 text-[9px] font-black uppercase px-1.5 py-0.5 tracking-wider border border-neutral-200 dark:border-neutral-700 animate-pulse">
                            PREVISTO HOJE
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl ${prioBg}`}>
                          {o.priority}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl ${statusColors}`}>
                          {o.status}
                        </span>
                      </div>
                    </div>

                    {/* Machine and client detail */}
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        {o.equipmentType} • {o.equipmentBrand}
                        <span className="font-normal font-mono text-xs text-neutral-500">({o.equipmentModel})</span>
                      </h4>
                      <p className="text-xs text-neutral-500 font-bold mt-1 uppercase tracking-wide flex items-center gap-1">
                        <User className="w-3.5 h-3.5 stroke-[2]" />
                        {o.clientName}
                      </p>
                    </div>

                    {/* Issue truncation */}
                    <p className="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 dark:border-neutral-700 p-2 line-clamp-2">
                      <span className="font-black uppercase text-[10px] text-neutral-500 mr-1">Problema:</span>
                      {o.reportedIssue}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-tighter">
                      Prev: {o.deliveryTargetDate ? o.deliveryTargetDate.split('-').reverse().join('/') : 'Sem previsão'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedOS(o)}
                        className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer transition-all active:translate-x-0.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizar Ficha
                      </button>
                      {onEditOS ? (
                        <button
                          onClick={() => {
                            if (isReadOnly && currentRole !== 'ADMIN') {
                              onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura.");
                              return;
                            }
                            onEditOS(o.id);
                          }}
                          className="bg-yellow-300 hover:bg-yellow-400 text-neutral-900 dark:text-neutral-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer transition-all active:translate-x-0.5"
                          title="Editar OS Diretamente"
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-yellow-100 dark:bg-yellow-900/50 border border-neutral-200 dark:border-neutral-700 p-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">STATUS ATUAL</span>
                  <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 mt-1 inline-block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5">{selectedOS.status}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">GRAU DE URGÊNCIA</span>
                  <span className="text-xs font-black uppercase text-rose-600 mt-1 inline-block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5">{selectedOS.priority}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-black uppercase text-gray-500 block leading-none">OUTLAY ESTIMADO</span>
                  <span className="text-xs font-black uppercase text-emerald-700 mt-1 inline-block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 font-mono">R$ {selectedOS.totalCostValue.toFixed(2)}</span>
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
                    <span className="font-black text-neutral-900 dark:text-neutral-100 text-sm uppercase">{selectedOS.equipmentType} — {selectedOS.equipmentBrand} <span className="font-mono text-neutral-500 font-normal">({selectedOS.equipmentModel})</span></span>
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

              {/* Metas e Compromissos */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">Metas de SLA & Prazos Limites Pactuados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 p-3 rounded-2xl">
                    <span className="font-black text-amber-900 dark:text-amber-300 uppercase block tracking-wider text-[9px] mb-1">CUMPRIMENTO DO PRIMEIRO ATENDIMENTO</span>
                    <span className="text-sm font-mono font-black text-neutral-900 dark:text-neutral-100 block">
                      {(() => {
                        const limitAtendimento = selectedOS.atendimentoLimitDate || new Date(new Date(selectedOS.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        return limitAtendimento.split('-').reverse().join('/');
                      })()}
                    </span>
                    <span className="block text-[9px] text-amber-800 dark:text-amber-200 font-medium mt-1">Limite: 2 dias úteis de triagem pós-abertura (ou data prorrogada).</span>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 p-3 rounded-2xl">
                    <span className="font-black text-blue-900 dark:text-blue-300 uppercase block tracking-wider text-[9px] mb-1">CUMPRIMENTO DA RESOLUÇÃO (CONSERTO)</span>
                    <span className="text-sm font-mono font-black text-neutral-900 dark:text-neutral-100 block">
                      {selectedOS.deliveryTargetDate.split('-').reverse().join('/')}
                    </span>
                    <span className="block text-[9px] text-blue-800 dark:text-blue-200 font-medium mt-1">Limite: 14 dias para encerramento técnico (ou data prorrogada).</span>
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
              {onEditOS && (!isReadOnly || currentRole === 'ADMIN') && (
                <button
                  onClick={() => {
                    onEditOS(selectedOS.id);
                    setSelectedOS(null);
                  }}
                  className="bg-yellow-300 hover:bg-yellow-400 text-neutral-900 dark:text-neutral-100 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
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
