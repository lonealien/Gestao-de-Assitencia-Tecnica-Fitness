import { useState, useEffect } from 'react';
import { OrdemServico, AssistenciaTecnica, Tecnico, OSStatus, OSHistory, UserRole, Part, AppUser, StoreSettings } from '../types';
import { 
  Search, Filter, Eye, Hammer, ClipboardCheck, Clock, AlertTriangle, 
  User, CheckCircle, Ban, MessageSquarePlus, PenTool, Check, MapPin, 
  Sparkles, ShieldAlert, History, Plus, Trash2, FileText, Download, Image as ImageIcon, ExternalLink, Navigation, DollarSign, Camera, X, ChevronDown, ChevronUp, Banknote,
  Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { cleanOklabFromStylesheets } from '../utils';
import { SignaturePad } from './SignaturePad';

interface OrdemServicoListProps {
  ordens: OrdemServico[];
  assistencias: AssistenciaTecnica[];
  usuarios: AppUser[];
  currentRole: UserRole;
  activeRoleEntityId?: string; // ast-id or tec-id
  activeUserName: string;
  storeSettings: StoreSettings;
  onUpdateOS: (updatedOS: OrdemServico) => void;
  onDeleteOS?: (id: string) => void;
  isReadOnly?: boolean;
  initialSelectedOSId?: string | null;
  onClearInitialSelectedOSId?: () => void;
  initialExportOSId?: string | null;
  onClearInitialExportOSId?: () => void;
  onShowBlockedAlert?: (message: string) => void;
  onlyModals?: boolean;
}

const compressImage = (file: File, maxWidth = 1920): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function OrdemServicoList({
  ordens,
  assistencias,
  usuarios,
  currentRole,
  activeRoleEntityId,
  activeUserName,
  storeSettings,
  onUpdateOS,
  onDeleteOS,
  isReadOnly,
  initialSelectedOSId,
  onClearInitialSelectedOSId,
  initialExportOSId,
  onClearInitialExportOSId,
  onShowBlockedAlert,
  onlyModals = false
}: OrdemServicoListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [selectedOSId, setSelectedOSId] = useState<string | null>(null);
  const [quickAssignOSId, setQuickAssignOSId] = useState<string | null>(null);
  const [quickTecId, setQuickTecId] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Agenda / Visit Date Filters for Technical role
  const [dateAgendaFilter, setDateAgendaFilter] = useState<'Semana' | 'Hoje' | 'Amanhã' | 'Mês' | 'Todos' | 'Específica'>('Hoje');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [showCompleted, setShowCompleted] = useState(false);
  const [showEditVisitCalendar, setShowEditVisitCalendar] = useState(false);
  const [showEditRescheduleCalendar, setShowEditRescheduleCalendar] = useState(false);
  const [showEditCompletionCalendar, setShowEditCompletionCalendar] = useState(false);
  const [editVisitCalendarViewDate, setEditVisitCalendarViewDate] = useState<Date>(new Date());
  const [editRescheduleCalendarViewDate, setEditRescheduleCalendarViewDate] = useState<Date>(new Date());
  const [editCompletionCalendarViewDate, setEditCompletionCalendarViewDate] = useState<Date>(new Date());

  // For adding history/updates
  const [newStatus, setNewStatus] = useState<OSStatus | ''>('');
  const [servicoRealizado, setServicoRealizado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [technicalDiagnosisText, setTechnicalDiagnosisText] = useState('');
  const [costInput, setCostInput] = useState<number | ''>('');
  
  const [editParts, setEditParts] = useState<Part[]>([]);
  const [editPartName, setEditPartName] = useState('');
  const [editPartQuantity, setEditPartQuantity] = useState(1);
  const [editPartValue, setEditPartValue] = useState(0);

  const [laborCostInput, setLaborCostInput] = useState<number | ''>('');
  const [editTaxaDeslocamento, setEditTaxaDeslocamento] = useState<number | ''>('');
  const [assigneeTecnicoId, setAssigneeTecnicoId] = useState<string>('');
  const [editScheduledVisitDate, setEditScheduledVisitDate] = useState<string>('');
  const [editIsRescheduled, setEditIsRescheduled] = useState<boolean>(false);
  const [editRescheduledVisitDate, setEditRescheduledVisitDate] = useState<string>('');
  const [editCompletionDate, setEditCompletionDate] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<OrdemServico['paymentMethod'] | ''>('');
  const [editInstallments, setEditInstallments] = useState<number>(1);
  const [editAdditionalContacts, setEditAdditionalContacts] = useState<{name: string, phone: string}[]>([]);
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [editIsLaborCourtesy, setEditIsLaborCourtesy] = useState(false);
  const [editIsTravelCourtesy, setEditIsTravelCourtesy] = useState(false);
  const [osToConfirmStatus, setOsToConfirmStatus] = useState<OrdemServico | null>(null);

  // Signature states for editing OS
  const [sigTecnicoAberturaInput, setSigTecnicoAberturaInput] = useState<string>('');
  const [sigClienteAberturaInput, setSigClienteAberturaInput] = useState<string>('');
  const [sigClienteAberturaTypeInput, setSigClienteAberturaTypeInput] = useState<'drawn' | 'typed'>('drawn');
  const [sigClienteAberturaTypedInput, setSigClienteAberturaTypedInput] = useState<string>('');
  const [sigTecnicoFinalInput, setSigTecnicoFinalInput] = useState<string>('');
  const [sigClienteFinalInput, setSigClienteFinalInput] = useState<string>('');
  const [sigAberturaDataInput, setSigAberturaDataInput] = useState<string>('');
  const [sigFinalDataInput, setSigFinalDataInput] = useState<string>('');

  const safeFormatDate = (dateVal: string | undefined | null) => {
    if (!dateVal) return '-';
    try {
      const parts = dateVal.split('-');
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

  const safeFormatDateTime = (dateVal: string | undefined | null) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return '-';
    }
  };
  const [editFotos, setEditFotos] = useState<{url: string; description: string}[]>([]);

  const [expandedOSId, setExpandedOSId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const [osToExport, setOsToExport] = useState<OrdemServico | null>(null);
  const [includePhotosInPdf, setIncludePhotosInPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Helper to get YYYY-MM-DD in local time
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Help calculate dates
  const todayStr = getLocalDateStr(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  useEffect(() => {
    if (initialSelectedOSId) {
      const os = ordens.find(o => o.id === initialSelectedOSId);
      if (os) {
        handleEditOS(os);

        // Reset all list filters to allow targeted element rendering
        setStatusFilter('Todos');
        setDateAgendaFilter('Todos'); // Changed from 'Semana' to 'Todos' for better visibility
        setSearch('');
        if (os.status === 'Finalizada') {
          setShowCompleted(true);
        }

        // Scroll the target card directly into the viewport with attention-grabbing flash
        setTimeout(() => {
          const element = document.getElementById(`os-card-${initialSelectedOSId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-yellow-400');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-yellow-400');
            }, 3000);
          }
        }, 300);
      }
      if (onClearInitialSelectedOSId) {
        onClearInitialSelectedOSId();
      }
    }
  }, [initialSelectedOSId, ordens, currentRole, onClearInitialSelectedOSId]);

  useEffect(() => {
    if (initialExportOSId) {
      const os = ordens.find(o => o.id === initialExportOSId);
      if (os) {
        setOsToExport(os);
      }
      if (onClearInitialExportOSId) {
        onClearInitialExportOSId();
      }
    }
  }, [initialExportOSId, ordens, onClearInitialExportOSId]);

  const handleEditOS = (os: OrdemServico) => {
    if (isReadOnly) {
      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
      return;
    }
    setSelectedOSId(os.id);
    if (currentRole === 'TECNICO' && os.status === 'Pendente') {
      setNewStatus('Pendente');
    } else {
      setNewStatus(os.status);
    }
    setTechnicalDiagnosisText(os.technicalDiagnosis || '');
    setServicoRealizado(os.servicoRealizado || '');
    setObservacoes(os.observacoes || '');
    setCostInput(os.totalCostValue || '');
    setEditParts(os.parts || []);
    setLaborCostInput(os.laborCostValue || '');
    setEditTaxaDeslocamento(os.taxaDeslocamento || 0);
    setAssigneeTecnicoId(os.tecnicoId || '');
    setEditScheduledVisitDate(os.scheduledVisitDate || '');
    setEditIsRescheduled(os.isRescheduled || false);
    setEditRescheduledVisitDate(os.rescheduledVisitDate || '');
    setEditAdditionalContacts(os.additionalContacts || []);
    setEditCompletionDate(os.completionDate || '');
    setEditPaymentMethod(os.paymentMethod || '');
    setEditInstallments(os.installments || 1);
    setEditDiscountValue(os.discountValue || 0);
    setEditDiscountType(os.discountType || 'fixed');
    setEditIsLaborCourtesy(os.isLaborCourtesy || false);
    setEditIsTravelCourtesy(os.isTravelCourtesy || false);
    
    // Load signatures
    setSigTecnicoAberturaInput(os.sigTecnicoAbertura || '');
    setSigClienteAberturaInput(os.sigClienteAbertura || '');
    setSigClienteAberturaTypeInput(os.sigClienteAberturaType || 'drawn');
    setSigClienteAberturaTypedInput(os.sigClienteAberturaTyped || '');
    setSigTecnicoFinalInput(os.sigTecnicoFinal || '');
    setSigClienteFinalInput(os.sigClienteFinal || '');
    setSigAberturaDataInput(os.sigAberturaData || '');
    setSigFinalDataInput(os.sigFinalData || '');

    let allFotos: {url: string; description: string}[] = [];
    if (os.fotos) {
      allFotos = [...os.fotos];
    } else {
      // Migrate legacy format to unified format
      if (os.fotosAntes) allFotos = [...allFotos, ...os.fotosAntes.map(url => ({url, description: "Antes"}))];
      if (os.fotosDepois) allFotos = [...allFotos, ...os.fotosDepois.map(url => ({url, description: "Depois/Conclusão"}))];
    }
    setEditFotos(allFotos);
  };

  useEffect(() => {
    // Ensure all OS cards are minimized by default on load
    setExpandedCards({});
  }, [ordens]);

  useEffect(() => {
    if (dateAgendaFilter !== 'Específica') {
      setShowCalendarPopover(false);
    }
  }, [dateAgendaFilter]);

  // Dynamically calculate estimated total budget for modified OS
  useEffect(() => {
    if (selectedOSId) {
      const partsSum = editParts.reduce((acc, p) => acc + (p.value * p.quantity), 0);
      const labor = editIsLaborCourtesy ? 0 : (Number(laborCostInput) || 0);
      const deslocamento = editIsTravelCourtesy ? 0 : (Number(editTaxaDeslocamento) || 0);
      
      let subtotal = partsSum + labor + deslocamento;
      let finalTotal = subtotal;
      
      if (editDiscountValue > 0) {
        if (editDiscountType === 'fixed') {
          finalTotal = Math.max(0, subtotal - editDiscountValue);
        } else {
          finalTotal = Math.max(0, subtotal * (1 - editDiscountValue / 100));
        }
      }
      
      setCostInput(finalTotal);
    }
  }, [editParts, laborCostInput, editTaxaDeslocamento, selectedOSId, editIsLaborCourtesy, editIsTravelCourtesy, editDiscountValue, editDiscountType]);

  // 1. Filter based on Role Scope
  let scopedOrdens = [...ordens];
  if (currentRole === 'ASSISTENCIA_GERENTE' && activeRoleEntityId) {
    scopedOrdens = ordens.filter(o => o.assistenciaId === activeRoleEntityId);
  } else if (currentRole === 'TECNICO' && activeRoleEntityId) {
    if (showCompleted) {
      scopedOrdens = ordens.filter(o => 
        o.tecnicoId === activeRoleEntityId && 
        o.status === 'Finalizada'
      );
    } else {
      scopedOrdens = ordens.filter(o => 
        o.tecnicoId === activeRoleEntityId && 
        o.status !== 'Finalizada'
      );
    }
  }

  // 2. Filter based on Search and Filter Dropdowns
  const finalFilteredOrdens = scopedOrdens.filter(o => {
    // Always include the OS that is currently being edited so the modal doesn't disappear if filters change
    if (selectedOSId === o.id) return true;

    const matchesSearch = 
      o.idFormatado.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentBrand.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentModel.toLowerCase().includes(search.toLowerCase()) ||
      o.reportedIssue.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;

    // Get today and tomorrow date string for comparisons
    const todayStr = getLocalDateStr(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateStr(tomorrow);

    // Filter by appointment visit date for technician agenda
    const matchesDate = (() => {
      if (dateAgendaFilter === 'Semana') {
        if (!o.scheduledVisitDate) return false;
        const cleanDate = o.scheduledVisitDate.substring(0, 10);
        const curr = new Date();
        const day = curr.getDay(); // 0 is Sunday, 6 is Saturday
        const start = new Date(curr);
        start.setDate(curr.getDate() - day);
        const end = new Date(curr);
        end.setDate(curr.getDate() + (6 - day));
        const startStr = getLocalDateStr(start);
        const endStr = getLocalDateStr(end);
        return cleanDate >= startStr && cleanDate <= endStr;
      }
      const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
      if (dateAgendaFilter === 'Hoje') {
        return scheduledStr === todayStr || o.isRescheduled === true;
      }
      if (dateAgendaFilter === 'Amanhã') {
        return scheduledStr === tomorrowStr;
      }
      if (dateAgendaFilter === 'Mês') {
        if (!o.scheduledVisitDate && !o.createdAt) return false;
        const cleanDate = (o.scheduledVisitDate || o.createdAt).substring(0, 7);
        return cleanDate === todayStr.substring(0, 7);
      }
      if (dateAgendaFilter === 'Todos') return true;
      if (dateAgendaFilter === 'Específica' && specificDate) return scheduledStr === (specificDate ? specificDate.substring(0, 10) : '');
      return true;
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: OSStatus) => {
    switch (status) {
      case 'Pendente': return 'bg-neutral-100 text-neutral-900 dark:text-neutral-100 border-black';
      case 'Aguardando Peça': return 'bg-amber-300 dark:bg-amber-400 text-neutral-900 border-black';
      case 'Aguardando Reagendamento': return 'bg-orange-300 dark:bg-orange-400 text-neutral-900 border-black';
      case 'Finalizada': return 'bg-emerald-300 dark:bg-emerald-400 text-neutral-900 border-black';
      case 'Cancelada': return 'bg-rose-400 text-neutral-900 dark:text-neutral-100 border-black';
      default: return 'bg-neutral-100 text-neutral-900';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Alta': return 'text-white bg-red-400 dark:bg-red-500 dark:bg-red-900/80 border border-neutral-200 dark:border-neutral-700 font-black uppercase px-2 py-0.5 rounded-2xl text-[10px] tracking-wider';
      case 'Média': return 'text-neutral-900 bg-yellow-300 dark:bg-yellow-400 border border-neutral-200 dark:border-neutral-700 font-black uppercase px-2 py-0.5 rounded-2xl text-[10px] tracking-wider';
      case 'Baixa': return 'text-neutral-900 bg-emerald-300 dark:bg-emerald-400 border border-neutral-200 dark:border-neutral-700 font-black uppercase px-2 py-0.5 rounded-2xl text-[10px] tracking-wider';
      default: return 'text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 font-black uppercase px-2 py-0.5 rounded-2xl text-[10px] tracking-wider';
    }
  };

  const handleApplyUpdate = (os: OrdemServico, overrideStatus?: OSStatus) => {
    if (isReadOnly) {
      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
      return;
    }
    const hasVisitDateChanged = editScheduledVisitDate !== (os.scheduledVisitDate || '');

    // Determine target/applied status.
    let appliedStatus = overrideStatus || newStatus || os.status;
    
    // Automatically set status to 'Aguardando Reagendamento' if rescheduled and not overridden to Finalizada
    if (editIsRescheduled && overrideStatus !== 'Finalizada') {
      if (!editRescheduledVisitDate) {
        appliedStatus = 'Aguardando Reagendamento';
      } else {
        appliedStatus = overrideStatus || newStatus || 'Pendente';
      }
    }

    let finalCompletionDate = editCompletionDate;

    // If the status is NOT 'Finalizada', we should NOT have a completion date!
    if (appliedStatus !== 'Finalizada') {
      finalCompletionDate = '';
    } else {
      // Check if we are finalizing or if there are final signatures being added, but completion date is empty
      const isFinalizing = appliedStatus === 'Finalizada' || 
                           (sigTecnicoFinalInput && sigTecnicoFinalInput !== (os.sigTecnicoFinal || '')) || 
                           (sigClienteFinalInput && sigClienteFinalInput !== (os.sigClienteFinal || ''));
                           
      if (isFinalizing && (!finalCompletionDate || finalCompletionDate.trim() === '') && !os.completionDate) {
        finalCompletionDate = new Date().toISOString().split('T')[0];
      }
    }

    if (finalCompletionDate && finalCompletionDate.trim() !== '') {
      const startDateStr = os.createdAt ? os.createdAt.split('T')[0] : '';
      if (startDateStr && finalCompletionDate < startDateStr) {
        alert(`A data de finalização (${finalCompletionDate.split('-').reverse().join('/')}) não pode ser anterior à data de início (${startDateStr.split('-').reverse().join('/')}).`);
        return;
      }
      appliedStatus = 'Finalizada';
    }

    // If the OS is Finalizada, it leaves the scheduled/rescheduled status
    const finalIsRescheduled = appliedStatus === 'Finalizada' ? false : editIsRescheduled;
    const hasIsRescheduledChanged = finalIsRescheduled !== (os.isRescheduled || false);
    const finalRescheduledVisitDate = finalIsRescheduled ? editRescheduledVisitDate : '';
    const hasRescheduledVisitDateChanged = finalRescheduledVisitDate !== (os.rescheduledVisitDate || '');

    const hasSigsChanged = 
      sigTecnicoAberturaInput !== (os.sigTecnicoAbertura || '') ||
      sigClienteAberturaInput !== (os.sigClienteAbertura || '') ||
      sigClienteAberturaTypeInput !== (os.sigClienteAberturaType || 'drawn') ||
      sigClienteAberturaTypedInput !== (os.sigClienteAberturaTyped || '') ||
      sigTecnicoFinalInput !== (os.sigTecnicoFinal || '') ||
      sigClienteFinalInput !== (os.sigClienteFinal || '');

    const hasTecnicoChanged = assigneeTecnicoId !== (os.tecnicoId || '');

    const hasFieldsChanged =
      servicoRealizado.trim() !== (os.servicoRealizado || '') ||
      observacoes.trim() !== (os.observacoes || '') ||
      technicalDiagnosisText.trim() !== (os.technicalDiagnosis || '') ||
      hasTecnicoChanged;

    const hasFotosChanged = 
      JSON.stringify(editFotos) !== JSON.stringify(os.fotos || []);

    const hasContactsChanged = JSON.stringify(editAdditionalContacts) !== JSON.stringify(os.additionalContacts || []);

    const hasCompletionDateChanged = finalCompletionDate !== (os.completionDate || '');
    const hasStatusChanged = appliedStatus !== os.status;
    const hasPaymentMethodChanged = editPaymentMethod !== (os.paymentMethod || '');
    const hasInstallmentsChanged = (editPaymentMethod === 'Cartão de Crédito' ? editInstallments : undefined) !== os.installments;

    if (!hasStatusChanged && !hasFieldsChanged && (costInput === '') && !hasVisitDateChanged && !hasIsRescheduledChanged && !hasRescheduledVisitDateChanged && !hasCompletionDateChanged && !hasSigsChanged && !hasFotosChanged && !hasPaymentMethodChanged && !hasInstallmentsChanged && !hasContactsChanged) {
      alert('Por favor, informe alguma alteração para atualizar a ordem de serviço.');
      return;
    }

    const updatedOS = { ...os };
    const dateFormatted = new Date().toISOString();
    const historyEntries: OSHistory[] = [];

    if (hasContactsChanged) {
      updatedOS.additionalContacts = editAdditionalContacts.length > 0 ? editAdditionalContacts : undefined;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: 'Contatos adicionais atualizados.',
        author: activeUserName
      });
    }

    if (hasVisitDateChanged) {
      updatedOS.scheduledVisitDate = editScheduledVisitDate;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: `Data de atendimento alterada para ${editScheduledVisitDate.split('-').reverse().join('/')}`,
        author: activeUserName
      });
    }

    if (hasIsRescheduledChanged || hasRescheduledVisitDateChanged) {
      updatedOS.isRescheduled = finalIsRescheduled;
      if (finalIsRescheduled) {
        updatedOS.rescheduledVisitDate = finalRescheduledVisitDate;
        historyEntries.push({
          date: dateFormatted,
          status: os.status,
          description: `Visita marcada como reagendada${finalRescheduledVisitDate ? ` para ${finalRescheduledVisitDate.split('-').reverse().join('/')}` : ''}.`,
          author: activeUserName
        });
      } else {
        delete updatedOS.rescheduledVisitDate;
        historyEntries.push({
          date: dateFormatted,
          status: os.status,
          description: `Visita desmarcada como reagendada (finalizada).`,
          author: activeUserName
        });
      }
    }

    if (hasPaymentMethodChanged || hasInstallmentsChanged) {
      if (editPaymentMethod) {
        updatedOS.paymentMethod = editPaymentMethod;
        if (editPaymentMethod === 'Cartão de Crédito') {
          updatedOS.installments = editInstallments;
        } else {
          delete updatedOS.installments;
        }
      } else {
        delete updatedOS.paymentMethod;
        delete updatedOS.installments;
      }
      const desc = editPaymentMethod === 'Cartão de Crédito' 
        ? `Forma de pagamento atualizada para: ${editPaymentMethod} (${editInstallments}x)`
        : `Forma de pagamento atualizada para: ${editPaymentMethod || 'Não informada'}`;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: desc,
        author: activeUserName
      });
    }

    if (hasCompletionDateChanged) {
      updatedOS.completionDate = finalCompletionDate;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: `Data de finalização registrada como ${finalCompletionDate ? finalCompletionDate.split('-').reverse().join('/') : 'N/A'}`,
        author: activeUserName
      });
    }

    // Signature trace & implementation
    if (sigTecnicoAberturaInput !== (os.sigTecnicoAbertura || '')) {
      updatedOS.sigTecnicoAbertura = sigTecnicoAberturaInput;
      if (sigTecnicoAberturaInput) {
        updatedOS.sigAberturaData = dateFormatted;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Assinatura do Técnico na Primeira Visita (Abertura) registrada`,
          author: activeUserName
        });
      } else {
        delete updatedOS.sigAberturaData;
      }
    }

    const clientSigChanged = 
      sigClienteAberturaInput !== (os.sigClienteAbertura || '') ||
      sigClienteAberturaTypeInput !== (os.sigClienteAberturaType || 'drawn') ||
      sigClienteAberturaTypedInput !== (os.sigClienteAberturaTyped || '');

    if (clientSigChanged) {
      updatedOS.sigClienteAberturaType = sigClienteAberturaTypeInput;
      
      if (sigClienteAberturaTypeInput === 'drawn') {
        updatedOS.sigClienteAbertura = sigClienteAberturaInput;
        updatedOS.sigClienteAberturaTyped = '';
        
        if (sigClienteAberturaInput) {
          updatedOS.sigAberturaData = dateFormatted;
          historyEntries.push({
            date: dateFormatted,
            status: updatedOS.status,
            description: `Assinatura do Cliente na Primeira Visita (Abertura, Desenho) registrada`,
            author: activeUserName
          });
        } else if (!sigTecnicoAberturaInput) {
          delete updatedOS.sigAberturaData;
        }
      } else {
        updatedOS.sigClienteAbertura = '';
        updatedOS.sigClienteAberturaTyped = sigClienteAberturaTypedInput;
        
        if (sigClienteAberturaTypedInput.trim()) {
          updatedOS.sigAberturaData = dateFormatted;
          historyEntries.push({
            date: dateFormatted,
            status: updatedOS.status,
            description: `Assinatura do Cliente na Primeira Visita (Abertura, Digitado) registrada: "${sigClienteAberturaTypedInput}"`,
            author: activeUserName
          });
        } else if (!sigTecnicoAberturaInput) {
          delete updatedOS.sigAberturaData;
        }
      }
    }

    if (sigTecnicoFinalInput !== (os.sigTecnicoFinal || '')) {
      updatedOS.sigTecnicoFinal = sigTecnicoFinalInput;
      if (sigTecnicoFinalInput) {
        updatedOS.sigFinalData = dateFormatted;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Assinatura do Técnico no Término (Última Visita / Conclusão) registrada`,
          author: activeUserName
        });
      } else {
        delete updatedOS.sigFinalData;
      }
    }

    if (sigClienteFinalInput !== (os.sigClienteFinal || '')) {
      updatedOS.sigClienteFinal = sigClienteFinalInput;
      if (sigClienteFinalInput) {
        updatedOS.sigFinalData = dateFormatted;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Assinatura do Cliente no Término (Última Visita / Conclusão) registrada`,
          author: activeUserName
        });
      } else if (!sigTecnicoFinalInput) {
        delete updatedOS.sigFinalData;
      }
    }

    // 1. Diagnosis, Service Performed & Observations Update
    if (technicalDiagnosisText.trim() !== (os.technicalDiagnosis || '')) {
      updatedOS.technicalDiagnosis = technicalDiagnosisText;
      historyEntries.push({
        date: dateFormatted,
        status: updatedOS.status,
        description: `Diagnóstico técnico atualizado: "${technicalDiagnosisText}"`,
        author: activeUserName
      });
    }

    if (servicoRealizado.trim() !== (os.servicoRealizado || '')) {
      updatedOS.servicoRealizado = servicoRealizado;
      historyEntries.push({
        date: dateFormatted,
        status: updatedOS.status,
        description: `Serviço realizado atualizado: "${servicoRealizado}"`,
        author: activeUserName
      });
    }

    if (observacoes.trim() !== (os.observacoes || '')) {
      updatedOS.observacoes = observacoes;
      historyEntries.push({
        date: dateFormatted,
        status: updatedOS.status,
        description: `Observações atualizadas: "${observacoes}"`,
        author: activeUserName
      });
    }

    // 2. Cost Update
    if (costInput !== '' || editParts.length > 0 || laborCostInput !== '' || editTaxaDeslocamento !== '') {
      updatedOS.totalCostValue = Number(costInput || 0);
      updatedOS.parts = editParts;
      updatedOS.partsCostValue = editParts.reduce((acc, part) => acc + (part.value * part.quantity), 0);
      updatedOS.laborCostValue = Number(laborCostInput || 0);
      updatedOS.taxaDeslocamento = Number(editTaxaDeslocamento || 0);
      updatedOS.discountValue = Number(editDiscountValue || 0);
      updatedOS.discountType = editDiscountType;
      updatedOS.isLaborCourtesy = editIsLaborCourtesy;
      updatedOS.isTravelCourtesy = editIsTravelCourtesy;
      
      historyEntries.push({
        date: dateFormatted,
        status: updatedOS.status,
        description: `Valores ajustados: Total R$ ${Number(costInput || 0).toFixed(2)}, Mão de Obra R$ ${Number(laborCostInput || 0).toFixed(2)}, Deslocamento R$ ${Number(editTaxaDeslocamento || 0).toFixed(2)}`,
        author: activeUserName
      });
    }

    // 3. Technician Reassignment
    if (hasTecnicoChanged) {
      if (assigneeTecnicoId) {
        const selectedTec = usuarios.find(u => u.tecnicoId === assigneeTecnicoId || u.id === assigneeTecnicoId);
        updatedOS.tecnicoId = assigneeTecnicoId;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Técnico alterado para: ${selectedTec ? selectedTec.name : assigneeTecnicoId}`,
          author: activeUserName
        });
      } else {
        updatedOS.tecnicoId = null;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Técnico desvinculado da Ordem de Serviço`,
          author: activeUserName
        });
      }
    }

    // 4. Status Update
    if (appliedStatus !== os.status) {
      updatedOS.status = appliedStatus;
      historyEntries.push({
        date: dateFormatted,
        status: appliedStatus,
        description: `Status alterado de "${os.status}" para "${appliedStatus}".${observacoes ? ` Observações: ${observacoes}` : ''}`,
        author: activeUserName
      });
    }

    updatedOS.fotos = editFotos;
    // We can clear legacy fields when saving to avoid duplicating data.
    delete updatedOS.fotosAntes;
    delete updatedOS.fotosDepois;
    updatedOS.history = [...updatedOS.history, ...historyEntries];
    
    onUpdateOS(updatedOS);
    setSelectedOSId(null);

    // Reset input fields
    setNewStatus('');
    setServicoRealizado('');
    setObservacoes('');
    setTechnicalDiagnosisText('');
    setCostInput('');
    setEditParts([]);
    setEditPartName('');
    setEditPartQuantity(1);
    setEditPartValue(0);
    setLaborCostInput('');
    setEditTaxaDeslocamento('');
    setAssigneeTecnicoId('');
    setEditScheduledVisitDate('');
    setEditIsRescheduled(false);
    setEditRescheduledVisitDate('');
    setEditAdditionalContacts([]);
    setEditCompletionDate('');
    setEditPaymentMethod('');
    
    // Clear signature drafts
    setSigTecnicoAberturaInput('');
    setSigClienteAberturaInput('');
    setSigTecnicoFinalInput('');
    setSigClienteFinalInput('');
    setSigAberturaDataInput('');
    setSigFinalDataInput('');
  };

  const handleQuickAssign = (os: OrdemServico, tecId: string) => {
    if (isReadOnly) {
       onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
       return;
    }
    
    if (!tecId) return;

    const selectedTec = usuarios.find(u => u.tecnicoId === tecId || u.id === tecId);
    const dateFormatted = new Date().toISOString();
    
    const updatedOS = { 
      ...os,
      tecnicoId: tecId,
      history: [
        ...os.history,
        {
          date: dateFormatted,
          status: os.status,
          description: `Técnico ESCALADO RAPIDAMENTE para: ${selectedTec ? selectedTec.name : tecId}`,
          author: activeUserName
        }
      ]
    };

    onUpdateOS(updatedOS);
    setQuickAssignOSId(null);
    setQuickTecId('');
  };

   const handleDownloadPdf = async () => {
    const page1Node = document.getElementById('os-receipt-card-page1');
    if (!page1Node) return;
    
    setIsExportingImage(true);
    let restoreStyles: (() => void) | null = null;
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      restoreStyles = await cleanOklabFromStylesheets();
      
      const pixelRatio = 2; // Reduced to 2 for stability and lower memory consumption
      
      // Capture Page 1
      const originalWidth1 = page1Node.offsetWidth || 512;
      const originalHeight1 = page1Node.scrollHeight;
      
      const dataUrl1 = await toJpeg(page1Node, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: originalWidth1 * pixelRatio,
        height: originalHeight1 * pixelRatio,
        quality: 0.85,
        styleSheetFilter: (css: CSSStyleSheet) => {
          try {
            const rules = css.cssRules;
            return !!rules;
          } catch (e) {
            return false;
          }
        },
        style: {
          transform: `scale(${pixelRatio})`,
          transformOrigin: 'top left',
          width: `${originalWidth1}px`,
          height: `${originalHeight1}px`,
          maxHeight: 'none',
          overflow: 'visible',
        }
      } as any);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // Page 1 matches A4 width, height calculated based on page element aspect ratio
      const page1PdfHeight = (originalHeight1 * pdfWidth) / originalWidth1;
      pdf.addImage(dataUrl1, 'JPEG', 0, 0, pdfWidth, Math.min(page1PdfHeight, pdfPageHeight), undefined, 'FAST');

      // Capture and append Page 2 if it exists
      const page2Node = document.getElementById('os-receipt-card-page2');
      if (page2Node && includePhotosInPdf) {
        const originalWidth2 = page2Node.offsetWidth || 512;
        const originalHeight2 = page2Node.scrollHeight;
        
        const dataUrl2 = await toJpeg(page2Node, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          width: originalWidth2 * pixelRatio,
          height: originalHeight2 * pixelRatio,
          quality: 0.85,
          styleSheetFilter: (css: CSSStyleSheet) => {
            try {
              const rules = css.cssRules;
              return !!rules;
            } catch (e) {
              return false;
            }
          },
          style: {
            transform: `scale(${pixelRatio})`,
            transformOrigin: 'top left',
            width: `${originalWidth2}px`,
            height: `${originalHeight2}px`,
            maxHeight: 'none',
            overflow: 'visible',
          }
        } as any);
        
        pdf.addPage();
        const page2PdfHeight = (originalHeight2 * pdfWidth) / originalWidth2;
        pdf.addImage(dataUrl2, 'JPEG', 0, 0, pdfWidth, Math.min(page2PdfHeight, pdfPageHeight), undefined, 'FAST');
      }
      
      pdf.save(`comprovante_OS_${osToExport?.idFormatado || 'os'}.pdf`);
      
      setIsExportingImage(false);
      setOsToExport(null);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setIsExportingImage(false);
      alert('Ocorreu um erro ao exportar o comprovante em PDF: ' + (error instanceof Error ? error.message : 'Falha na renderização da imagem.'));
    } finally {
      if (restoreStyles) {
        restoreStyles();
      }
    }
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById('os-receipt-card');
    if (!node) return;
    
    setIsExportingImage(true);
    let restoreStyles: (() => void) | null = null;
    try {
      // Small timeout to allow styles/layouts to settle
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      restoreStyles = await cleanOklabFromStylesheets();
      
      // Calculate exact dimensions of the target node to avoid viewport clips
      const originalWidth = node.offsetWidth || 512;
      const originalHeight = node.scrollHeight;
      
      const dataUrl = await toJpeg(node, {
        cacheBust: true,
        backgroundColor: '#f5f5f5', // Neutral-100 placeholder background to space Pages beautifully if stacked
        width: originalWidth,
        height: originalHeight,
        quality: 0.85,
        styleSheetFilter: (css: CSSStyleSheet) => {
          try {
            const rules = css.cssRules;
            return !!rules;
          } catch (e) {
            return false;
          }
        },
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${originalWidth}px`,
          height: `${originalHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
        }
      } as any);
      
      const link = document.createElement('a');
      link.download = `comprovante_OS_${osToExport?.idFormatado || 'os'}.png`;
      link.href = dataUrl;
      link.click();
      setIsExportingImage(false);
      setOsToExport(null);
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      setIsExportingImage(false);
      alert('Ocorreu um erro ao exportar o comprovante em formato de imagem. Por favor, tente novamente.');
    } finally {
      if (restoreStyles) {
        restoreStyles();
      }
    }
  };

  return (
    <div className={onlyModals ? "" : "space-y-6"}>
      {!onlyModals && (
        <>
          {/* Agenda Quick Navigation or Technician Info Banner */}
          {currentRole === 'TECNICO' && (
        <div className="bg-emerald-50 dark:bg-neutral-800/60 border-2 border-emerald-500/30 p-5 shadow-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl shrink-0 select-none">🛠️</span>
            <div>
              <h4 className="text-sm font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider">
                {showCompleted ? 'Ordens Finalizadas' : 'Suas Atribuições Pendentes'}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase mt-1 leading-snug">
                {showCompleted 
                  ? `Exibindo ordens que você já finalizou.`
                  : `Exibindo ordens pendentes ou agendadas para você.`
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-black ${
              showCompleted 
                ? 'bg-neutral-900 text-white' 
                : 'bg-emerald-400 text-neutral-900 hover:bg-emerald-500'
            }`}
          >
            {showCompleted ? (
              <>
                <Hammer className="w-4 h-4" />
                Ver Pendentes
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Ver Concluídas
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Agenda & Atendimentos Diários (Available for all roles now) */}
      <div className="bg-neutral-100 dark:bg-neutral-800/40 border-2 border-neutral-200 dark:border-neutral-700 p-5 shadow-sm dark:shadow-none space-y-3 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2 gap-2">
            <h4 className="text-sm font-black uppercase text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
              Agenda & Atendimentos Diários
            </h4>
            <span className="text-[10px] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-0.5 font-black uppercase inline-block self-start">
              Filtro de Calendário
            </span>
          </div>
            
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mr-2">Filtrar Atendimentos:</span>
            <button
              onClick={() => setDateAgendaFilter('Hoje')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Hoje' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900 shadow-sm dark:shadow-none' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Hoje ({scopedOrdens.filter(o => o.scheduledVisitDate?.substring(0, 10) === getLocalDateStr(new Date())).length})
            </button>
            <button
              onClick={() => setDateAgendaFilter('Amanhã')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Amanhã' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900 shadow-sm dark:shadow-none' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Amanhã ({
                scopedOrdens.filter(o => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return o.scheduledVisitDate?.substring(0, 10) === getLocalDateStr(tomorrow);
                }).length
              })
            </button>
            <button
              onClick={() => setDateAgendaFilter('Semana')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Semana' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Semana ({
                scopedOrdens.filter(o => {
                  if (!o.scheduledVisitDate) return false;
                  const cleanDate = o.scheduledVisitDate.substring(0, 10);
                  const curr = new Date();
                  const day = curr.getDay();
                  const start = new Date(curr);
                  start.setDate(curr.getDate() - day);
                  const end = new Date(curr);
                  end.setDate(curr.getDate() + (6 - day));
                  const startStr = getLocalDateStr(start);
                  const endStr = getLocalDateStr(end);
                  return cleanDate >= startStr && cleanDate <= endStr;
                }).length
              })
            </button>

            <button
              onClick={() => setDateAgendaFilter('Mês')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Mês' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900 shadow-sm dark:shadow-none' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Do Mês ({
                scopedOrdens.filter(o => {
                  const dateToCompare = o.scheduledVisitDate || o.createdAt;
                  return dateToCompare?.substring(0, 7) === getLocalDateStr(new Date()).substring(0, 7);
                }).length
              })
            </button>

            <button
              onClick={() => setDateAgendaFilter('Todos')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Todos' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Ver Tudo ({scopedOrdens.length})
            </button>
            
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0 relative">
              <button
                onClick={() => {
                  setDateAgendaFilter('Específica');
                  setShowCalendarPopover(!showCalendarPopover);
                  if (specificDate) {
                    setCalendarViewDate(new Date(specificDate + 'T00:00:00'));
                  } else {
                    setCalendarViewDate(new Date());
                  }
                }}
                className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  dateAgendaFilter === 'Específica' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900 shadow-sm dark:shadow-none' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {dateAgendaFilter === 'Específica' && specificDate ? (
                  new Date(specificDate + 'T00:00:00').toLocaleDateString('pt-BR')
                ) : (
                  'POR DATA'
                )}
              </button>

              {dateAgendaFilter === 'Específica' && showCalendarPopover && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendarViewDate(prev => {
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
                      {calendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendarViewDate(prev => {
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
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      
                      const firstDay = new Date(year, month, 1);
                      const startDayOfWeek = firstDay.getDay();
                      
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      const cells = [];
                      
                      for (let i = 0; i < startDayOfWeek; i++) {
                        cells.push(<div key={`empty-${i}`} className="h-7 w-7" />);
                      }
                      
                      const todayStr = getLocalDateStr(new Date());

                      for (let day = 1; day <= daysInMonth; day++) {
                        const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        const osCount = scopedOrdens.filter(o => {
                          const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                          return scheduledStr === dayDateStr;
                        }).length;

                        const isSelected = specificDate === dayDateStr;
                        const isToday = dayDateStr === todayStr;

                        cells.push(
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSpecificDate(dayDateStr);
                              setShowCalendarPopover(false);
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
                                title={`${osCount} OS agendada(s)`} 
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
          
          <div className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
            {dateAgendaFilter === 'Hoje' && `📅 Visualizando visitas marcadas para hoje: ${new Date().toLocaleDateString('pt-BR')}`}
            {dateAgendaFilter === 'Amanhã' && `📅 Visualizando visitas marcadas para amanhã: ${(() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toLocaleDateString('pt-BR');
            })()}`}
            {dateAgendaFilter === 'Semana' && `📅 Exibindo atendimentos agendados para esta semana.`}
            {dateAgendaFilter === 'Mês' && `📅 Exibindo atendimentos agendados ou criados neste mês.`}
            {dateAgendaFilter === 'Todos' && `📅 Exibindo histórico completo de atendimentos.`}
            {dateAgendaFilter === 'Específica' && specificDate && `📅 Filtrando visitas agendadas para the dia: ${new Date(specificDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
          </div>
        </div>
      
      {/* Search and Filters Hub */}
      {currentRole !== 'TECNICO' && (
        <div className="bg-neutral-100 dark:bg-neutral-800/40 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="search-input" className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Buscar Ordem de Serviço</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Busque por OS, cliente, defeito, marca..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="status-filter" className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Filtro Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2.5 px-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Pendente">Abertas (Pendentes)</option>
                <option value="Aguardando Peça">Aguardando Peça</option>
                <option value="Aguardando Reagendamento">Aguardando Reagendamento</option>
                <option value="Finalizada">Finalizadas</option>
                <option value="Cancelada">Canceladas</option>
              </select>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Grid of OS cards */}
      {finalFilteredOrdens.length === 0 ? (
        !onlyModals && (
          <div className="bg-neutral-100 border-4 border border-dashed border-black rounded-2xl p-12 text-center text-neutral-900 dark:text-neutral-100">
            <Clock className="w-12 h-12 mx-auto text-neutral-900 dark:text-neutral-100 stroke-[2.5] mb-3" />
            <p className="font-black text-lg uppercase tracking-wider mb-1">Sem Ordens de Serviço</p>
          </div>
        )
      ) : (
        <div className={onlyModals ? "" : "grid grid-cols-1 gap-6"}>
          {finalFilteredOrdens.map((os) => {
            const correspondingAst = assistencias.find(a => a.id === os.assistenciaId);
            const correspondingTec = usuarios.find(u => u.tecnicoId === os.tecnicoId || u.id === os.tecnicoId);
            const isEditingThisOS = selectedOSId === os.id;
            const isHistoryExpanded = expandedOSId === os.id;

            if (onlyModals && !isEditingThisOS) return null;

            return (
              <div 
                key={os.id} 
                id={`os-card-${os.id}`}
                className={onlyModals ? "" : "bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none overflow-hidden transition-all duration-150 relative"}
              >
                {/* Banner accent */}
                {!onlyModals && (
                  <div className="h-2.5 w-full bg-neutral-900 dark:bg-neutral-100 border-b border-neutral-200 dark:border-neutral-700" />
                )}

                {(() => {
                  const visitDate = os.scheduledVisitDate;
                  const compDate = os.completionDate;
                  const isCollapsedView = true;
                  const isCardExpanded = !isCollapsedView || !!expandedCards[os.id] || isEditingThisOS;

                  return (
                    <div>
                      {/* Interactive Button for Collapsed/Expandable View */}
                      {!onlyModals && isCollapsedView && (
                        <div
                          onClick={() => setExpandedCards(prev => ({ [os.id]: !prev[os.id] }))}
                          className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-all cursor-pointer select-none border-b border-neutral-100 dark:border-neutral-700/50"
                        >
                          <div className="flex-1 min-w-0">
                            {/* Mobile Layout (stacked vertically as requested) */}
                            <div className="flex flex-col gap-2.5 sm:hidden">
                              {/* 1. Número da OS, Cliente e Status */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-mono font-black text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0">
                                    <span>⚙️ OS #{os.idFormatado}</span>
                                  </div>
                                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight truncate max-w-[180px]">
                                    {os.clientName}
                                  </span>
                                </div>
                                <div className="self-start flex flex-col gap-1">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 block ${getStatusColor(os.status)}`}>
                                    {os.status}
                                  </span>
                                  {os.isRescheduled && (
                                    <span className="text-xs font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-1 rounded border border-orange-200 self-start block">
                                      Reagendado para: {os.rescheduledVisitDate ? safeFormatDate(os.rescheduledVisitDate) : 'Não informado'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 2. Dados do Equipamento */}
                              <div className="space-y-1.5 mt-1 pt-1.5 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                                <div>
                                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-tight block">
                                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mr-1">Eqp:</span>
                                    <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                                      {os.equipmentType} • {os.equipmentBrand} <span className="font-mono text-neutral-400 font-medium text-xs">({os.equipmentModel})</span>
                                    </span>
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-end mt-1.5">
                                  <div className="flex flex-col gap-1 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Chamada:</span>
                                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(os.createdAt)}</span>
                                    </div>
                                    {visitDate && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Atend:</span>
                                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(visitDate)}</span>
                                      </div>
                                    )}
                                    {compDate && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">Concl:</span>
                                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(compDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:flex flex-col gap-2">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-mono font-black text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0">
                                  <span>⚙️ OS #{os.idFormatado}</span>
                                </div>
                                <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight truncate min-w-0 flex-1 sm:max-w-none pt-0.5 sm:pt-0">
                                  {os.clientName}
                                </span>
                              </div>

                              <div className="space-y-1 mt-0.5">
                                <div>
                                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-tight block">
                                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mr-1">Eqp:</span>
                                    <span className="text-base font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                                      {os.equipmentType} • {os.equipmentBrand} <span className="font-mono text-neutral-400 font-medium text-xs">({os.equipmentModel})</span>
                                    </span>
                                  </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Chamada:</span>
                                    <span className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(os.createdAt)}</span>
                                  </div>
                                  {visitDate && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Atendimento:</span>
                                      <span className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(visitDate)}</span>
                                    </div>
                                  )}
                                  {compDate && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Conclusão:</span>
                                      <span className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{safeFormatDate(compDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-5 ml-auto sm:ml-0">
                            <div className="text-right hidden sm:flex flex-col items-end gap-1.5">
                              <div>
                                <span className="text-[8px] font-black text-neutral-400 block uppercase tracking-widest leading-none mb-1 text-right font-bold">Status OS</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 block ${getStatusColor(os.status)}`}>
                                  {os.status}
                                </span>
                              </div>
                              {os.isRescheduled && (
                                <span className="text-xs font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-1 rounded border border-orange-200 block">
                                  Reagendado para: {os.rescheduledVisitDate ? safeFormatDate(os.rescheduledVisitDate) : 'Não informado'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 ml-1">
                              {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE' || currentRole === 'MASTER' || currentRole === 'TECNICO') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOsToExport(os);
                                  }}
                                  className="bg-amber-300 hover:bg-amber-400 text-neutral-900 p-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md active:translate-y-0.5"
                                  title="Visualizar OS"
                                >
                                  <FileText className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditOS(os);
                                }}
                                className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 p-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md active:translate-y-0.5"
                                title="Editar OS"
                              >
                                <Hammer className="w-4 h-4 stroke-[2.5]" />
                              </button>

                              <div className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 p-1.5 rounded-xl transition-all text-neutral-600 dark:text-neutral-300">
                                {isCardExpanded ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!onlyModals && isCardExpanded && (
                        <div className="p-6 space-y-5">
                          {/* Core Content Row: Equipment and Client Info */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Equipment Information */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                                <PenTool className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Equipamento Diagnosticado
                              </h4>
                              <div className="bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl space-y-2">
                                <p className="text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed font-bold bg-neutral-100 dark:bg-neutral-900/40 p-3 border-l-4 border-amber-400 rounded-r-2xl">
                                  <span className="uppercase text-[10px] font-black tracking-wider text-amber-600 dark:text-amber-400 block mb-1">Defeito Informado pelo Cliente:</span> 
                                  <span className="text-sm font-black italic">"{os.reportedIssue}"</span>
                                </p>
                                {os.technicalDiagnosis ? (
                                  <div className="text-xs text-neutral-900 dark:text-neutral-100 mt-3 bg-emerald-100 dark:bg-emerald-900/60 p-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl leading-relaxed font-sans shadow-sm dark:shadow-none">
                                    <span className="uppercase text-[10px] font-black tracking-wider text-black dark:text-emerald-300 block mb-0.5">Laudo Técnico da Oficina:</span>
                                    <span className="font-bold">{os.technicalDiagnosis}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold italic pt-2">Aguardando laudo oficial do mecânico encarregado.</p>
                                )}

                                {os.servicoRealizado && (
                                  <div className="text-xs text-neutral-900 dark:text-neutral-100 mt-3 bg-blue-100 dark:bg-blue-900/60 p-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl leading-relaxed font-sans shadow-sm dark:shadow-none">
                                    <span className="uppercase text-[10px] font-black tracking-wider text-black dark:text-blue-300 block mb-0.5">Serviço Realizado:</span>
                                    <span className="font-bold">{os.servicoRealizado}</span>
                                  </div>
                                )}

                                {os.observacoes && (
                                  <div className="text-xs text-neutral-900 dark:text-neutral-100 mt-3 bg-amber-100 dark:bg-amber-900/60 p-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl leading-relaxed font-sans shadow-sm dark:shadow-none">
                                    <span className="uppercase text-[10px] font-black tracking-wider text-black dark:text-amber-300 block mb-0.5">Observações:</span>
                                    <span className="font-bold">{os.observacoes}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Client & Assignment Information */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                                  <User className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Cliente
                                </h4>
                                <p className="text-lg font-black text-neutral-900 dark:text-neutral-100 mt-1.5 uppercase tracking-tight bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1 inline-block rounded-lg shadow-sm">{os.clientName}</p>
                                {os.clientDocument && <p className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-tight mt-1">CPF/CNPJ: {os.clientDocument}</p>}
                                <p className="text-xs font-bold text-neutral-600 mt-1 uppercase tracking-tight">{os.clientPhone} • {os.clientEmail || 'Sem e-mail cadastrado'}</p>
                                
                                {(os.additionalContacts && os.additionalContacts.length > 0) && (
                                  <div className="mt-2 pl-3 border-l-2 border-neutral-200 dark:border-neutral-700">
                                    <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Contatos Adicionais:</p>
                                    {os.additionalContacts.map((contact, idx) => (
                                      <p key={idx} className="text-xs font-bold text-neutral-600 uppercase tracking-tight mb-0.5">
                                        {contact.name} • {contact.phone}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {os.clientPhone && os.clientPhone.replace(/\D/g, '') !== '' && (
                                  <div className="mt-2.5">
                                    <a 
                                      href={isReadOnly ? '#' : `https://wa.me/${(os.clientPhone.replace(/\D/g, '').length <= 11 && !os.clientPhone.replace(/\D/g, '').startsWith('55')) ? '55' : ''}${os.clientPhone.replace(/\D/g, '')}`}
                                      target={isReadOnly ? '_self' : '_blank'}
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        if (isReadOnly) {
                                          e.preventDefault();
                                          onShowBlockedAlert?.("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Contato com clientes suspenso.");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer"
                                      title="Chamar no WhatsApp"
                                    >
                                      <span className="text-xs">📲</span> Conversar no WhatsApp
                                    </a>
                                  </div>
                                )}
                                <div className="flex flex-col gap-2 mt-2.5">
                                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
                                    <MapPin className="w-4 h-4 text-black dark:text-neutral-100 shrink-0 stroke-[2.5]" />
                                    <span className="truncate">{os.address}{os.addressNumber ? `, ${os.addressNumber}` : ''}{os.addressComplement ? ` - ${os.addressComplement}` : ''}{os.clientCity && `, ${os.clientCity}`}{os.clientState && ` - ${os.clientState}`}{os.clientZipCode && ` (CEP: ${os.clientZipCode})`}</span>
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${os.address}${os.addressNumber ? `, ${os.addressNumber}` : ''}${os.clientCity ? `, ${os.clientCity}` : ''}${os.clientState ? `, ${os.clientState}` : ''}${os.clientZipCode ? `, ${os.clientZipCode}` : ''}`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 bg-white hover:bg-neutral-50 text-neutral-900 px-3 py-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                      title="Ver no Google Maps"
                                    >
                                      <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                                      Google Maps
                                    </a>
                                    <a 
                                      href={`https://waze.com/ul?q=${encodeURIComponent(`${os.address}${os.addressNumber ? `, ${os.addressNumber}` : ''}${os.clientCity ? `, ${os.clientCity}` : ''}${os.clientState ? `, ${os.clientState}` : ''}${os.clientZipCode ? `, ${os.clientZipCode}` : ''}`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 bg-[#33ccff] hover:bg-[#2bb8e6] text-white px-3 py-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                      title="Ver no Waze"
                                    >
                                      <Navigation className="w-4 h-4 stroke-[2.5]" />
                                      Waze
                                    </a>
                                  </div>
                                </div>

                                {/* Cost strip */}
                                <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                                  <DollarSign className="w-5 h-5 text-neutral-900 dark:text-neutral-100 shrink-0 stroke-[2.5]" />
                                  <div className="flex-1 min-w-0">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Total do Orçamento:</span>
                                    {os.discountValue && os.discountValue > 0 ? (
                                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900 uppercase rounded-md tracking-wider mb-1">
                                        {os.discountType === 'percentage' ? `-${os.discountValue}%` : `-R$ ${os.discountValue.toFixed(2)}`}
                                      </span>
                                    ) : null}
                                    <span className="text-base font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
                                      {os.totalCostValue > 0 ? `R$ ${os.totalCostValue.toFixed(2)}` : 'Em levantamento...'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3.5 border-t-2 border-neutral-100 flex items-center justify-between gap-3">
                                <div>
                                   <span className="text-[9px] text-neutral-400 block uppercase font-black tracking-widest">Mecânico Escalado</span>
                                   
                                   {quickAssignOSId === os.id ? (
                                     <div className="flex items-center gap-2 mt-1 bg-white dark:bg-neutral-800 p-2 rounded-xl border-2 border-black shadow-sm">
                                       <select
                                         value={quickTecId}
                                         onChange={(e) => setQuickTecId(e.target.value)}
                                         className="text-xs font-bold border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 px-2 py-1 outline-none min-w-[120px]"
                                       >
                                         <option value="">Escolher Técnico</option>
                                         {usuarios
                                           .filter(u => u.role === 'TECNICO')
                                           .map(u => (
                                             <option key={u.id} value={u.tecnicoId || u.id}>{u.name}</option>
                                           ))}
                                       </select>
                                       <button
                                         onClick={() => handleQuickAssign(os, quickTecId)}
                                         className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-neutral-800 transition-colors"
                                       >
                                         Salvar
                                       </button>
                                       <button
                                         onClick={() => {
                                           setQuickAssignOSId(null);
                                           setQuickTecId('');
                                         }}
                                         className="text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-rose-500 cursor-pointer p-1"
                                       >
                                         <X className="w-4 h-4" />
                                       </button>
                                     </div>
                                   ) : (
                                     <div className="flex flex-wrap items-center gap-3 mt-1">
                                       <span className={`text-sm font-black block truncate uppercase tracking-tight flex items-center gap-1.5 ${correspondingTec ? 'text-neutral-900 dark:text-neutral-100' : 'text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200'}`}>
                                         {correspondingTec ? (
                                           <>
                                             <User className="w-3.5 h-3.5 text-neutral-500" />
                                             {correspondingTec.name}
                                           </>
                                         ) : (
                                           <>
                                             <AlertTriangle className="w-3.5 h-3.5" />
                                             Aguardando Mecânico
                                           </>
                                         )}
                                       </span>
                                       
                                       {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE' || currentRole === 'MASTER') && (
                                          <button
                                            onClick={() => {
                                              if (isReadOnly) {
                                                onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Edição de OS suspensa.");
                                                return;
                                              }
                                              setQuickAssignOSId(os.id);
                                              setQuickTecId(os.tecnicoId || '');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer flex items-center gap-1.5 ${isReadOnly ? 'opacity-50 blur-[0.5px] grayscale cursor-not-allowed border-neutral-300' : 'bg-white dark:bg-neutral-800 border-black hover:bg-yellow-300 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
                                          >
                                            <Hammer className="w-3.5 h-3.5" />
                                            {correspondingTec ? 'Re-Escalar' : 'Escalar Técnico'}
                                          </button>
                                       )}
                                     </div>
                                   )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Strip */}
                          <div className="bg-neutral-50 border-t-2 border-black -mx-6 -mb-6 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                            {/* Control Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => setExpandedOSId(isHistoryExpanded ? null : os.id)}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap min-w-[180px] justify-center"
                                title="Ver Histórico de Modificações"
                              >
                                <History className="w-4 h-4 stroke-[2.5]" />
                                {isHistoryExpanded ? 'Fechar Log' : 'Linha do Tempo'}
                              </button>

                              {/* Update Action button */}
                              {!isEditingThisOS && (
                                <button
                                  onClick={() => handleEditOS(os)}
                                  className={`bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm dark:shadow-none hover:shadow-md transition-all inline-flex items-center gap-2 cursor-pointer min-w-[140px] justify-center ${isReadOnly ? 'opacity-50 grayscale' : ''}`}
                                >
                                  <Hammer className="w-4 h-4 stroke-[2.5]" />
                                  Editar OS
                                </button>
                              )}

                              {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE' || currentRole === 'MASTER' || currentRole === 'TECNICO') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOsToExport(os);
                                  }}
                                  className="bg-amber-300 hover:bg-amber-400 text-neutral-900 dark:text-neutral-100 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md whitespace-nowrap min-w-[180px] justify-center"
                                  title="Visualizar OS"
                                >
                                  <FileText className="w-4 h-4 stroke-[2.5]" />
                                  Visualizar OS
                                </button>
                              )}

                               {/* Admin delete capability */}
                              {(currentRole === 'ADMIN' || currentRole === 'MASTER') && onDeleteOS && (
                                <button
                                  onClick={() => {
                                    if (isReadOnly) {
                                      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: A assinatura da empresa está vencida ou o acesso foi bloqueado pelo administrador. Exclusão de OS suspensa.");
                                      return;
                                    }
                                    setDeleteConfirm({
                                      title: "Confirmar Exclusão de OS",
                                      message: `Deseja realmente excluir permanentemente a Ordem de Serviço ${os.idFormatado || os.id}?\n\nEsta ação apagará todo o histórico e peças vinculadas de forma irreversível.\n\nDigite a senha para confirmar:`,
                                      onConfirm: () => {
                                        const password = prompt("Digite a senha do admin:");
                                        if (password === "0000") {
                                          onDeleteOS(os.id);
                                        } else if (password !== null) {
                                          alert("Senha incorreta.");
                                        }
                                      }
                                    });
                                  }}
                                  className="bg-red-400 dark:bg-red-900/80 hover:bg-red-500 text-neutral-900 dark:text-neutral-100 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:text-white dark:text-neutral-900 transition-all cursor-pointer w-full justify-center"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Historical Log list */}
                          {isHistoryExpanded && (
                            <div className="bg-neutral-100 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-700 mt-5 space-y-4 animate-fadeIn">
                              <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Logs de Atividades ({os.history.length} eventos registrados)
                              </h4>
                              <div className="space-y-4 pl-4 border-l-4 border-black relative">
                                {os.history.map((hist, index) => (
                                  <div key={index} className="relative space-y-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1.5 font-bold">
                                      <span className="text-neutral-900 dark:text-neutral-100 font-black uppercase tracking-tight">{hist.description}</span>
                                      <span className="text-neutral-500 font-mono shrink-0">
                                        {new Date(hist.date).toLocaleDateString('pt-BR')} às {new Date(hist.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-black tracking-wider text-neutral-500">
                                      <span>Operador: <strong className="text-neutral-900 dark:text-neutral-100">{hist.author}</strong></span>
                                      <span>•</span>
                                      <span className="font-black px-1.5 py-0.5 rounded-2xl bg-neutral-200 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">{hist.status}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                        {/* Edit OS Modal */}
                        {isEditingThisOS && (
                          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fadeIn">
                            <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 w-full max-w-5xl shadow-sm dark:shadow-none rounded-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] my-4 sm:my-8 overflow-hidden">
                              <div className="bg-neutral-900 dark:bg-neutral-100 border-b-4 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 rounded-t-2xl">
                                <span className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                  <PenTool className="text-yellow-300 w-5 h-5 stroke-[2.5]" />
                                  Modificar Ordem de Serviço: {os.idFormatado}
                                </span>
                                <button 
                                  onClick={() => setSelectedOSId(null)} 
                                  className="bg-red-400 dark:bg-red-900/80 hover:bg-red-500 text-neutral-900 dark:text-neutral-100 text-xs font-black uppercase tracking-widest px-3 py-1 border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all sm:w-auto w-full"
                                >
                                  Fechar
                                </button>
                              </div>
                              
                              <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-neutral-50 dark:bg-neutral-900/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                      {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE' || currentRole === 'MASTER') ? (
                                        <div>
                                          <label htmlFor={`edit-status-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Mudar Status Técnico</label>
                                          <select
                                            id={`edit-status-${os.id}`}
                                            value={newStatus || os.status}
                                            onChange={(e) => setNewStatus(e.target.value as OSStatus)}
                                            className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none"
                                          >
                                            <option value="Pendente">Pendente</option>
                                            <option value="Aguardando Peça">Aguardando Peça</option>
                                            <option value="Aguardando Reagendamento">Aguardando Reagendamento</option>
                                            <option value="Finalizada">Finalizada (Encerrar OS)</option>
                                            <option value="Cancelada">Cancelada</option>
                                          </select>
                                        </div>
                                      ) : (
                                        <div>
                                          <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">Status Técnico</label>
                                          <div className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2.5 text-xs font-black text-neutral-500 bg-neutral-100 dark:bg-neutral-800 uppercase tracking-wider">
                                            {os.status}
                                          </div>
                                        </div>
                                      )}

                                      {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE') ? (
                                        <div>
                                          <label htmlFor={`edit-tec-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Designar Mecânico</label>
                                        <select
                                          id={`edit-tec-${os.id}`}
                                          value={assigneeTecnicoId}
                                          onChange={(e) => setAssigneeTecnicoId(e.target.value)}
                                          className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none"
                                        >
                                          <option value="">Selecionar Técnico</option>
                                          {usuarios
                                            .filter(u => u.role === 'TECNICO')
                                            .map(u => (
                                              <option key={u.id} value={u.tecnicoId || u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        </div>
                                      ) : (
                                        <div>
                                          <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">Designar Mecânico</label>
                                          <div className="w-full border-2 border-neutral-300 bg-neutral-100 p-2 text-xs font-bold text-neutral-500">
                                            Apenas gestor ou admin
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                                      <div>
                                        <label className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Data de Chamado (Abertura)</label>
                                        <input
                                          type="date"
                                          value={os.createdAt ? os.createdAt.split('T')[0] : ''}
                                          disabled
                                          className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-500 bg-neutral-50 dark:bg-neutral-800 focus:outline-none cursor-not-allowed"
                                        />
                                      </div>
                                      <div className="relative">
                                        <label htmlFor={`edit-visit-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Data de Atendimento (Início)</label>
                                        <button
                                          id={`edit-visit-${os.id}`}
                                          type="button"
                                          onClick={() => {
                                            setShowEditVisitCalendar(!showEditVisitCalendar);
                                            setShowEditRescheduleCalendar(false);
                                            if (editScheduledVisitDate) {
                                              setEditVisitCalendarViewDate(new Date(editScheduledVisitDate + 'T00:00:00'));
                                            } else {
                                              setEditVisitCalendarViewDate(new Date());
                                            }
                                          }}
                                          className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                                        >
                                          <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {editScheduledVisitDate ? (
                                              new Date(editScheduledVisitDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                            ) : (
                                              'SELECIONAR DATA'
                                            )}
                                          </span>
                                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                                        </button>

                                        {showEditVisitCalendar && (
                                          <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                                            {/* Calendar Header */}
                                            <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditVisitCalendarViewDate(prev => {
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
                                                {editVisitCalendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                              </span>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditVisitCalendarViewDate(prev => {
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
                                                const year = editVisitCalendarViewDate.getFullYear();
                                                const month = editVisitCalendarViewDate.getMonth();
                                                
                                                const firstDay = new Date(year, month, 1);
                                                const startDayOfWeek = firstDay.getDay();
                                                
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const cells = [];
                                                
                                                for (let i = 0; i < startDayOfWeek; i++) {
                                                  cells.push(<div key={`empty-edit-visit-${i}`} className="h-7 w-7" />);
                                                }
                                                
                                                const todayStr = getLocalDateStr(new Date());

                                                for (let day = 1; day <= daysInMonth; day++) {
                                                  const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                  
                                                  const osCount = scopedOrdens.filter(o => {
                                                    if (o.status === 'Finalizada' || o.status === 'Cancelada') return false;
                                                    const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                                                    return scheduledStr === dayDateStr;
                                                  }).length;

                                                  const isSelected = editScheduledVisitDate === dayDateStr;
                                                  const isToday = dayDateStr === todayStr;

                                                  cells.push(
                                                    <button
                                                      key={`day-edit-visit-${day}`}
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditScheduledVisitDate(dayDateStr);
                                                        setShowEditVisitCalendar(false);
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
                                                          title={`${osCount} OS agendada(s)`} 
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
                                      <div className="col-span-1 sm:col-span-2 mt-2">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <input
                                              id={`edit-reschedule-${os.id}`}
                                              type="checkbox"
                                              checked={editIsRescheduled}
                                              disabled={currentRole === 'TECNICO' && !servicoRealizado.trim()}
                                              onChange={(e) => {
                                                const checked = e.target.checked;
                                                setEditIsRescheduled(checked);
                                                if (checked) {
                                                  setNewStatus('Aguardando Reagendamento');
                                                } else {
                                                  setNewStatus(os.status === 'Aguardando Reagendamento' ? 'Pendente' : os.status);
                                                }
                                              }}
                                              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <label 
                                              htmlFor={`edit-reschedule-${os.id}`} 
                                              className={`text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 cursor-pointer ${
                                                currentRole === 'TECNICO' && !servicoRealizado.trim() ? 'opacity-50 cursor-not-allowed' : ''
                                              }`}
                                            >
                                              Marcar como Reagendamento
                                            </label>
                                          </div>
                                          {currentRole === 'TECNICO' && !servicoRealizado.trim() && (
                                            <p className="text-[10px] text-red-500 font-bold">
                                              * Descreva o "Serviço Realizado" acima antes de solicitar o reagendamento.
                                            </p>
                                          )}
                                        </div>
                                        
                                        {editIsRescheduled && (currentRole === 'ADMIN' || currentRole === 'ATENDENTE' || currentRole === 'MASTER') && (
                                          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-fadeIn relative">
                                            <label htmlFor={`reschedule-date-${os.id}`} className="block text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                                              Nova Data para o Reagendamento
                                            </label>
                                            <button
                                              id={`reschedule-date-${os.id}`}
                                              type="button"
                                              onClick={() => {
                                                setShowEditRescheduleCalendar(!showEditRescheduleCalendar);
                                                setShowEditVisitCalendar(false);
                                                if (editRescheduledVisitDate) {
                                                  setEditRescheduleCalendarViewDate(new Date(editRescheduledVisitDate + 'T00:00:00'));
                                                } else if (editScheduledVisitDate) {
                                                  setEditRescheduleCalendarViewDate(new Date(editScheduledVisitDate + 'T00:00:00'));
                                                } else {
                                                  setEditRescheduleCalendarViewDate(new Date());
                                                }
                                              }}
                                              className="w-full border-2 border-amber-300 dark:border-amber-700 rounded-xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-neutral-700 cursor-pointer"
                                            >
                                              <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {editRescheduledVisitDate ? (
                                                  new Date(editRescheduledVisitDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                                ) : (
                                                  'SELECIONAR NOVA DATA'
                                                )}
                                              </span>
                                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                                            </button>

                                            {showEditRescheduleCalendar && (
                                              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                                                {/* Calendar Header */}
                                                <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditRescheduleCalendarViewDate(prev => {
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
                                                    {editRescheduleCalendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                                  </span>

                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditRescheduleCalendarViewDate(prev => {
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
                                                    const year = editRescheduleCalendarViewDate.getFullYear();
                                                    const month = editRescheduleCalendarViewDate.getMonth();
                                                    
                                                    const firstDay = new Date(year, month, 1);
                                                    const startDayOfWeek = firstDay.getDay();
                                                    
                                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                    const cells = [];
                                                    
                                                    for (let i = 0; i < startDayOfWeek; i++) {
                                                      cells.push(<div key={`empty-edit-reschedule-${i}`} className="h-7 w-7" />);
                                                    }
                                                    
                                                    const todayStr = getLocalDateStr(new Date());

                                                    for (let day = 1; day <= daysInMonth; day++) {
                                                      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                      
                                                      const osCount = scopedOrdens.filter(o => {
                                                        if (o.status === 'Finalizada' || o.status === 'Cancelada') return false;
                                                        const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                                                        return scheduledStr === dayDateStr;
                                                      }).length;

                                                      const isSelected = editRescheduledVisitDate === dayDateStr;
                                                      const isToday = dayDateStr === todayStr;

                                                      cells.push(
                                                        <button
                                                          key={`day-edit-reschedule-${day}`}
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditRescheduledVisitDate(dayDateStr);
                                                            setShowEditRescheduleCalendar(false);
                                                            setNewStatus('Pendente');
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
                                                              title={`${osCount} OS agendada(s)`} 
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
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 bg-white dark:bg-neutral-800">
                                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-2">Contatos Adicionais (Cliente)</label>
                                      <div className="space-y-2">
                                        {editAdditionalContacts.map((contact, index) => (
                                          <div key={index} className="flex gap-2 items-center">
                                            <input
                                              type="text"
                                              placeholder="Nome do contato"
                                              value={contact.name}
                                              onChange={(e) => {
                                                const newContacts = [...editAdditionalContacts];
                                                newContacts[index].name = e.target.value;
                                                setEditAdditionalContacts(newContacts);
                                              }}
                                              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 focus:outline-none"
                                            />
                                            <input
                                              type="text"
                                              placeholder="(11) 99999-9999"
                                              value={contact.phone}
                                              onChange={(e) => {
                                                const newContacts = [...editAdditionalContacts];
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 11) val = val.substring(0, 11);
                                                if (val.length > 2) val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
                                                if (val.length > 10) val = `${val.substring(0, 10)}-${val.substring(10)}`;
                                                newContacts[index].phone = val;
                                                setEditAdditionalContacts(newContacts);
                                              }}
                                              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 focus:outline-none"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setEditAdditionalContacts(editAdditionalContacts.filter((_, i) => i !== index))}
                                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => setEditAdditionalContacts([...editAdditionalContacts, { name: '', phone: '' }])}
                                          className="text-[10px] font-black uppercase text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 cursor-pointer transition-colors mt-2"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Adicionar contato
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <label htmlFor={`edit-diag-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Descrever Diagnóstico / Laudo Atual</label>
                                      <textarea
                                        id={`edit-diag-${os.id}`}
                                        rows={2}
                                        placeholder="Fiação refeita e lubrificação efetuada. Testes finais com sucesso."
                                        value={technicalDiagnosisText}
                                        onChange={(e) => setTechnicalDiagnosisText(e.target.value)}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs text-neutral-900 dark:text-neutral-100 font-bold focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500 font-sans"
                                      ></textarea>
                                    </div>

                                    <div>
                                      <label htmlFor={`edit-servico-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Serviço Realizado</label>
                                      <textarea
                                        id={`edit-servico-${os.id}`}
                                        rows={2}
                                        placeholder="Descreva detalhadamente o serviço executado."
                                        value={servicoRealizado}
                                        onChange={(e) => setServicoRealizado(e.target.value)}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs text-neutral-900 dark:text-neutral-100 font-bold focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500 font-sans"
                                      ></textarea>
                                    </div>

                                    <div>
                                      <label htmlFor={`edit-obs-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Observações</label>
                                      <textarea
                                        id={`edit-obs-${os.id}`}
                                        rows={2}
                                        placeholder="Observações ou anotações adicionais sobre o equipamento."
                                        value={observacoes}
                                        onChange={(e) => setObservacoes(e.target.value)}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs text-neutral-900 dark:text-neutral-100 font-bold focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500 font-sans"
                                      ></textarea>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <label htmlFor={`edit-labor-cost-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-mono">Mão de Obra R$</label>
                                          <label className="flex items-center gap-1 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={editIsLaborCourtesy}
                                              onChange={(e) => setEditIsLaborCourtesy(e.target.checked)}
                                              className="w-3 h-3 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                            />
                                            <span className="text-[9px] font-black uppercase text-emerald-600">Cortesia</span>
                                          </label>
                                        </div>
                                        <div className="relative">
                                          <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-500">R$</span>
                                          <input
                                            id={`edit-labor-cost-${os.id}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            disabled={editIsLaborCourtesy}
                                            value={laborCostInput === '' ? '' : laborCostInput}
                                            onChange={(e) => setLaborCostInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-8 pr-2 py-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800 ${editIsLaborCourtesy ? 'opacity-50 line-through' : ''}`}
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <label htmlFor={`edit-displacement-cost-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-mono">Deslocamento R$</label>
                                          <label className="flex items-center gap-1 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={editIsTravelCourtesy}
                                              onChange={(e) => setEditIsTravelCourtesy(e.target.checked)}
                                              className="w-3 h-3 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                            />
                                            <span className="text-[9px] font-black uppercase text-emerald-600">Cortesia</span>
                                          </label>
                                        </div>
                                        <div className="relative">
                                          <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-500">R$</span>
                                          <input
                                            id={`edit-displacement-cost-${os.id}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            disabled={editIsTravelCourtesy}
                                            value={editTaxaDeslocamento === '' ? '' : editTaxaDeslocamento}
                                            onChange={(e) => setEditTaxaDeslocamento(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-8 pr-2 py-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800 ${editIsTravelCourtesy ? 'opacity-50 line-through' : ''}`}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Photo Evidences */}
                                <div className="border-t-2 border-black pt-4 space-y-3">
                                  <span className="block text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider flex items-center gap-1.5 mb-2">
                                    <Camera className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                    Evidências Fotográficas do Serviço ({editFotos.length})
                                  </span>
                                  
                                  <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                      {editFotos.map((photo, idx) => (
                                        <div key={idx} className="relative flex flex-col gap-1 group">
                                          <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-32 object-cover block rounded-lg bg-neutral-100 dark:bg-neutral-800" referrerPolicy="no-referrer" />
                                          <button
                                            onClick={() => setEditFotos(editFotos.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                          <input
                                            type="text"
                                            placeholder="Descrição da foto..."
                                            value={photo.description}
                                            onChange={(e) => {
                                              const newFotos = [...editFotos];
                                              newFotos[idx].description = e.target.value;
                                              setEditFotos(newFotos);
                                            }}
                                            className="w-full text-[10px] font-medium border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-emerald-500 rounded px-1.5 py-1 focus:outline-none bg-transparent focus:bg-white dark:focus:bg-neutral-900 transition-colors text-neutral-900 dark:text-neutral-100"
                                          />
                                        </div>
                                      ))}
                                      
                                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95 group h-32">
                                        <input 
                                          type="file" accept="image/*" className="hidden"
                                          onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                              const c = await compressImage(e.target.files[0]);
                                              setEditFotos([...editFotos, { url: c, description: "" }]);
                                            }
                                          }}
                                        />
                                        <Camera className="w-6 h-6 text-neutral-400 dark:text-neutral-500 mb-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-300" />
                                        <span className="text-[10px] sm:text-xs font-bold text-center text-neutral-500 dark:text-neutral-400 uppercase tracking-wider group-hover:text-neutral-700 dark:group-hover:text-neutral-300">Nova Foto</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                {/* Gerenciamento de Peças na OS */}
                                <div className="border-t-2 border-black pt-4 space-y-3">
                                  <span className="block text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider flex items-center gap-1.5">
                                    <PenTool className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                    Peças e Componentes de Reposição
                                  </span>
                                  
                                  {/* Add Part Form */}
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-100 p-3 border-2 border-dashed border-black">
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-black uppercase text-neutral-700 mb-1">Nome da Peça</label>
                                      <input
                                        type="text"
                                        placeholder="Ex: Placa Controladora"
                                        value={editPartName}
                                        onChange={(e) => setEditPartName(e.target.value)}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                                      />
                                    </div>
                                    <div className="sm:col-span-1">
                                      <label className="block text-[10px] font-black uppercase text-neutral-700 mb-1">Qtd</label>
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={editPartQuantity}
                                        onChange={(e) => setEditPartQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none"
                                      />
                                    </div>
                                    <div className="sm:col-span-1">
                                      <label className="block text-[10px] font-black uppercase text-neutral-700 mb-1">Preço Unit. (R$)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={editPartValue || ''}
                                        onChange={(e) => setEditPartValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                                      />
                                    </div>
                                    <div className="sm:col-span-4 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!editPartName.trim()) {
                                            alert('Por favor, digite o nome para a peça.');
                                            return;
                                          }
                                          if (editPartValue < 0) {
                                            alert('Por favor, digite um preço válido para a peça.');
                                            return;
                                          }
                                          const updatedParts = [...editParts, { name: editPartName, quantity: editPartQuantity || 1, value: editPartValue }];
                                          setEditParts(updatedParts);
                                          
                                          // Auto-calculate new total cost when adding part!
                                          const partsSum = updatedParts.reduce((acc, p) => acc + (p.value * p.quantity), 0);
                                          const labor = Number(laborCostInput) || 0;
                                          const shiftTax = os.taxaDeslocamento || 0;
                                          setCostInput(partsSum + labor + shiftTax);

                                          setEditPartName('');
                                          setEditPartQuantity(1);
                                          setEditPartValue(0);
                                        }}
                                        className="w-full sm:w-auto bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-xs font-black uppercase tracking-wider px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all active:translate-y-0.5 flex items-center justify-center gap-1"
                                      >
                                        Adicionar Peça ou Serviço
                                      </button>
                                    </div>
                                  </div>

                                  {/* Current Parts List */}
                                  {editParts.length > 0 ? (
                                    <div className="border border-neutral-200 dark:border-neutral-700 divide-y divide-black max-h-32 overflow-y-auto">
                                      {editParts.map((part, pIdx) => (
                                        <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 text-xs font-bold bg-white dark:bg-neutral-800">
                                          <div className="flex flex-wrap items-center gap-1.5 font-sans">
                                            <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 font-mono font-black text-[10px]">{part.quantity}x</span>
                                            <span className="text-neutral-900 dark:text-neutral-100 uppercase break-all">{part.name}</span>
                                            <span className="text-neutral-400 font-normal font-mono text-[10px]">({part.quantity} x R$ {part.value.toFixed(2)})</span>
                                          </div>
                                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                            <span className="text-emerald-700 font-mono">R$ {(part.value * part.quantity).toFixed(2)}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedParts = editParts.filter((_, idx) => idx !== pIdx);
                                                setEditParts(updatedParts);

                                                // Auto-calculate new total when removing part
                                                const partsSum = updatedParts.reduce((acc, p) => acc + (p.value * p.quantity), 0);
                                                const labor = Number(laborCostInput) || 0;
                                                const shiftTax = os.taxaDeslocamento || 0;
                                                setCostInput(partsSum + labor + shiftTax);
                                              }}
                                              className="text-red-600 hover:bg-neutral-100 p-1 border border-neutral-200 dark:border-neutral-700 transition-colors"
                                              title="Remover Peça"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider bg-neutral-50 p-2 border border-neutral-200 dark:border-neutral-700">Nenhuma peça cadastrada nesta ordem.</p>
                                  )}
                                </div>

                                <div className="bg-white dark:bg-neutral-800 border-2 border-dashed border-neutral-400 p-4 rounded-2xl space-y-3">
                                  <span className="block text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Datas de Agendamento e Finalização
                                  </span>
                                  
                                  <div className="grid grid-cols-1 gap-4">
                                    <div>
                                      <label htmlFor={`edit-comp-date-${os.id}`} className="block text-[11px] font-black uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                                        Data de Conclusão / Finalização OS
                                      </label>
                                      <div className="relative">
                                        <button
                                          id={`edit-comp-date-${os.id}`}
                                          type="button"
                                          onClick={() => {
                                            setShowEditCompletionCalendar(!showEditCompletionCalendar);
                                            if (editCompletionDate) {
                                              setEditCompletionCalendarViewDate(new Date(editCompletionDate + 'T00:00:00'));
                                            } else {
                                              setEditCompletionCalendarViewDate(new Date());
                                            }
                                          }}
                                          className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                                        >
                                          <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {editCompletionDate ? (
                                              new Date(editCompletionDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                            ) : (
                                              'SELECIONAR DATA'
                                            )}
                                          </span>
                                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                                        </button>

                                        {showEditCompletionCalendar && (
                                          <div className="absolute left-0 bottom-full mb-2 w-72 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-xl p-4 rounded-xl z-50">
                                            {/* Calendar Header */}
                                            <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditCompletionCalendarViewDate(prev => {
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
                                                {editCompletionCalendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                              </span>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditCompletionCalendarViewDate(prev => {
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
                                                const year = editCompletionCalendarViewDate.getFullYear();
                                                const month = editCompletionCalendarViewDate.getMonth();
                                                
                                                const firstDay = new Date(year, month, 1);
                                                const startDayOfWeek = firstDay.getDay();
                                                
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const cells = [];
                                                
                                                for (let i = 0; i < startDayOfWeek; i++) {
                                                  cells.push(<div key={`empty-edit-comp-${i}`} className="h-7 w-7" />);
                                                }
                                                
                                                const todayStr = getLocalDateStr(new Date());

                                                for (let day = 1; day <= daysInMonth; day++) {
                                                  const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                  
                                                  const osCount = scopedOrdens.filter(o => {
                                                    if (o.status === 'Finalizada' || o.status === 'Cancelada') return false;
                                                    const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
                                                    return scheduledStr === dayDateStr;
                                                  }).length;

                                                  const isSelected = editCompletionDate === dayDateStr;
                                                  const isToday = dayDateStr === todayStr;

                                                  cells.push(
                                                    <button
                                                      key={`day-edit-comp-${day}`}
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditCompletionDate(dayDateStr);
                                                        setShowEditCompletionCalendar(false);
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
                                                          title={`${osCount} OS agendada(s)`} 
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
                                  </div>
                                </div>

                                {/* Resumo Financeiro & Pagamento Card */}
                                <div className="bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 p-4 rounded-2xl space-y-4 shadow-inner">
                                  <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                                    <Banknote className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                    <span className="text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider">
                                      Resumo Financeiro & Pagamento
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 1. Forma de Pagamento */}
                                    <div className="bg-white dark:bg-neutral-800 p-3.5 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-1.5 shadow-sm">
                                      <label className="block text-[10px] font-black uppercase text-neutral-500 dark:text-neutral-400">
                                        Método de Pagamento para Recibo
                                      </label>
                                      <select
                                        value={editPaymentMethod}
                                        onChange={(e) => {
                                          const val = e.target.value as any;
                                          setEditPaymentMethod(val);
                                          if (val !== 'Cartão de Crédito') {
                                            setEditInstallments(1);
                                          }
                                        }}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                                      >
                                        <option value="">Selecione a forma de pagamento...</option>
                                        <option value="Pix/À vista">Pix / À vista</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                        <option value="Cartão de Débito">Cartão de Débito</option>
                                        <option value="Boleto">Boleto</option>
                                      </select>

                                      {editPaymentMethod === 'Cartão de Crédito' && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700 space-y-1">
                                          <label className="block text-[9px] font-black uppercase text-neutral-500 dark:text-neutral-400">
                                            Parcelas
                                          </label>
                                          <select
                                            value={editInstallments}
                                            onChange={(e) => setEditInstallments(Number(e.target.value))}
                                            className="w-full border border-neutral-200 dark:border-neutral-700 p-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-neutral-50 dark:bg-neutral-900 rounded-md"
                                          >
                                            {[...Array(12)].map((_, i) => {
                                              const count = i + 1;
                                              const amt = Number(costInput || 0);
                                              const valuePerInstallment = amt / count;
                                              return (
                                                <option key={count} value={count}>
                                                  {count}x de R$ {valuePerInstallment.toFixed(2)} (Sem juros)
                                                </option>
                                              );
                                            })}
                                          </select>
                                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono text-center mt-1">
                                            {editInstallments}x de R$ {(Number(costInput || 0) / editInstallments).toFixed(2)}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* 2. Desconto */}
                                    <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-100 flex items-center gap-1">
                                          <DollarSign className="w-3.5 h-3.5" /> Desconto
                                        </label>
                                        <div className="flex bg-amber-100 dark:bg-amber-800/60 p-0.5 rounded-md">
                                          <button
                                            type="button"
                                            onClick={() => setEditDiscountType('fixed')}
                                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${editDiscountType === 'fixed' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-amber-700 dark:text-amber-300'}`}
                                          >
                                            R$
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditDiscountType('percentage')}
                                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${editDiscountType === 'percentage' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-amber-700 dark:text-amber-300'}`}
                                          >
                                            %
                                          </button>
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-xs font-black text-amber-500">
                                          {editDiscountType === 'fixed' ? 'R$' : '%'}
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          step={editDiscountType === 'fixed' ? '0.01' : '1'}
                                          placeholder="0.00"
                                          value={editDiscountValue || ''}
                                          onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                                          className="w-full border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white pl-8 pr-2 py-1.5 rounded-lg text-xs font-black focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. Valor Total */}
                                  <div className="bg-neutral-900 dark:bg-neutral-800 text-white p-4 rounded-xl flex justify-between items-center shadow-md">
                                    <div>
                                      <span className="block text-[10px] font-black uppercase text-neutral-300 font-mono tracking-wider">Orçamento Estimado (Soma Total)</span>
                                      {editDiscountValue > 0 && (
                                        <span className="inline-block px-2 py-0.5 text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase rounded-md tracking-wider mt-1">
                                          Desconto: -{editDiscountType === 'percentage' ? `${editDiscountValue}%` : `R$ ${editDiscountValue.toFixed(2)}`}
                                        </span>
                                      )}
                                      <span className="block text-[8px] uppercase font-bold text-neutral-400 mt-1">MÃO DE OBRA + DESLOCAMENTO + PEÇAS E SERVIÇOS ADICIONADOS</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                                        R$ {Number(costInput || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Assinaturas Digitais da Ordem de Serviço */}
                                <div className="border-t-2 border-black pt-4 space-y-4">
                                  <span className="block text-xs font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider flex items-center gap-1.5">
                                    <PenTool className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                    Assinatura Digital de Campo (Visto de Abertura)
                                  </span>
                                  
                                  <p className="text-[10px] font-bold text-neutral-60 block leading-relaxed uppercase">
                                    Registre a assinatura digital do mecânico técnico e do cliente autorizador para validação de campo.
                                  </p>

                                  <div className="border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-100/50 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-1.5">
                                      <span className="text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100">
                                        Visto de Visita & Autorização Técnica
                                      </span>
                                      {sigAberturaDataInput && (
                                        <span className="text-[8px] font-mono font-bold text-neutral-600 bg-neutral-200 px-1 w-fit">
                                          Data: {new Date(sigAberturaDataInput).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col items-center text-center justify-center gap-2">
                                         <span className="text-[10px] font-black uppercase text-neutral-500">Assinatura do Técnico / Responsável</span>
                                         <span className="text-xl font-medium font-serif italic text-neutral-700 dark:text-neutral-300">
                                           {activeUserName}
                                         </span>
                                      </div>
                                      
                                      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-2 gap-2">
                                          <span className="text-[10px] font-black uppercase text-neutral-500">Assinatura do Cliente / Recebedor</span>
                                          <div className="flex bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 self-start sm:self-auto">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSigClienteAberturaTypeInput('drawn');
                                              }}
                                              className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${sigClienteAberturaTypeInput === 'drawn' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                                            >
                                              Desenhar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSigClienteAberturaTypeInput('typed');
                                              }}
                                              className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${sigClienteAberturaTypeInput === 'typed' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                                            >
                                              Digitar Nome
                                            </button>
                                          </div>
                                        </div>

                                        {sigClienteAberturaTypeInput === 'drawn' ? (
                                          <SignaturePad
                                            label="Desenhe a assinatura na tela"
                                            initialValue={sigClienteAberturaInput}
                                            onSave={(base64) => setSigClienteAberturaInput(base64)}
                                            onClear={() => setSigClienteAberturaInput('')}
                                          />
                                        ) : (
                                          <div className="space-y-2 p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                            <label className="block text-[9px] font-black uppercase text-neutral-400">
                                              Nome completo por extenso (Assinatura digitada)
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                              <input
                                                type="text"
                                                placeholder="Digite o nome de quem recebeu..."
                                                value={sigClienteAberturaTypedInput}
                                                onChange={(e) => setSigClienteAberturaTypedInput(e.target.value)}
                                                className="flex-1 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none"
                                              />
                                              {sigClienteAberturaTypedInput && (
                                                <button
                                                  type="button"
                                                  onClick={() => setSigClienteAberturaTypedInput('')}
                                                  className="w-full sm:w-auto px-2.5 py-2 sm:py-1 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg text-[10px] font-black uppercase cursor-pointer text-center"
                                                >
                                                  Limpar
                                                </button>
                                              )}
                                            </div>
                                            {sigClienteAberturaTypedInput && (
                                              <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
                                                <span className="text-[9px] font-black uppercase text-neutral-400 mb-1">Prévia da assinatura digitada</span>
                                                <span className="text-xl font-medium font-serif italic text-neutral-700 dark:text-neutral-300 py-2 border-b border-neutral-200 dark:border-neutral-700 min-w-[150px] text-center">
                                                  {sigClienteAberturaTypedInput}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2.5 border-t-2 border-black pt-4 sticky bottom-0 bg-white dark:bg-neutral-800 p-4 -mx-6 -mb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                  <button
                                    onClick={() => setSelectedOSId(null)}
                                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-neutral-100 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => setOsToConfirmStatus(os)}
                                    className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer"
                                  >
                                    Salvar Atualização
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

    {/* EXPORT OVERLAY VIEW MODAL */}
    {osToExport && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
        <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 w-full max-w-5xl shadow-sm dark:shadow-none rounded-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] my-4 sm:my-8 animate-fadeIn">
          
          {/* Modal Header */}
          <div className="bg-neutral-900 dark:bg-neutral-100 border-b-4 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 rounded-t-2xl">
            <span className="text-sm font-black text-white dark:text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="text-yellow-300 w-5 h-5 stroke-[2.5]" />
              Exportar Comprovante do Cliente
            </span>
            <button 
              onClick={() => setOsToExport(null)} 
              className="bg-red-400 dark:bg-red-900/80 hover:bg-red-500 text-neutral-900 dark:text-neutral-100 text-xs font-black uppercase tracking-widest px-3 py-1 border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all sm:w-auto w-full"
            >
              Fechar
            </button>
          </div>

          {/* Document container wrapper with horizontal and vertical scrollbars */}
          <div className="p-4 bg-neutral-100 overflow-auto border-b border-neutral-200 dark:border-neutral-700 flex-1 relative -webkit-overflow-scrolling-touch">
            {/* 
                We use transform-origin-top-left and scale to fit it aesthetically on screen, 
                but html-to-image is configured to override this transform during capture! 
            */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media (max-width: 640px) {
                #os-receipt-wrapper { transform: scale(0.45); transform-origin: top center; margin-bottom: -55%; }
              }
              @media (min-width: 641px) and (max-width: 1024px) {
                #os-receipt-wrapper { transform: scale(0.7); transform-origin: top center; margin-bottom: -30%; }
              }
            `}} />
            <div id="os-receipt-wrapper" className="flex flex-col items-center">
              {/* The real node to snapshot, optimized for A4 proportions */}
              <div 
                id="os-receipt-card" 
                className="flex flex-col gap-6 bg-transparent"
                style={{ width: '210mm' }}
              >
              {/* PAGE 1: Core OS Document */}
              <div 
                id="os-receipt-card-page1"
                className="bg-white p-[20mm] space-y-6 font-sans text-neutral-900 relative shrink-0 shadow-lg"
                style={{ width: '210mm', minHeight: '297mm' }}
              >
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-neutral-900" />

              {/* Company Logo and Code */}
              {(() => {
                const company = assistencias.find(a => a.id === osToExport.assistenciaId);
                const compName = company?.name || storeSettings.name || 'Assistência Técnica';
                const compCnpj = company?.cnpj || storeSettings.cnpj;
                const compAddress = company?.address || storeSettings.address || 'Endereço da Empresa';
                const compCity = company?.city || storeSettings.city || '';
                const compState = company?.state || storeSettings.state || '';
                const compZip = company?.zipCode || storeSettings.zipCode || '';
                const compPhone = company?.phone || storeSettings.phone || '(00) 00000-0000';
                const compEmail = company?.email || storeSettings.email || '';
                const compLogoUrl = company?.logoUrl || storeSettings.logoUrl;

                return (
                  <div className="flex justify-between items-start border-b-2 border-neutral-200 pb-5 pt-3">
                    <div className="flex items-start gap-4">
                      {compLogoUrl ? (
                        <img 
                          src={compLogoUrl} 
                          alt={compName} 
                          className="w-16 h-16 object-contain shrink-0 border border-neutral-200 bg-white rounded-xl p-1" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-200 shrink-0">
                          <Sparkles className="w-8 h-8 text-neutral-900 dark:text-neutral-100" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100">
                          {compName}
                        </h3>
                        <div className="text-[9px] font-bold text-neutral-500 uppercase mt-1 space-y-0.5 leading-tight">
                          {compCnpj && <p>CNPJ: {compCnpj}</p>}
                          <p>
                            {compAddress}
                            {compCity && `, ${compCity}`}
                            {compState && ` - ${compState}`}
                            {compZip && ` (CEP: ${compZip})`}
                          </p>
                          <p>Tel: {compPhone}</p>
                          {compEmail && <p className="lowercase">E-mail: {compEmail}</p>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[8px] font-black bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-0.5 uppercase tracking-widest">Documento Oficial</span>
                      <div className="text-sm font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">{osToExport.idFormatado}</div>
                      <div className="text-[8px] font-bold font-mono text-neutral-500 uppercase mt-0.5">Abertura: {safeFormatDate(osToExport.createdAt)}</div>
                    </div>
                  </div>
                );
              })()}

              {/* High Contrast Banner showing Completion Status & Dates */}
              {(() => {
                const isConcluida = osToExport.status === 'Finalizada';
                
                // Hunt for the date when it was finalized in history
                const conclusionDate = safeFormatDate(osToExport.completionDate);
                const visitDateStr = safeFormatDate(osToExport.scheduledVisitDate);

                return (
                  <div className={`border border-neutral-200 dark:border-neutral-700 p-3 flex justify-between items-center ${isConcluida ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-neutral-100 dark:bg-neutral-800/50'}`}>
                    <div>
                      <span className="block text-[8px] font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-widest">Estado da Ordem</span>
                      <span className="text-sm font-black uppercase text-neutral-900 dark:text-neutral-100">{isConcluida ? 'Finalizada ✔️' : osToExport.status}</span>
                    </div>
                    
                    <div className="flex gap-4 text-right">
                      <div>
                        <span className="block text-[8px] font-black uppercase text-neutral-600 tracking-widest">
                          {(isConcluida || conclusionDate !== '-') ? 'Data de Conclusão' : 'Agendamento'}
                        </span>
                        <span className="text-xs font-black font-mono text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 border border-neutral-300 dark:border-neutral-600 inline-block mt-0.5">
                          {(isConcluida || conclusionDate !== '-') ? conclusionDate : visitDateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Customer Profile Row */}
              <div className="border border-neutral-200 dark:border-neutral-700 p-2.5 bg-neutral-50/50 dark:bg-neutral-800/50 space-y-1.5 text-xs">
                <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest">Identificação do Cliente</span>
                <div className="grid grid-cols-2 gap-2 font-bold select-none">
                  <div>
                    <span className="block text-[7.5px] uppercase text-neutral-400">Cliente / CPF-CNPJ</span>
                    <span className="text-sm uppercase text-neutral-900 dark:text-neutral-100 font-extrabold bg-neutral-200 dark:bg-neutral-800 px-1 rounded">
                      {osToExport.clientName} {osToExport.clientDocument && <span className="font-mono text-neutral-500 font-normal ml-1">({osToExport.clientDocument})</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[7.5px] uppercase text-neutral-400">Telefone Contato</span>
                    <span className="text-[11px] text-neutral-900 dark:text-neutral-100 font-black font-mono">{osToExport.clientPhone}</span>
                  </div>
                </div>
                {(osToExport.addressComplement || osToExport.clientCity || osToExport.clientState) && (
                  <div>
                    <span className="block text-[7.5px] uppercase text-neutral-400">Cidade / Complemento</span>
                    <span className="text-[10px] text-neutral-900 dark:text-neutral-100 font-bold break-all">
                      {osToExport.addressComplement && `${osToExport.addressComplement} • `}{osToExport.clientCity}{osToExport.clientState && ` / ${osToExport.clientState}`}
                    </span>
                  </div>
                )}
                {(osToExport.additionalContacts && osToExport.additionalContacts.length > 0) && (
                  <div>
                    <span className="block text-[7.5px] uppercase text-neutral-400">Contatos Adicionais</span>
                    <div className="flex flex-wrap gap-2">
                      {osToExport.additionalContacts.map((contact, idx) => (
                         <span key={idx} className="text-[10px] text-neutral-900 dark:text-neutral-100 font-bold bg-neutral-200 dark:bg-neutral-800 px-1 rounded inline-block">
                           {contact.name}: <span className="font-mono">{contact.phone}</span>
                         </span>
                      ))}
                    </div>
                  </div>
                )}
                {osToExport.clientEmail && (
                  <div>
                    <span className="block text-[7.5px] uppercase text-neutral-400">Email Cadastrado</span>
                    <span className="text-[10px] text-neutral-900 dark:text-neutral-100 font-bold break-all">{osToExport.clientEmail}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-dashed border-neutral-300">
                  <span className="block text-[7.5px] uppercase text-neutral-400">Endereço do Chamado</span>
                  <p className="text-[10px] font-bold uppercase text-neutral-700 flex items-center gap-1 leading-tight">
                    <MapPin className="w-3 h-3 text-neutral-900 dark:text-neutral-100 shrink-0" />
                    {osToExport.address}{osToExport.addressNumber ? `, ${osToExport.addressNumber}` : ''}
                  </p>
                </div>
              </div>

              {/* Diagnostic Equipment Block */}
              <div className="space-y-1 text-xs">
                <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest">Dados do Equipamento e Incidente</span>
                <div className="border border-neutral-200 dark:border-neutral-700 p-2.5 bg-neutral-50 space-y-1.5">
                  <p className="font-extrabold text-neutral-900 dark:text-neutral-100">
                    <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1 py-0.2 rounded-2xl text-[8.5px] font-mono tracking-wider uppercase mr-2 inline-block">
                      {osToExport.equipmentType}
                    </span>
                    {osToExport.equipmentBrand} • {osToExport.equipmentModel}
                  </p>
                  <div>
                    <strong className="text-[8px] uppercase tracking-wider text-neutral-500 block mb-0.5">Problema Inicial Relatado:</strong>
                    <p className="text-[11px] text-neutral-950 dark:text-neutral-100 font-black leading-relaxed bg-neutral-100 px-1.5 py-1 rounded-sm border border-neutral-200">
                      {osToExport.reportedIssue}
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Verdict / Diagnosis */}
              {osToExport.technicalDiagnosis && (
                <div className="space-y-1 text-xs">
                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest font-sans">Laudo de Diagnóstico Técnico</span>
                  <div className="bg-neutral-50 border border-neutral-200 dark:border-neutral-700 p-2.5 text-[10px] font-black uppercase font-mono leading-relaxed text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500">
                    {osToExport.technicalDiagnosis}
                  </div>
                </div>
              )}

              {/* Serviço Realizado */}
              {osToExport.servicoRealizado && (
                <div className="space-y-1 text-xs">
                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest font-sans">Serviço Realizado</span>
                  <div className="bg-neutral-50 border border-neutral-200 dark:border-neutral-700 p-2.5 text-[10px] font-black uppercase font-mono leading-relaxed text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500">
                    {osToExport.servicoRealizado}
                  </div>
                </div>
              )}

              {/* Observações */}
              {osToExport.observacoes && (
                <div className="space-y-1 text-xs">
                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest font-sans">Observações</span>
                  <div className="bg-neutral-50 border border-neutral-200 dark:border-neutral-700 p-2.5 text-[10px] font-black uppercase font-mono leading-relaxed text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500">
                    {osToExport.observacoes}
                  </div>
                </div>
              )}

              {/* Parts Listing (if any exist) */}
              {osToExport.parts && osToExport.parts.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest">Insumos e Sobressalentes Substituídos</span>
                  <div className="border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <table className="w-full text-left text-[9.5px]">
                      <thead>
                        <tr className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[8px] font-black uppercase">
                          <th className="p-1 px-2 border-r border-neutral-700">Descrição Peça / Componente</th>
                          <th className="p-1 px-2 text-center border-r border-neutral-700 w-12">Qtd</th>
                          <th className="p-1 px-2 text-right border-r border-neutral-700 w-16">Unit (R$)</th>
                          <th className="p-1 px-2 text-right w-20">Soma (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-800">
                        {osToExport.parts.map((p, i) => (
                          <tr key={i} className="border-b last:border-0 border-black font-bold">
                            <td className="p-1 px-2 uppercase">{p.name}</td>
                            <td className="p-1 px-2 text-center font-mono">{p.quantity || 0}</td>
                            <td className="p-1 px-2 text-right font-mono">{(p.value || 0).toFixed(2)}</td>
                            <td className="p-1 px-2 text-right font-mono">{((p.value || 0) * (p.quantity || 1)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Financial Summary */}
              <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3">
                <div className="text-[9px] space-y-0.5 leading-tight font-bold text-neutral-600">
                  <span className="block text-[7.5px] font-black text-neutral-400 uppercase tracking-widest mb-1">Demonstrativo Financeiro</span>
                  {osToExport.parts && osToExport.parts.length > 0 && (
                    <div className="flex justify-between">
                      <span>Subtotal Peças:</span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">R$ {osToExport.parts.reduce((acc, p) => acc + (p.value * p.quantity), 0).toFixed(2)}</span>
                    </div>
                  )}
                  {osToExport.laborCostValue ? (
                    <div className="flex justify-between">
                      <span>Mão de Obra:</span>
                      <span className={`font-mono text-neutral-900 dark:text-neutral-100 ${osToExport.isLaborCourtesy ? 'line-through opacity-50' : ''}`}>R$ {(osToExport.laborCostValue || 0).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {osToExport.taxaDeslocamento ? (
                    <div className="flex justify-between">
                      <span>Taxa Deslocamento:</span>
                      <span className={`font-mono text-neutral-900 dark:text-neutral-100 ${osToExport.isTravelCourtesy ? 'line-through opacity-50' : ''}`}>R$ {(osToExport.taxaDeslocamento || 0).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {(osToExport.discountValue && osToExport.discountValue > 0) && (
                    <div className="flex justify-between text-rose-600">
                      <span>Desconto {osToExport.discountType === 'percentage' ? `(${osToExport.discountValue}%)` : ''}:</span>
                      <span className="font-mono">- R$ {osToExport.discountType === 'fixed' ? osToExport.discountValue.toFixed(2) : (
                        ((osToExport.parts?.reduce((acc, p) => acc + (p.value * p.quantity), 0) || 0) + 
                         (osToExport.isLaborCourtesy ? 0 : (osToExport.laborCostValue || 0)) + 
                         (osToExport.isTravelCourtesy ? 0 : (osToExport.taxaDeslocamento || 0))) * (osToExport.discountValue / 100)
                      ).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-2 flex flex-col justify-center items-end shadow-sm dark:shadow-none">
                  <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 leading-none">TOTAL {osToExport.status === 'Finalizada' ? 'PAGO' : 'ESTIMADO'}</span>
                  <span className="text-base font-black font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">R$ {(osToExport.totalCostValue || 0).toFixed(2)}</span>
                  {(osToExport.isLaborCourtesy || osToExport.isTravelCourtesy) && (
                    <span className="text-[6px] font-black text-emerald-600 uppercase mt-0.5">Inclui itens em cortesia</span>
                  )}
                </div>
              </div>

              {/* Payment Receipt / Proof of Quittance (Exclusive for Finalized OS) */}
              {osToExport.status === 'Finalizada' && (
                <div className="border border-neutral-200 dark:border-neutral-700 p-3 bg-emerald-50 dark:bg-emerald-950/20 space-y-2 mt-2">
                  <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700 pb-1.5">
                    <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Recibo de Pagamento & Quitação de Serviços
                    </span>
                    <span className="text-[8px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 uppercase tracking-widest">Pago / Quitado</span>
                  </div>
                  <p className="text-[9.2px] font-bold text-neutral-800 leading-relaxed text-justify">
                    Declaramos que o serviço especificado nesta Ordem de Serviço foi concluído e testado. Confirmamos o recebimento e a quitação integral do valor de <strong className="font-extrabold uppercase text-emerald-900 text-[10px]">R$ {(osToExport.totalCostValue || 0).toFixed(2)}</strong> pago à Assistência Técnica / Técnico Responsável{osToExport.paymentMethod ? ` através da forma de pagamento: ${osToExport.paymentMethod}${osToExport.paymentMethod === 'Cartão de Crédito' && osToExport.installments ? ` (${osToExport.installments}x de R$ ${(osToExport.totalCostValue / osToExport.installments).toFixed(2)})` : ''}` : ''}, sendo dado com este instrumento plena e geral quitação de direitos pelo reparo do equipamento, validado pelas assinaturas registradas abaixo.
                  </p>
                </div>
              )}

              {/* Warranty and Service Notice */}
              <div className="mt-2 text-center p-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 block mb-0.5">
                  TERMO DE GARANTIA LIMITADA: 3 MESES
                </span>
                <p className="text-[8px] font-bold text-neutral-600 dark:text-neutral-400">
                  Garantia de 3 (três) meses por defeito de fabricação nas peças trocadas e serviço prestado.
                </p>
              </div>

              {/* Termo de Visto & Assinatura da Ordem de Serviço */}
              <div className="border border-neutral-200 dark:border-neutral-700 p-2.5 bg-neutral-50/50 dark:bg-neutral-800/50 space-y-2 select-none mt-2">
                <span className="block text-[8px] font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider border-b border-neutral-200 dark:border-neutral-700 pb-1">
                  Visto de Campo & Assinatura da Ordem de Serviço (Abertura / Início)
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="text-center flex flex-col items-center">
                    <div className="w-full h-11 flex flex-col items-center justify-center border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 relative">
                      {(osToExport.sigTecnicoAbertura && osToExport.sigTecnicoAbertura.startsWith('data:image')) ? (
                        <img 
                          src={osToExport.sigTecnicoAbertura} 
                          alt="Assinatura Técnico" 
                          style={{ width: '130px', height: '36px', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <>
                          <span className="text-[12px] font-serif italic text-neutral-800 font-medium">
                            {(() => {
                              const tecUser = usuarios.find(u => u.tecnicoId === osToExport.tecnicoId);
                              return tecUser ? tecUser.name : 'Visto Eletrônico';
                            })()}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="block text-[6.5px] font-black text-neutral-700 uppercase tracking-widest mt-1">Assinatura do Técnico / Responsável</span>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className="w-full h-11 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 relative">
                      {osToExport.sigClienteAberturaType === 'typed' && osToExport.sigClienteAberturaTyped ? (
                        <span className="text-[12px] font-serif italic text-neutral-800 font-black">
                          {osToExport.sigClienteAberturaTyped}
                        </span>
                      ) : osToExport.sigClienteAbertura ? (
                        <img 
                          src={osToExport.sigClienteAbertura} 
                          alt="Assinatura Cliente" 
                          style={{ width: '130px', height: '36px', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <span className="text-[5px] text-zinc-400 italic uppercase absolute bottom-0.5">Sem assinatura digital</span>
                      )}
                    </div>
                    <span className="block text-[6.5px] font-black text-neutral-700 uppercase tracking-widest mt-1">Assinatura do Cliente / Recebedor</span>
                    {osToExport.sigAberturaData && (osToExport.sigClienteAbertura || osToExport.sigClienteAberturaTyped) && (
                      <span className="block text-[9px] font-mono font-black text-neutral-600 dark:text-neutral-400 uppercase mt-1">
                        Assinado em: {safeFormatDateTime(osToExport.sigAberturaData)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footnotes Authenticity */}
              <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider select-none">
                <span>Comprovante de Serviço Seguro • Sem validade fiscal</span>
                <span>Técnico Responsável: {(() => {
                  const tecUser = usuarios.find(u => u.tecnicoId === osToExport.tecnicoId);
                  return tecUser ? tecUser.name.toUpperCase() : 'NÃO ESPECIFICADO';
                })()}</span>
              </div>
            </div>

            {/* PAGE 2: Photos Gallery (Rendered only on a second page if photos exist) */}
            {((osToExport.fotos && osToExport.fotos.length > 0) || (osToExport.fotosAntes && osToExport.fotosAntes.length > 0) || (osToExport.fotosDepois && osToExport.fotosDepois.length > 0)) && (
              <div 
                id="os-receipt-card-page2"
                className="bg-white p-[20mm] space-y-6 font-sans text-neutral-900 relative shrink-0 shadow-lg flex flex-col justify-between"
                style={{ width: '210mm', minHeight: '297mm' }}
              >
                <div>
                  {/* Top Accent Strip for Page 2 */}
                  <div className="absolute top-0 left-0 right-0 h-3 bg-neutral-900" style={{ width: '210mm' }} />
                  
                  {/* Page header for consistency */}
                  <div className="flex justify-between items-center border-b-2 border-neutral-200 pb-3 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-800">
                      Evidências Fotográficas do Serviço
                    </span>
                    <span className="text-[10px] font-bold font-mono text-neutral-500">
                      #{osToExport.idFormatado}
                    </span>
                  </div>

                  <div className="space-y-6 py-4">
                    {osToExport.fotos && osToExport.fotos.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3">
                          {osToExport.fotos.map((photo, index) => (
                            <div key={`foto-${index}`} className="flex flex-col items-center bg-neutral-50 p-2 border border-neutral-200 rounded-lg shadow-sm">
                              <img src={photo.url} alt={`Foto ${index + 1}`} className="max-h-[240px] max-w-[300px] object-contain rounded" referrerPolicy="no-referrer" />
                              <span className="text-[7px] font-bold text-neutral-600 uppercase mt-2 max-w-[150px] text-center truncate">{photo.description || `Foto ${index + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!osToExport.fotos || osToExport.fotos.length === 0) && osToExport.fotosAntes && osToExport.fotosAntes.length > 0 && (
                      <div className="space-y-3">
                        <span className="block text-[8px] font-black text-rose-600 uppercase tracking-widest border-b border-rose-100 pb-1">
                          Fotos - Antes do Serviço
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {osToExport.fotosAntes.map((photo, index) => (
                            <div key={`antes-${index}`} className="flex flex-col items-center bg-neutral-50 p-2 border border-neutral-200 rounded-lg shadow-sm">
                              <img src={photo} alt={`Antes ${index + 1}`} className="max-h-[240px] max-w-[300px] object-contain rounded" referrerPolicy="no-referrer" />
                              <span className="text-[7px] font-bold text-neutral-500 uppercase mt-1">Antes {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!osToExport.fotos || osToExport.fotos.length === 0) && osToExport.fotosDepois && osToExport.fotosDepois.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-1">
                          Fotos - Depois do Serviço / Conclusão
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {osToExport.fotosDepois.map((photo, index) => (
                            <div key={`depois-${index}`} className="flex flex-col items-center bg-neutral-50 p-2 border border-neutral-200 rounded-lg shadow-sm">
                              <img src={photo} alt={`Depois ${index + 1}`} className="max-h-[240px] max-w-[300px] object-contain rounded" referrerPolicy="no-referrer" />
                              <span className="text-[7px] font-bold text-neutral-500 uppercase mt-1">Depois {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footnotes Authenticity for Page 2 */}
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider select-none mt-auto">
                  <span>Anexo Fotográfico de Serviço Seguro • Sem validade fiscal</span>
                  <span>Página 2</span>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

          {/* Modal Footer Controls */}
          <div className="bg-neutral-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-neutral-200 dark:border-neutral-700 shrink-0 rounded-b-2xl">
            <div className="flex items-center gap-2">
               {((osToExport.fotos && osToExport.fotos.length > 0) || (osToExport.fotosAntes && osToExport.fotosAntes.length > 0) || (osToExport.fotosDepois && osToExport.fotosDepois.length > 0)) && (
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input
                     type="checkbox"
                     checked={includePhotosInPdf}
                     onChange={(e) => setIncludePhotosInPdf(e.target.checked)}
                     className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                   />
                   <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-widest">
                     Incluir Anexo de Fotos no PDF
                   </span>
                 </label>
               )}
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setOsToExport(null)}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-neutral-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isExportingImage}
                onClick={handleDownloadPdf}
                className="bg-amber-300 hover:bg-amber-400 disabled:bg-amber-200 text-neutral-900 px-5 py-2 border border-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileText className="w-4 h-4 stroke-[2.5]" />
                {isExportingImage ? 'Gerando...' : 'GERAR PDF'}
              </button>
            </div>
          </div>

        </div>
      </div>
    )}

    {/* Custom Confirmation Modal */}
    {deleteConfirm && (
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <h4 className="font-black text-base uppercase tracking-wider">{deleteConfirm.title}</h4>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">{deleteConfirm.message}</p>
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 px-4 py-2 text-xs font-bold uppercase rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                deleteConfirm.onConfirm();
                setDeleteConfirm(null);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer"
            >
              Confirmar & Excluir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal Confirmar Status */}
    {osToConfirmStatus && (
      <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-neutral-100 dark:border-neutral-700">
          <h3 className="text-xl font-black mb-2 text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">Atualizar Status</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6 font-medium leading-relaxed">A OS foi concluída ou vai aguardar peça? Escolha o novo status ou mantenha o atual.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                handleApplyUpdate(osToConfirmStatus, 'Finalizada');
                setOsToConfirmStatus(null);
              }}
              className="w-full text-center bg-emerald-300 hover:bg-emerald-400 text-neutral-900 py-3 rounded-2xl text-sm font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
            >
              Concluída
            </button>
            <button
              onClick={() => {
                handleApplyUpdate(osToConfirmStatus, 'Aguardando Peça');
                setOsToConfirmStatus(null);
              }}
              className="w-full text-center bg-amber-300 hover:bg-amber-400 text-neutral-900 py-3 rounded-2xl text-sm font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
            >
              Aguardar Peça
            </button>
            <button
              onClick={() => {
                handleApplyUpdate(osToConfirmStatus);
                setOsToConfirmStatus(null);
              }}
              className="w-full text-center bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Manter Status Atual
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
             <button
               onClick={() => setOsToConfirmStatus(null)}
               className="w-full text-center text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 uppercase tracking-wider cursor-pointer"
             >
               Cancelar Salvamento
             </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
