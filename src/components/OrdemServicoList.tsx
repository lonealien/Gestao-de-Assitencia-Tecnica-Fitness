import { useState, useEffect } from 'react';
import { OrdemServico, AssistenciaTecnica, Tecnico, OSStatus, OSHistory, UserRole, Part, AppUser, StoreSettings } from '../types';
import { 
  Search, Filter, Eye, Hammer, ClipboardCheck, Clock, AlertTriangle, 
  User, CheckCircle, Ban, MessageSquarePlus, PenTool, Check, MapPin, 
  Sparkles, ShieldAlert, History, Plus, Trash2, FileText, Download, Image as ImageIcon, ExternalLink, Navigation, DollarSign, Camera, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
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
  onShowBlockedAlert?: (message: string) => void;
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
  onShowBlockedAlert
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
  const [dateAgendaFilter, setDateAgendaFilter] = useState<'Todos' | 'Hoje' | 'Específica'>('Hoje');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [showTodayCompleted, setShowTodayCompleted] = useState(false);

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
  const [editCompletionDate, setEditCompletionDate] = useState<string>('');

  // Signature states for editing OS
  const [sigTecnicoAberturaInput, setSigTecnicoAberturaInput] = useState<string>('');
  const [sigClienteAberturaInput, setSigClienteAberturaInput] = useState<string>('');
  const [sigTecnicoFinalInput, setSigTecnicoFinalInput] = useState<string>('');
  const [sigClienteFinalInput, setSigClienteFinalInput] = useState<string>('');
  const [sigAberturaDataInput, setSigAberturaDataInput] = useState<string>('');
  const [sigFinalDataInput, setSigFinalDataInput] = useState<string>('');
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
      setSelectedOSId(initialSelectedOSId);
      const os = ordens.find(o => o.id === initialSelectedOSId);
      if (os) {
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
        if (os.tecnicoId) setAssigneeTecnicoId(os.tecnicoId);
        setEditScheduledVisitDate(os.scheduledVisitDate || '');
        setEditCompletionDate(os.completionDate || '');

        // Signatures state initialization
        setSigTecnicoAberturaInput(os.sigTecnicoAbertura || '');
        setSigClienteAberturaInput(os.sigClienteAbertura || '');
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

        // Reset all list filters to allow targeted element rendering
        setStatusFilter('Todos');
        setDateAgendaFilter('Todos');
        setSearch('');

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

  // Dynamically calculate estimated total budget for modified OS
  useEffect(() => {
    if (selectedOSId) {
      const partsSum = editParts.reduce((acc, p) => acc + (p.value * p.quantity), 0);
      const labor = Number(laborCostInput) || 0;
      const deslocamento = Number(editTaxaDeslocamento) || 0;
      setCostInput(partsSum + labor + deslocamento);
    }
  }, [editParts, laborCostInput, editTaxaDeslocamento, selectedOSId]);

  // 1. Filter based on Role Scope
  let scopedOrdens = [...ordens];
  if (currentRole === 'ASSISTENCIA_GERENTE' && activeRoleEntityId) {
    scopedOrdens = ordens.filter(o => o.assistenciaId === activeRoleEntityId);
  } else if (currentRole === 'TECNICO' && activeRoleEntityId) {
    if (showTodayCompleted) {
      scopedOrdens = ordens.filter(o => 
        o.tecnicoId === activeRoleEntityId && 
        o.status === 'Finalizada' &&
        o.completionDate === todayStr
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
    const matchesSearch = 
      o.idFormatado.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentBrand.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentModel.toLowerCase().includes(search.toLowerCase()) ||
      o.reportedIssue.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;

    // Filter by appointment visit date for technician agenda
    const matchesDate = (() => {
      if (dateAgendaFilter === 'Todos') return true;
      const scheduledStr = o.scheduledVisitDate ? o.scheduledVisitDate.substring(0, 10) : '';
      if (dateAgendaFilter === 'Hoje') return scheduledStr === todayStr;
      if (dateAgendaFilter === 'Específica' && specificDate) return scheduledStr === (specificDate ? specificDate.substring(0, 10) : '');
      return true;
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: OSStatus) => {
    switch (status) {
      case 'Pendente': return 'bg-neutral-100 text-neutral-900 dark:text-neutral-100 border-black';
      case 'Aguardando Peça': return 'bg-amber-300 dark:bg-amber-400 text-neutral-900 border-black';
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

  const handleApplyUpdate = (os: OrdemServico) => {
    if (isReadOnly) {
      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
      return;
    }
    const hasVisitDateChanged = editScheduledVisitDate !== (os.scheduledVisitDate || '');
    const hasCompletionDateChanged = editCompletionDate !== (os.completionDate || '');

    const hasSigsChanged = 
      sigTecnicoAberturaInput !== (os.sigTecnicoAbertura || '') ||
      sigClienteAberturaInput !== (os.sigClienteAbertura || '') ||
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

    // Determine target/applied status. If completion date is present, force Status to 'Finalizada'.
    let appliedStatus = newStatus || os.status;
    if (editCompletionDate && editCompletionDate.trim() !== '') {
      appliedStatus = 'Finalizada';
    }

    const hasStatusChanged = appliedStatus !== os.status;

    if (!hasStatusChanged && !hasFieldsChanged && (costInput === '') && !hasVisitDateChanged && !hasCompletionDateChanged && !hasSigsChanged && !hasFotosChanged) {
      alert('Por favor, informe alguma alteração para atualizar a ordem de serviço.');
      return;
    }

    const updatedOS = { ...os };
    const dateFormatted = new Date().toISOString();
    const historyEntries: OSHistory[] = [];

    if (hasVisitDateChanged) {
      updatedOS.scheduledVisitDate = editScheduledVisitDate;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: `Data de atendimento alterada para ${editScheduledVisitDate.split('-').reverse().join('/')}`,
        author: activeUserName
      });
    }

    if (hasCompletionDateChanged) {
      updatedOS.completionDate = editCompletionDate;
      historyEntries.push({
        date: dateFormatted,
        status: os.status,
        description: `Data de finalização registrada como ${editCompletionDate.split('-').reverse().join('/')}`,
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
        updatedOS.sigAberturaData = undefined;
      }
    }

    if (sigClienteAberturaInput !== (os.sigClienteAbertura || '')) {
      updatedOS.sigClienteAbertura = sigClienteAberturaInput;
      if (sigClienteAberturaInput) {
        updatedOS.sigAberturaData = dateFormatted;
        historyEntries.push({
          date: dateFormatted,
          status: updatedOS.status,
          description: `Assinatura do Cliente na Primeira Visita (Abertura) registrada`,
          author: activeUserName
        });
      } else if (!sigTecnicoAberturaInput) {
        updatedOS.sigAberturaData = undefined;
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
        updatedOS.sigFinalData = undefined;
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
        updatedOS.sigFinalData = undefined;
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
        updatedOS.tecnicoId = undefined;
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
    updatedOS.fotosAntes = undefined;
    updatedOS.fotosDepois = undefined;
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
    setEditCompletionDate('');
    
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
       onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
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
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      
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
        style: {
          transform: `scale(${pixelRatio})`,
          transformOrigin: 'top left',
          width: `${originalWidth1}px`,
          height: `${originalHeight1}px`,
          maxHeight: 'none',
          overflow: 'visible',
        }
      });
      
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
          style: {
            transform: `scale(${pixelRatio})`,
            transformOrigin: 'top left',
            width: `${originalWidth2}px`,
            height: `${originalHeight2}px`,
            maxHeight: 'none',
            overflow: 'visible',
          }
        });
        
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
    }
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById('os-receipt-card');
    if (!node) return;
    
    setIsExportingImage(true);
    try {
      // Small timeout to allow styles/layouts to settle
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Calculate exact dimensions of the target node to avoid viewport clips
      const originalWidth = node.offsetWidth || 512;
      const originalHeight = node.scrollHeight;
      
      const dataUrl = await toJpeg(node, {
        cacheBust: true,
        backgroundColor: '#f5f5f5', // Neutral-100 placeholder background to space Pages beautifully if stacked
        width: originalWidth,
        height: originalHeight,
        quality: 0.85,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${originalWidth}px`,
          height: `${originalHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
        }
      });
      
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
    }
  };

  return (
    <div className="space-y-6">

      {/* Agenda Quick Navigation or Technician Info Banner */}
      {currentRole === 'TECNICO' ? (
        <div className="bg-emerald-50 dark:bg-neutral-800/60 border-2 border-emerald-500/30 p-5 shadow-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl shrink-0 select-none">🛠️</span>
            <div>
              <h4 className="text-sm font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-wider">
                {showTodayCompleted ? 'Ordens Finalizadas Hoje' : 'Suas Atribuições de Hoje'}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase mt-1 leading-snug">
                {showTodayCompleted 
                  ? `Exibindo ordens que você finalizou hoje (${new Date().toLocaleDateString('pt-BR')}).`
                  : `Exibindo ordens pendentes ou agendadas para hoje (${new Date().toLocaleDateString('pt-BR')}).`
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowTodayCompleted(!showTodayCompleted)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-black ${
              showTodayCompleted 
                ? 'bg-neutral-900 text-white' 
                : 'bg-emerald-400 text-neutral-900 hover:bg-emerald-500'
            }`}
          >
            {showTodayCompleted ? (
              <>
                <Hammer className="w-4 h-4" />
                Ver Pendentes
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Ver Concluídas de Hoje
              </>
            )}
          </button>
        </div>
      ) : (
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
              Hoje ({scopedOrdens.filter(o => o.scheduledVisitDate === todayStr).length})
            </button>
            <button
              onClick={() => setDateAgendaFilter('Todos')}
              className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateAgendaFilter === 'Todos' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
              }`}
            >
              Todos ({scopedOrdens.length})
            </button>
            
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                onClick={() => setDateAgendaFilter('Específica')}
                className={`px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  dateAgendaFilter === 'Específica' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900 shadow-sm dark:shadow-none' : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                Buscar Data
              </button>
              {dateAgendaFilter === 'Específica' && (
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none rounded-none"
                />
              )}
            </div>
          </div>
          
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-700">
            {dateAgendaFilter === 'Hoje' && `📅 Visualizando visitas marcadas para hoje: ${new Date().toLocaleDateString('pt-BR')}`}
            {dateAgendaFilter === 'Todos' && `📅 Exibindo todas as ordens de serviço ativas atribuídas a você.`}
            {dateAgendaFilter === 'Específica' && specificDate && `📅 Filtrando visitas agendadas para o dia: ${new Date(specificDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
          </div>
        </div>
      )}
      
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
                  className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 text-sm font-bold focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-750 placeholder-neutral-400 dark:placeholder-neutral-500"
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
                <option value="Finalizada">Finalizadas</option>
                <option value="Cancelada">Canceladas</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grid of OS cards */}
      {finalFilteredOrdens.length === 0 ? (
        <div className="bg-neutral-100 border-4 border border-dashed border-black rounded-2xl p-12 text-center text-neutral-900 dark:text-neutral-100">
          <Clock className="w-12 h-12 mx-auto text-neutral-900 dark:text-neutral-100 stroke-[2.5] mb-3" />
          <p className="font-black text-lg uppercase tracking-wider mb-1">Sem Ordens de Serviço</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {finalFilteredOrdens.map((os) => {
            const correspondingAst = assistencias.find(a => a.id === os.assistenciaId);
            const correspondingTec = usuarios.find(u => u.tecnicoId === os.tecnicoId || u.id === os.tecnicoId);
            const isEditingThisOS = selectedOSId === os.id;
            const isHistoryExpanded = expandedOSId === os.id;

            return (
              <div 
                key={os.id} 
                id={`os-card-${os.id}`}
                className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none overflow-hidden transition-all duration-150 relative"
              >
                {/* Banner accent */}
                <div className="h-2.5 w-full bg-neutral-900 dark:bg-neutral-100 border-b border-neutral-200 dark:border-neutral-700" />

                {(() => {
                  const visitDate = os.scheduledVisitDate;
                  const compDate = os.completionDate;
                  const isCollapsedView = true;
                  const isCardExpanded = !isCollapsedView || !!expandedCards[os.id] || isEditingThisOS;

                  return (
                    <div>
                      {/* Interactive Button for Collapsed/Expandable View */}
                      {isCollapsedView && (
                        <button
                          type="button"
                          onClick={() => setExpandedCards(prev => ({ ...prev, [os.id]: !prev[os.id] }))}
                          className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-all cursor-pointer select-none border-b border-neutral-100 dark:border-neutral-700/50"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-mono font-black text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs">
                              <span>⚙️ OS #{os.idFormatado}</span>
                            </div>

                            <div>
                              <span className="text-[8px] font-black text-neutral-400 block uppercase tracking-widest leading-none mb-0.5">Cliente</span>
                              <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight block truncate max-w-[200px] sm:max-w-[320px]">
                                {os.clientName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-5 ml-auto sm:ml-0">
                            {visitDate && (
                              <div className="text-right">
                                <span className="text-[8px] font-black text-neutral-400 block uppercase tracking-widest leading-none mb-0.5">Visita Agendada</span>
                                <span className="text-xs font-mono font-black text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-600">
                                  {visitDate.split('-').reverse().join('/')}
                                </span>
                              </div>
                            )}

                            <div className="text-right">
                              <span className="text-[8px] font-black text-neutral-400 block uppercase tracking-widest leading-none mb-0.5 text-right font-bold">Status OS</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 block ${getStatusColor(os.status)}`}>
                                {os.status}
                              </span>
                            </div>

                            <div className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 p-1.5 rounded-xl transition-all ml-1 text-neutral-600 dark:text-neutral-300">
                              {isCardExpanded ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
                            </div>
                          </div>
                        </button>
                      )}

                      {isCardExpanded && (
                        <div className="p-6 space-y-5">
                          {/* Card Header row - only rendered if not in collapsed mode */}
                          {!isCollapsedView && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-neutral-100 pb-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-2xl font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-100">{os.idFormatado}</span>
                                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl ${getStatusColor(os.status)}`}>
                                  {os.status}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs font-black">
                                {visitDate && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-neutral-500 uppercase tracking-widest font-black text-[10px]">Agendado para:</span>
                                    <span className="px-3 py-1.5 border-2 border-black dark:border-neutral-700 rounded-2xl font-black text-sm font-mono bg-amber-300 text-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                      {visitDate.split('-').reverse().join('/')}
                                    </span>
                                  </div>
                                )}
                                
                                {compDate && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-neutral-500 uppercase tracking-widest font-black text-[10px]">Finalizado em:</span>
                                    <span className="px-3 py-1.5 border-2 border-neutral-900 dark:border-neutral-200 rounded-2xl font-black text-sm font-mono bg-emerald-300 text-neutral-900 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.3)]">
                                      {compDate.split('-').reverse().join('/')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                  {/* Core Content Row: Equipment and Client Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Equipment Information */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Equipamento Diagnosticado
                      </h4>
                      <div className="bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl space-y-2">
                        <p className="text-sm font-black text-neutral-900 dark:text-neutral-100 flex flex-wrap items-center gap-2">
                          <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-0.5 rounded-2xl text-xs font-mono uppercase tracking-wider">{os.equipmentType}</span>
                          {os.equipmentBrand} — {os.equipmentModel}
                        </p>
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
                        {os.clientPhone && os.clientPhone.replace(/\D/g, '') !== '' && (
                          <div className="mt-2.5">
                            <a 
                              href={`https://wa.me/${(os.clientPhone.replace(/\D/g, '').length <= 11 && !os.clientPhone.replace(/\D/g, '').startsWith('55')) ? '55' : ''}${os.clientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
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
                            <span className="truncate">{os.address}{os.clientCity && `, ${os.clientCity}`}{os.clientState && ` - ${os.clientState}`}{os.clientZipCode && ` (CEP: ${os.clientZipCode})`}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${os.address}${os.clientCity ? `, ${os.clientCity}` : ''}${os.clientState ? `, ${os.clientState}` : ''}${os.clientZipCode ? `, ${os.clientZipCode}` : ''}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-white hover:bg-neutral-50 text-neutral-900 px-3 py-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                              title="Ver no Google Maps"
                            >
                              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                              Google Maps
                            </a>
                            <a 
                              href={`https://waze.com/ul?q=${encodeURIComponent(`${os.address}${os.clientCity ? `, ${os.clientCity}` : ''}${os.clientState ? `, ${os.clientState}` : ''}${os.clientZipCode ? `, ${os.clientZipCode}` : ''}`)}`}
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
                                        onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
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
                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:grid-cols-none sm:w-auto">
                      <button
                        onClick={() => setExpandedOSId(isHistoryExpanded ? null : os.id)}
                        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500 w-full justify-center"
                        title="Ver Histórico de Modificações"
                      >
                        <History className="w-4 h-4 stroke-[2.5]" />
                        {isHistoryExpanded ? 'Fechar Log' : 'Linha Tempo'}
                      </button>

                      {/* Update Action button */}
                      {!isEditingThisOS && (
                        <button
                          onClick={() => {
                            if (isReadOnly) {
                              onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
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
                            setEditCompletionDate(os.completionDate || '');
                            
                            // Load signatures
                            setSigTecnicoAberturaInput(os.sigTecnicoAbertura || '');
                            setSigClienteAberturaInput(os.sigClienteAbertura || '');
                            setSigTecnicoFinalInput(os.sigTecnicoFinal || '');
                            setSigClienteFinalInput(os.sigClienteFinal || '');
                            setSigAberturaDataInput(os.sigAberturaData || '');
                            setSigFinalDataInput(os.sigFinalData || '');

                            let allFotos: {url: string; description: string}[] = [];
                            if (os.fotos) {
                              allFotos = [...os.fotos];
                            } else {
                              if (os.fotosAntes) allFotos = [...allFotos, ...os.fotosAntes.map(url => ({url, description: "Antes"}))];
                              if (os.fotosDepois) allFotos = [...allFotos, ...os.fotosDepois.map(url => ({url, description: "Depois/Conclusão"}))];
                            }
                            setEditFotos(allFotos);
                          }}
                          className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm dark:shadow-none hover:shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer w-full justify-center"
                        >
                          <Hammer className="w-4 h-4 stroke-[2.5]" />
                          Editar OS
                        </button>
                      )}

                      {(currentRole === 'ADMIN' || currentRole === 'ASSISTENCIA_GERENTE' || currentRole === 'ATENDENTE' || currentRole === 'MASTER') && (
                        <button
                          onClick={() => setOsToExport(os)}
                          className="bg-amber-300 hover:bg-amber-400 text-neutral-900 dark:text-neutral-100 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md w-full justify-center"
                          title="Exportar OS para Cliente"
                        >
                          <FileText className="w-4 h-4 stroke-[2.5]" />
                          Exportar
                        </button>
                      )}

                       {/* Admin delete capability */}
                      {(currentRole === 'ADMIN' || currentRole === 'MASTER') && onDeleteOS && (
                        <button
                          onClick={() => {
                            if (isReadOnly) {
                              onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
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
                            <span className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-2xl bg-neutral-900 dark:bg-neutral-100 border-2 border-white" />
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

                  {/* Inline update drawer */}
                  {isEditingThisOS && (
                    <div className="bg-neutral-50 dark:bg-neutral-900/30 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-700 space-y-4 mt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 pb-2.5">
                        <span className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-5 h-5 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                          Modificar Dados e Trâmite da OS
                        </span>
                        <button 
                          onClick={() => setSelectedOSId(null)} 
                          className="w-full sm:w-auto bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                        >
                          Fechar Painel
                        </button>
                      </div>

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

                          <div className="grid grid-cols-1 gap-3.5">
                            <div>
                              <label htmlFor={`edit-visit-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5">Data de Atendimento (Início)</label>
                              <input
                                id={`edit-visit-${os.id}`}
                                type="date"
                                value={editScheduledVisitDate}
                                onChange={(e) => setEditScheduledVisitDate(e.target.value)}
                                disabled={currentRole === 'TECNICO'}
                                className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none ${currentRole === 'TECNICO' ? 'opacity-70 bg-neutral-100 cursor-not-allowed' : ''}`}
                              />
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
                              <label htmlFor={`edit-labor-cost-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5 font-mono">Mão de Obra R$</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-500">R$</span>
                                <input
                                  id={`edit-labor-cost-${os.id}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={laborCostInput === '' ? '' : laborCostInput}
                                  onChange={(e) => setLaborCostInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-8 pr-2 py-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800"
                                />
                              </div>
                            </div>

                            <div>
                              <label htmlFor={`edit-displacement-cost-${os.id}`} className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1.5 font-mono">Deslocamento R$</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-500">R$</span>
                                <input
                                  id={`edit-displacement-cost-${os.id}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={editTaxaDeslocamento === '' ? '' : editTaxaDeslocamento}
                                  onChange={(e) => setEditTaxaDeslocamento(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-8 pr-2 py-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800"
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
                                    Adicionar Peça
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
                                          className="text-red-600 hover:bg-neutral-150 p-1 border border-neutral-200 dark:border-neutral-700 transition-colors"
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
                                  <label htmlFor={`edit-comp-date-${os.id}`} className="block text-[11px] font-black uppercase text-neutral-700 mb-1">
                                    Data de Conclusão / Finalização OS
                                  </label>
                                  <input
                                    id={`edit-comp-date-${os.id}`}
                                    type="date"
                                    value={editCompletionDate}
                                    onChange={(e) => setEditCompletionDate(e.target.value)}
                                    className="w-full border border-neutral-200 dark:border-neutral-700 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                  />
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
                                  
                                  <SignaturePad
                                    label="Assinatura do Cliente"
                                    initialValue={sigClienteAberturaInput}
                                    onSave={(base64) => setSigClienteAberturaInput(base64)}
                                    onClear={() => setSigClienteAberturaInput('')}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* AUTO-SUM TOTAL FIELD - BELOW EVERYTHING */}
                            <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3.5 mt-2.5">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="block text-[10px] font-black uppercase text-neutral-500 dark:text-neutral-400 font-mono tracking-wider">Orçamento Estimado (Soma Total)</span>
                                  <span className="text-[9px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Peças + Mão de Obra + Deslocamento</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-black px-2.5 py-1 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm dark:shadow-none font-mono">
                                    R$ {Number(costInput || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2.5 border-t-2 border-black pt-4">
                              <button
                                onClick={() => setSelectedOSId(null)}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-neutral-100 cursor-pointer placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleApplyUpdate(os)}
                                className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer"
                              >
                                Salvar Atualização
                              </button>
                            </div>
                          </div>
                        )}
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

                return (
                  <div className="flex justify-between items-start border-b-2 border-neutral-200 pb-5 pt-3">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-1">
                        <Sparkles className="w-4.5 h-4.5 text-neutral-900 dark:text-neutral-100 shrink-0" />
                        {compName}
                      </h3>
                      <div className="text-[9px] font-bold text-neutral-500 uppercase mt-0.5 space-y-0.5 leading-tight">
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
                    
                    <div className="text-right">
                      <span className="text-[8px] font-black bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-0.5 uppercase tracking-widest">Documento Oficial</span>
                      <div className="text-sm font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">{osToExport.idFormatado}</div>
                      <div className="text-[8px] font-bold font-mono text-neutral-500 uppercase mt-0.5">Abertura: {new Date(osToExport.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                );
              })()}

              {/* High Contrast Banner showing Completion Status & Dates */}
              {(() => {
                const isConcluida = osToExport.status === 'Finalizada';
                
                // Hunt for the date when it was finalized in history
                const conclusionDate = osToExport.completionDate 
                  ? new Date(osToExport.completionDate + 'T12:00:00').toLocaleDateString('pt-BR') 
                  : '-';
                
                const visitDateStr = osToExport.scheduledVisitDate
                  ? new Date(osToExport.scheduledVisitDate + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '-';

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
                    {osToExport.address}
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
                            <td className="p-1 px-2 text-center font-mono">{p.quantity}</td>
                            <td className="p-1 px-2 text-right font-mono">{p.value.toFixed(2)}</td>
                            <td className="p-1 px-2 text-right font-mono">{(p.value * p.quantity).toFixed(2)}</td>
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
                      <span>Total Peças:</span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">R$ {osToExport.parts.reduce((acc, p) => acc + (p.value * p.quantity), 0).toFixed(2)}</span>
                    </div>
                  )}
                  {osToExport.laborCostValue ? (
                    <div className="flex justify-between">
                      <span>Total Mão de Obra:</span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">R$ {osToExport.laborCostValue.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {osToExport.taxaDeslocamento ? (
                    <div className="flex justify-between">
                      <span>Taxa Deslocamento:</span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">R$ {osToExport.taxaDeslocamento.toFixed(2)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-2 flex flex-col justify-center items-end shadow-sm dark:shadow-none">
                  <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 leading-none">ORÇAMENTO TOTAL ESTIMADO</span>
                  <span className="text-base font-black font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">R$ {osToExport.totalCostValue.toFixed(2)}</span>
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
                    Declaramos que o serviço especificado nesta Ordem de Serviço foi concluído e testado. Confirmamos o recebimento e a quitação integral do valor de <strong className="font-extrabold uppercase text-emerald-900 text-[10px]">R$ {osToExport.totalCostValue.toFixed(2)}</strong> pago à Assistência Técnica / Técnico Responsável, sendo dado com este instrumento plena e geral quitação de direitos pelo reparo do equipamento, validado pelas assinaturas registradas abaixo.
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
                      {osToExport.sigClienteAbertura ? (
                        <img 
                          src={osToExport.sigClienteAbertura} 
                          alt="Assinatura Cliente" 
                          style={{ width: '130px', height: '36px', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <span className="text-[5px] text-zinc-350 italic uppercase absolute bottom-0.5">Sem assinatura digital</span>
                      )}
                    </div>
                    <span className="block text-[6.5px] font-black text-neutral-700 uppercase tracking-widest mt-1">Assinatura do Cliente / Recebedor</span>
                  </div>
                </div>

                {osToExport.sigAberturaData && (
                  <p className="text-[7.5px] font-mono text-center font-bold text-neutral-500 uppercase">
                    Visto Técnico Registrado em: {new Date(osToExport.sigAberturaData).toLocaleDateString('pt-BR')} {new Date(osToExport.sigAberturaData).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
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
              className="bg-neutral-150 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 px-4 py-2 text-xs font-bold uppercase rounded-xl cursor-pointer"
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
  </div>
);
}
