import React, { useState, useRef } from 'react';
import { 
  Building2, Users, ClipboardList, Plus, Trash2, Calendar, 
  Download, Upload, Check, AlertCircle, Eye, Shield, 
  Search, ShieldAlert, CheckCircle, Ban, X, KeyRound, LogOut, Sun, Moon, ChevronDown, ChevronRight, MessageCircle, Settings
} from 'lucide-react';
import { AssistenciaTecnica, OrdemServico, Tecnico, AppUser } from '../types';
import { maskPhone, maskDocument, maskCEP } from '../utils';

interface MasterDashboardProps {
  assistencias: AssistenciaTecnica[];
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  usuarios: AppUser[];
  loggedUser: AppUser;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onAddAssistencia: (ast: AssistenciaTecnica) => void;
  onDeleteAssistencia: (id: string) => void;
  onUpdateAssistencia: (ast: AssistenciaTecnica) => void;
  onAddUser: (user: AppUser) => void;
  onDeleteUser: (id: string) => void;
  onToggleUserActive: (id: string) => void;
  onRestoreBackup: (backup: {
    assistencia: AssistenciaTecnica;
    ordens: OrdemServico[];
    tecnicos: Tecnico[];
    usuarios: AppUser[];
  }) => Promise<void>;
  onPurgeDatabase?: () => Promise<void>;
  onUpdateUser?: (user: AppUser) => void;
}

export default function MasterDashboard({
  assistencias,
  ordens,
  tecnicos,
  usuarios,
  loggedUser,
  onLogout,
  isDarkMode,
  setIsDarkMode,
  onAddAssistencia,
  onDeleteAssistencia,
  onUpdateAssistencia,
  onAddUser,
  onDeleteUser,
  onToggleUserActive,
  onRestoreBackup,
  onPurgeDatabase,
  onUpdateUser
}: MasterDashboardProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'ordens' | 'usuarios'>('empresas');
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // New Assistência Form State
  const [astName, setAstName] = useState('');
  const [astCNPJ, setAstCNPJ] = useState('');
  const [astPhone, setAstPhone] = useState('');
  const [astWhatsapp, setAstWhatsapp] = useState('');
  const [astEmail, setAstEmail] = useState('');
  const [astAddress, setAstAddress] = useState('');
  const [astCity, setAstCity] = useState('');
  const [astState, setAstState] = useState('');
  const [astZipCode, setAstZipCode] = useState('');
  
  // New Admin User credentials for the brand-new assistencas
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  // Expiration inputs
  const [customExpDates, setCustomExpDates] = useState<{ [key: string]: string }>({});

  // Search & Filter globals
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAstFilter, setSelectedAstFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoringAstId, setRestoringAstId] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  const [passwordEditingUser, setPasswordEditingUser] = useState<AppUser | null>(null);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');

  // Sates for direct/independent administrator user registration
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newAdminNameInput, setNewAdminNameInput] = useState('');
  const [newAdminUsernameInput, setNewAdminUsernameInput] = useState('');
  const [newAdminEmailState, setNewAdminEmailState] = useState('');
  const [newAdminPasswordState, setNewAdminPasswordState] = useState('');
  const [newAdminAssistenciaId, setNewAdminAssistenciaId] = useState('');

  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [migrationProgress, setMigrationProgress] = useState('');

  const executeOldDatabaseMigration = async () => {
    setMigrationStatus('loading');
    setMigrationProgress('Inicializando conexão com o banco anterior...');

    try {
      const { initializeApp, deleteApp } = await import('firebase/app');
      const { initializeFirestore, collection, getDocs, doc, setDoc, terminate } = await import('firebase/firestore');
      const { db: dbTarget } = await import('../firebase');

      const firebaseConfigOld = {
        apiKey: "AIzaSyCa_PdxFwIMOGOOvY1wngWn5m7wydXNA5A",
        authDomain: "woven-bivouac-kk7s0.firebaseapp.com",
        projectId: "woven-bivouac-kk7s0",
        storageBucket: "woven-bivouac-kk7s0.firebasestorage.app",
        messagingSenderId: "964126565029",
        appId: "1:964126565029:web:c72a40a947e1a7d729e34c",
        databaseId: "ai-studio-7ad3c002-2b58-4d4f-b9ea-8955bae2e53a"
      };

      const appSource = initializeApp(firebaseConfigOld, "migration-source-browser-" + Date.now());
      const dbSource = initializeFirestore(appSource, { ignoreUndefinedProperties: true }, firebaseConfigOld.databaseId);

      const collectionsToMigrate = ['usuarios', 'assistencias', 'tecnicos', 'ordens', 'settings'];

      for (const colName of collectionsToMigrate) {
        setMigrationProgress(`Lendo coleção "${colName}"...`);
        const snapshot = await getDocs(collection(dbSource, colName));
        setMigrationProgress(`Importando "${colName}" (${snapshot.size} documentos)...`);
        
        let count = 0;
        for (const sDoc of snapshot.docs) {
          const data = sDoc.data();
          await setDoc(doc(dbTarget, colName, sDoc.id), data);
          count++;
          setMigrationProgress(`Salvando "${colName}": ${count}/${snapshot.size} concluídos`);
        }
      }

      setMigrationProgress('Concluindo conexões...');
      await terminate(dbSource);
      await deleteApp(appSource);

      setMigrationStatus('success');
      setMigrationProgress('Migração de dados completada com sucesso!');
      triggerSuccessMsg("Sucesso! Todos os dados das assistências, ordens de serviço, técnicos, configurações e usuários foram copiados com sucesso.");
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setMigrationStatus('error');
      setMigrationProgress(`Falha na migração: ${err?.message || err}`);
      triggerErrorMsg(`Falha na migração: ${err?.message || err}`);
    }
  };

  const handleMigrateOldDatabase = () => {
    setDeleteConfirm({
      title: "🔄 IMPORTAR DADOS DO BANCO ANTERIOR",
      message: "Isso importará as informações completas (usuários, assistências, técnicos, ordens de serviço e configurações) do banco de dados anterior para o novo banco ativo.\n\nTodos os registros antigos serão copiados ou atualizados neste banco.\n\nDeseja realmente iniciar a migração de dados através do navegador?",
      onConfirm: async () => {
        setDeleteConfirm(null);
        await executeOldDatabaseMigration();
      },
      isDanger: false
    });
  };

  // Master Profile Edit States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [configPhone, setConfigPhone] = useState('');
  const [configPassword, setConfigPassword] = useState('');

  const handleOpenConfigModal = () => {
    setConfigName(loggedUser.name || '');
    setConfigEmail(loggedUser.email || '');
    setConfigPhone(loggedUser.phone || '');
    setConfigPassword(loggedUser.password || '');
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configName.trim() || !configEmail.trim()) {
      triggerErrorMsg('Nome e E-mail são obrigatórios.');
      return;
    }

    const updatedUser: AppUser = {
      ...loggedUser,
      name: configName.trim(),
      email: configEmail.trim(),
      phone: configPhone.trim(),
      password: configPassword.trim()
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
      triggerSuccessMsg('Perfil Master atualizado com sucesso!');
      setShowConfigModal(false);
    } else {
      triggerErrorMsg('Não foi possível salvar as alterações (onUpdateUser não configurado).');
    }
  };

  const triggerSuccessMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const triggerErrorMsg = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // 1. Add new company & create its admin account
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!astName.trim() || !astCity.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      triggerErrorMsg('Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const emailLower = adminEmail.trim().toLowerCase();
    const emailExists = usuarios.some(u => u.email?.toLowerCase() === emailLower);
    if (emailExists) {
      triggerErrorMsg('O e-mail administrativo já está cadastrado no sistema.');
      return;
    }

    // 1. Generate IDs
    const newAstId = 'ast-' + Date.now();
    const newUserId = 'usr-' + Date.now();

    // Default 30 days credit/expiration date
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);

    const newAssistencia: AssistenciaTecnica = {
      id: newAstId,
      name: astName.trim(),
      phone: astPhone.trim() || '(00) 00000-0000',
      whatsapp: astWhatsapp.trim(),
      email: astEmail.trim() || `${emailLower}`,
      address: astAddress.trim() || 'Sem Endereço cadastrado',
      city: astCity.trim(),
      state: astState.trim().toUpperCase() || 'SP',
      cnpj: astCNPJ.trim(),
      zipCode: astZipCode.trim(),
      expiresAt: expiration.toISOString(),
      active: true
    };

    const newAdminUser: AppUser = {
      id: newUserId,
      name: adminName.trim() || `Admin ${astName.trim()}`,
      username: emailLower,
      email: emailLower,
      password: adminPassword.trim(),
      role: 'ADMIN',
      assistenciaId: newAstId,
      active: true
    };

    onAddAssistencia(newAssistencia);
    onAddUser(newAdminUser);

    triggerSuccessMsg(`Assistência "${astName}" cadastrada com Admin "${emailLower}"! Acesso liberado por 30 dias.`);
    
    // Clear Form
    setAstName('');
    setAstCNPJ('');
    setAstPhone('');
    setAstWhatsapp('');
    setAstEmail('');
    setAstAddress('');
    setAstCity('');
    setAstState('');
    setAstZipCode('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminName('');
    setShowAddForm(false);
  };

  const handleCreateAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newAdminNameInput.trim() || !newAdminUsernameInput.trim() || !newAdminPasswordState.trim() || !newAdminAssistenciaId) {
      triggerErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const usernameLower = newAdminUsernameInput.trim().toLowerCase();
    const usernameExists = usuarios.some(u => u.username?.toLowerCase() === usernameLower);
    if (usernameExists) {
      triggerErrorMsg('O nome de usuário administrativo já está cadastrado no sistema.');
      return;
    }

    const newUserId = 'usr-' + Date.now();

    const newAdminUser: AppUser = {
      id: newUserId,
      name: newAdminNameInput.trim(),
      username: usernameLower,
      email: newAdminEmailState.trim() || `${usernameLower}@system.com`,
      password: newAdminPasswordState.trim(),
      role: 'ADMIN',
      assistenciaId: newAdminAssistenciaId,
      active: true
    };

    onAddUser(newAdminUser);
    triggerSuccessMsg(`Administrador "${usernameLower}" cadastrado e associado com sucesso!`);

    // Reset fields
    setNewAdminNameInput('');
    setNewAdminUsernameInput('');
    setNewAdminEmailState('');
    setNewAdminPasswordState('');
    setNewAdminAssistenciaId('');
    setShowAddUserForm(false);
  };

  // 2. Extend Credits (+30 days)
  const handleExtendCredits = (ast: AssistenciaTecnica, days = 30) => {
    try {
      const currentExp = ast.expiresAt ? new Date(ast.expiresAt) : new Date();
      const baseDate = currentExp < new Date() ? new Date() : currentExp; // Se expirado, inicia do dia de hoje
      
      baseDate.setDate(baseDate.getDate() + days);
      
      const updatedAst: AssistenciaTecnica = {
        ...ast,
        expiresAt: baseDate.toISOString()
      };

      onUpdateAssistencia(updatedAst);
      triggerSuccessMsg(`Assistência "${ast.name}" recebeu +${days} dias de crédito! Vencimento em ${baseDate.toLocaleDateString('pt-BR')}`);
    } catch(err) {
      console.error(err);
      triggerErrorMsg('Falha ao estender créditos.');
    }
  };

  // Custom End Date Update
  const handleSetCustomExpiration = (ast: AssistenciaTecnica) => {
    const customDateStr = customExpDates[ast.id];
    if (!customDateStr) return;

    try {
      const selectedDate = new Date(customDateStr + 'T23:59:59');
      const updatedAst: AssistenciaTecnica = {
        ...ast,
        expiresAt: selectedDate.toISOString()
      };
      onUpdateAssistencia(updatedAst);
      triggerSuccessMsg(`Vencimento de "${ast.name}" atualizado para ${selectedDate.toLocaleDateString('pt-BR')}`);
    } catch (_) {
      triggerErrorMsg('Data inválida selecionada.');
    }
  };

    // 3. Toggle Assistência block status manually
  const handleToggleAssistencia = (ast: AssistenciaTecnica) => {
    try {
      const updatedAst: AssistenciaTecnica = {
        ...ast,
        active: ast.active !== false ? false : true
      };
      onUpdateAssistencia(updatedAst);
      triggerSuccessMsg(`Status de "${ast.name}" alterado para ${updatedAst.active ? 'Ativo' : 'Bloqueado'}!`);
    } catch (err) {
      console.error(err);
      triggerErrorMsg('Falha ao alterar status da assistência.');
    }
  };

  // 4. Per-Assistencia Backup Generation (.json)
  const handleBackupDownload = (ast: AssistenciaTecnica) => {
    try {
      const astOrdens = ordens.filter(o => o.assistenciaId === ast.id);
      const astTecnicos = tecnicos.filter(t => t.assistenciaId === ast.id);
      const astUsuarios = usuarios.filter(u => u.assistenciaId === ast.id);

      const backupObj = {
        type: 'assistencia_backup',
        version: '1.0',
        timestamp: new Date().toISOString(),
        assistencia: ast,
        ordens: astOrdens,
        tecnicos: astTecnicos,
        usuarios: astUsuarios
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupObj, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement('a');
      const safeName = ast.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `backup_${safeName}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      triggerSuccessMsg(`Backup de "${ast.name}" exportado com sucesso!`);
    } catch (err) {
      console.error(err);
      triggerErrorMsg('Falha ao gerar backup.');
    }
  };

  // 5. Per-Assistencia Backup Upload / RESTORE
  const handleBackupUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRestoringAstId(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textStr = event.target?.result as string;
        const backupObj = JSON.parse(textStr);

        if (backupObj.type !== 'assistencia_backup' || !backupObj.assistencia) {
          triggerErrorMsg('Arquivo de backup inválido ou incompatível.');
          setRestoringAstId(null);
          return;
        }

        if (restoringAstId && restoringAstId !== backupObj.assistencia.id) {
          triggerErrorMsg(`Este backup pertence à empresa ID "${backupObj.assistencia.id}". Você só pode restaurar backups correspondentes à empresa selecionada.`);
          setRestoringAstId(null);
          return;
        }

        // Inform user about restoration
        if (window.confirm(`Deseja restaurar o backup de "${backupObj.assistencia.name}"? Isso substituirá ou re-adicionará registros antigos salvos.`)) {
          await onRestoreBackup({
            assistencia: backupObj.assistencia,
            ordens: backupObj.ordens || [],
            tecnicos: backupObj.tecnicos || [],
            usuarios: backupObj.usuarios || []
          });
          triggerSuccessMsg(`Backup de "${backupObj.assistencia.name}" restaurado no sistema com sucesso!`);
        }
      } catch (err) {
        console.error(err);
        triggerErrorMsg('Erro ao ler ou analisar o arquivo de backup.');
      }
      setRestoringAstId(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  // Format Expiration status
  const getExpirationBadge = (ast: AssistenciaTecnica) => {
    if (ast.active === false) {
      return (
        <span className="bg-rose-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-2xl block text-center shadow-sm">
          Bloqueado Master
        </span>
      );
    }

    if (!ast.expiresAt) {
      return (
        <span className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-2xl block text-center shadow-sm">
          Acesso Total
        </span>
      );
    }

    const expDate = new Date(ast.expiresAt);
    const now = new Date();
    
    if (expDate <= now) {
      return (
        <div className="text-center">
          <span className="bg-rose-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-2xl block shadow-sm mb-1">
            Plano Expirado
          </span>
          <span className="text-[10px] text-rose-500 font-bold block leading-none">Expirou em {expDate.toLocaleDateString('pt-BR')}</span>
        </div>
      );
    }

    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
      <div className="text-center">
        <span className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-2xl block shadow-sm mb-1">
          {diffDays} Dias Restantes
        </span>
        <span className="text-[10px] text-neutral-500 font-bold block leading-none">Até {expDate.toLocaleDateString('pt-BR')}</span>
      </div>
    );
  };

  // Filter computations
  const searchedAssistencias = assistencias.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.cnpj?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchedOrdens = ordens.filter(o => {
    const ast = assistencias.find(a => a.id === o.assistenciaId);
    const textMatch = 
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.equipmentModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ast && ast.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const filterMatch = selectedAstFilter ? o.assistenciaId === selectedAstFilter : true;
    return textMatch && filterMatch;
  });

  const searchedUsuarios = usuarios.filter(u => {
    // Show only ADMIN or ASSISTENCIA_GERENTE roles (admins of each company)
    const isCompanyAdmin = u.role === 'ADMIN' || u.role === 'ASSISTENCIA_GERENTE';
    if (!isCompanyAdmin) return false;

    const ast = assistencias.find(a => a.id === u.assistenciaId);
    const textMatch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ast && ast.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const filterMatch = selectedAstFilter ? u.assistenciaId === selectedAstFilter : true;
    return textMatch && filterMatch;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100 antialiased flex flex-col justify-between transition-colors duration-200">
      
      {/* Hidden file uploader for restore */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleBackupUploadChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Modern Platform Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-300 p-2.5 rounded-2xl shadow-inner text-neutral-900">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-black text-neutral-900 dark:text-neutral-100 text-lg uppercase tracking-tight leading-none">Painel MASTER ADMIN</h1>
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mt-1">Monitoramento de Assistências Técnicas</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme & Profile */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl hover:shadow-md transition-all cursor-pointer flex items-center justify-center"
              title="Alternar Tema Escuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleOpenConfigModal}
              className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl hover:shadow-md transition-all cursor-pointer flex items-center justify-center"
              title="Configurações do Perfil"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="hidden sm:block text-right">
              <span className="text-[9px] text-rose-500 block leading-none font-black uppercase">Master</span>
              <span className="text-xs font-black uppercase">{loggedUser.name}</span>
            </div>

            <button
              onClick={onLogout}
              className="bg-rose-500 hover:bg-rose-600 text-white p-2.5 border border-rose-600 rounded-2xl hover:shadow-md transition-all flex items-center gap-1 text-[10px] uppercase font-black cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[3]" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View with Tabs Block */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Alerts Feedback */}
        {successMsg && (
          <div className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-900 p-4 font-bold text-xs uppercase tracking-wider flex items-center gap-2 animate-fadeIn rounded-xl shadow-sm">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-900 p-4 font-bold text-xs uppercase tracking-wider flex items-center gap-2 animate-fadeIn rounded-xl shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" /> {errorMsg}
          </div>
        )}

        {/* Search Search Filter Controllers */}
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Main system tabs */}
          <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1.5 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('empresas'); setSearchQuery(''); }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'empresas' ? 'bg-yellow-300 text-neutral-900 shadow-sm' : 'hover:bg-neutral-200 text-neutral-500'
              }`}
            >
              <Building2 className="w-4 h-4" /> Empresas / Oficinas
            </button>
            <button
              onClick={() => { setActiveTab('usuarios'); setSearchQuery(''); }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'usuarios' ? 'bg-yellow-300 text-neutral-900 shadow-sm' : 'hover:bg-neutral-200 text-neutral-500'
              }`}
            >
              <Users className="w-4 h-4" /> Admins das Empresas
            </button>
          </div>

          <div className="flex gap-4 w-full md:w-auto flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'empresas' ? "Buscar empresa, cidade, CNPJ..."
                  : "Buscar administrador por nome, e-mail ou login..."
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none placeholder-neutral-500 font-bold"
              />
            </div>
            {activeTab !== 'empresas' && (
              <select
                value={selectedAstFilter}
                onChange={e => setSelectedAstFilter(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 text-xs font-bold uppercase rounded-2xl focus:outline-none min-w-[150px]"
              >
                <option value="">Todas Oficinas</option>
                {assistencias.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* MAIN PANEL CONTENT WINDOWS */}

        {activeTab === 'empresas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-xl font-black uppercase text-neutral-900 dark:text-neutral-100">Painel de Empresas Parceiras</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMigrateOldDatabase}
                  disabled={migrationStatus === 'loading'}
                  className={`text-xs font-black uppercase tracking-widest px-5 py-3 border-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    migrationStatus === 'loading'
                      ? 'bg-amber-600/70 border-amber-500 text-white cursor-not-allowed animate-pulse'
                      : 'bg-amber-600 border-amber-700 text-white hover:bg-amber-700 hover:shadow-md'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {migrationStatus === 'loading' ? 'Migrando Banco...' : 'Migrar Dados do Banco Anterior'}
                </button>

                {onPurgeDatabase && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirm({
                        title: "⚠️ LIMPAR TOTALMENTE BANCO DE DADOS ⚠️",
                        message: "Tem certeza absoluta que deseja excluir permanentemente todas as empresas parceiras, técnicos, ordens de serviço e todas as contas de usuários (EXCETO a conta Clemente Master) do Firestore e localStorage?\n\nEsta ação apagará absolutamente todos os registros antigos para que o sistema comece limpo em produção.",
                        onConfirm: async () => {
                          await onPurgeDatabase();
                          triggerSuccessMsg("Base de dados limpa com sucesso! Todas as informações antigas foram apagadas.");
                        },
                        isDanger: true
                      });
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest px-5 py-3 border border-rose-600 rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Base do Sistema
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 text-xs font-black uppercase tracking-widest px-5 py-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                  {showAddForm ? 'Cancelar' : 'Cadastrar Nova Empresa'}
                </button>
              </div>
            </div>

            {migrationProgress && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 p-4 rounded-2xl text-xs font-mono leading-relaxed shadow-sm">
                <p className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-ping"></span>
                  Migração em Andamento: {migrationProgress}
                </p>
              </div>
            )}

            {/* Cadastro inline accordion */}
            {showAddForm && (
              <form onSubmit={handleCreateCompany} className="bg-amber-50 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 p-6 rounded-2xl space-y-4 animate-fadeIn">
                <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 border-b border-black dark:border-neutral-700 pb-2 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> 1. DADOS CADASTRAIS DA NOVA ASSISTÊNCIA
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Nome Fantasia *</label>
                    <input 
                      type="text" required value={astName} onChange={e => setAstName(e.target.value)}
                      placeholder="Ex: Rio Fitness Assistência"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">CNPJ (Opcional)</label>
                    <input 
                      type="text" value={astCNPJ} onChange={e => setAstCNPJ(maskDocument(e.target.value))}
                      placeholder="Ex: 00.000.000/0000-00"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Cidade *</label>
                    <input 
                      type="text" required value={astCity} onChange={e => setAstCity(e.target.value)}
                      placeholder="Ex: Rio de Janeiro"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Estado (UF) *</label>
                    <input 
                      type="text" required maxLength={2} value={astState} onChange={e => setAstState(e.target.value)}
                      placeholder="Ex: RJ"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Endereço Completo</label>
                    <input 
                      type="text" value={astAddress} onChange={e => setAstAddress(e.target.value)}
                      placeholder="Ex: Av. Presidente Vargas, 450"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">CEP</label>
                    <input 
                      type="text" value={astZipCode} onChange={e => setAstZipCode(maskCEP(e.target.value))}
                      placeholder="Ex: 20000-000"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Telefone de Contato</label>
                    <input 
                      type="text" value={astPhone} onChange={e => setAstPhone(maskPhone(e.target.value))}
                      placeholder="Ex: (21) 99999-9999"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1 text-emerald-500">WhatsApp da Empresa</label>
                    <input 
                      type="text" value={astWhatsapp} onChange={e => setAstWhatsapp(maskPhone(e.target.value))}
                      placeholder="Ex: (21) 99999-9999"
                      className="w-full bg-white dark:bg-neutral-950 border border-emerald-200 p-2.5 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">E-mail</label>
                    <input 
                      type="email" value={astEmail} onChange={e => setAstEmail(e.target.value)}
                      placeholder="Ex: contato@riofitness.com"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 border-b border-black dark:border-neutral-700 pb-2 pt-4 mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> 2. CREDENCIAIS DO USUÁRIO ADMINISTRADOR DA OFICINA
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Nome Completo do Admin *</label>
                    <input 
                      type="text" required value={adminName} onChange={e => setAdminName(e.target.value)}
                      placeholder="Ex: Carlos Albuquerque"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">E-mail de Acesso *</label>
                    <input 
                      type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                      placeholder="Ex: carlos@empresa.com"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Senha de Entrada *</label>
                    <input 
                      type="text" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-dashed border-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-300 hover:bg-neutral-100 p-3 font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-3 font-black uppercase tracking-widest hover:bg-neutral-800 cursor-pointer rounded-xl flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Concluir & Cadastrar Empresa
                  </button>
                </div>
              </form>
            )}

            {/* List of Companies */}
            <div className="grid grid-cols-1 gap-6">
              {searchedAssistencias.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-800 border rounded-2xl">
                  <Building2 className="w-12 h-12 text-neutral-300 mx-auto" strokeWidth={1} />
                  <p className="text-xs uppercase font-black text-neutral-500 mt-3">Nenhuma assistência encontrada na busca.</p>
                </div>
              ) : (
                searchedAssistencias.map(ast => {
                  const companyAdmin = usuarios.find(u => u.assistenciaId === ast.id && u.role === 'ADMIN');
                  const isBlockedVal = ast.active === false;

                  return (
                    <div key={ast.id} className={`bg-white dark:bg-neutral-800 border rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col leading-normal ${isBlockedVal ? 'border-rose-400 bg-rose-50/5' : 'border-neutral-200'}`}>
                      {/* Always visible minimal header */}
                      <div 
                        className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer select-none"
                        onClick={() => setExpandedCompanies(prev => ({ ...prev, [ast.id]: !prev[ast.id] }))}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg text-neutral-900 ${isBlockedVal ? 'bg-rose-100' : 'bg-neutral-100 shadow-sm'}`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm uppercase text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                              {ast.name}
                              <span className="text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                                {expandedCompanies[ast.id] ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                              {isBlockedVal && <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2 py-0.5 tracking-widest rounded">BLOQUEADA DE ACESSO</span>}
                            </h4>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">
                              ID: {ast.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            {getExpirationBadge(ast)}
                          </div>
                        </div>
                      </div>

                      {/* Expansible Details Content */}
                      {expandedCompanies[ast.id] && (
                        <div className="p-5 border-t border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col lg:flex-row lg:items-end justify-between gap-6 animate-fadeIn">
                          {/* Left: General data */}
                          <div className="space-y-2 max-w-xl">
                            <h5 className="font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-2 mb-3">Detalhes da Assistência</h5>
                            <div className="text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300">
                              <p>📄 <strong>CNPJ:</strong> {ast.cnpj || '—'}</p>
                              <p>📍 <strong>Endereço:</strong> {ast.address || '—'}</p>
                              <p>🌍 <strong>Cidade/Estado:</strong> {ast.city || '—'} - {ast.state || '—'}</p>
                              <p>📮 <strong>CEP:</strong> {ast.zipCode || '—'}</p>
                              <p>✉️ <strong>Email:</strong> {ast.email || '—'}</p>
                              <p>📞 <strong>Telefone:</strong> {ast.phone || '—'}</p>
                              {ast.whatsapp && <p>📱 <strong>WhatsApp:</strong> {ast.whatsapp}</p>}
                              {(ast.whatsapp || ast.phone) && (
                                <p className="pt-2">
                                  <a 
                                    href={`https://wa.me/55${(ast.whatsapp || ast.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, falando aqui da administração do sistema.`)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-[#25D366] hover:bg-[#1DA851] text-white font-black text-[10px] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 uppercase tracking-wide cursor-pointer transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" /> Falar no WhatsApp
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Credits, Backup & Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-col lg:items-end justify-center gap-4 lg:text-right w-full lg:w-auto">
                            
                            {/* Fast Credits & Expiration setup */}
                            <div className="w-full sm:w-auto bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-start gap-2">
                              <span className="text-[9px] text-neutral-500 font-black uppercase">Configurar Crédito / Vencimento:</span>
                              <div className="flex flex-nowrap items-center gap-3 overflow-x-auto w-full">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleExtendCredits(ast, 30)}
                                    className="bg-yellow-300 hover:bg-yellow-400 text-neutral-950 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 border border-yellow-400 rounded-lg cursor-pointer"
                                    title="Adicionar 30 dias adicionais de crédito"
                                  >
                                    +30 Dias
                                  </button>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="date"
                                    id={`custom-date-${ast.id}`}
                                    value={customExpDates[ast.id] || ''}
                                    onChange={e => setCustomExpDates({ ...customExpDates, [ast.id]: e.target.value })}
                                    className="border border-neutral-200 dark:border-neutral-800 text-[10px] p-1 font-bold h-7 rounded-md focus:outline-none bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                                  />
                                  <button
                                    onClick={() => handleSetCustomExpiration(ast)}
                                    className="bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold text-[10px] px-3 h-7 rounded-md cursor-pointer"
                                  >
                                    Aplicar
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Action buttons (blocking, Backup Import/Export, delete company) */}
                            <div className="flex gap-2 justify-end items-center flex-wrap w-full sm:w-auto pt-2 lg:pt-0">
                              <button
                                onClick={() => handleToggleAssistencia(ast)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isBlockedVal ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200'}`}
                                title={isBlockedVal ? "Desbloquear Empresa" : "Bloquear Acesso da Oficina"}
                              >
                                {isBlockedVal ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setRestoringAstId(ast.id);
                                  if (fileInputRef.current) fileInputRef.current.click();
                                }}
                                className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200 p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                title="Importar/Restaurar Backup (.JSON)"
                              >
                                <Upload className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleBackupDownload(ast)}
                                className="bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                title="Exportar Backup de Dados (.JSON)"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    title: "⚠️ EXCLUSÃO MASTER DE SEGURANÇA ⚠️",
                                    message: `Tem certeza que deseja excluir a assistência técnica "${ast.name}" de forma DEFINITIVA?\n\nTodos os técnicos, usuários de entrada e histórico de ordens vinculadas a esta assistência serão removidos permanentemente.\n\nATENÇÃO: Recomenda-se gerar um backup antes de prosseguir!`,
                                    onConfirm: () => {
                                      onDeleteAssistencia(ast.id);
                                      triggerSuccessMsg(`Assistência "${ast.name}" foi excluída permanentemente.`);
                                    },
                                    isDanger: true
                                  });
                                }}
                                className="bg-rose-500 text-white hover:bg-rose-600 p-2.5 rounded-xl transition-colors cursor-pointer border border-rose-600 shadow-sm"
                                title="Excluir Empresa Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2 gap-2">
              <h3 className="text-lg font-black uppercase text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                Segurança: Contas de Usuários no Sistema ({searchedUsuarios.length} Contas)
              </h3>

            </div>

            {showAddUserForm && (
              <form onSubmit={handleCreateAdminUser} className="bg-amber-50 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 p-6 rounded-2xl space-y-4 animate-fadeIn text-neutral-900 dark:text-neutral-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950 dark:text-neutral-50 pb-2 mb-2 flex items-center gap-1.5 border-b border-black dark:border-neutral-800">
                  <Plus className="w-4 h-4 text-neutral-950 dark:text-neutral-50" /> Cadastrar Administrador de Empresa Existente
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Nome Completo *</label>
                    <input 
                      type="text" required value={newAdminNameInput} onChange={e => setNewAdminNameInput(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Usuário / Login * (Sem espaços)</label>
                    <input 
                      type="text" required value={newAdminUsernameInput} onChange={e => setNewAdminUsernameInput(e.target.value)}
                      placeholder="Ex: joao_admin"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">E-mail *</label>
                    <input 
                      type="email" required value={newAdminEmailState} onChange={e => setNewAdminEmailState(e.target.value)}
                      placeholder="Ex: joao@loja.com"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1">Senha de Entrada *</label>
                    <input 
                      type="text" required value={newAdminPasswordState} onChange={e => setNewAdminPasswordState(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Empresa / Oficina Associada *</label>
                  <select
                    required
                    value={newAdminAssistenciaId}
                    onChange={e => setNewAdminAssistenciaId(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-bold rounded-xl uppercase"
                  >
                    <option value="">Selecione uma Empresa Cadastrada...</option>
                    {assistencias.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.city} - {a.state})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-dashed border-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-300 hover:bg-neutral-100 p-3 font-bold uppercase cursor-pointer text-neutral-700 dark:text-neutral-300 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-3 font-black uppercase tracking-widest hover:bg-neutral-800 cursor-pointer rounded-xl flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Concluir & Vincular Administrador
                  </button>
                </div>
              </form>
            )}

            <div className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-x-auto rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 uppercase font-black leading-none text-[10px]">
                    <th className="p-3 border-r border-neutral-700 sticky left-0 z-20 bg-neutral-900 dark:bg-neutral-100">NOME / EMPRESA</th>
                    <th className="p-3 border-r border-neutral-700">E-mail de Acesso</th>
                    <th className="p-3 border-r border-neutral-700 whitespace-nowrap">WhatsApp</th>
                    <th className="p-3 border-r border-neutral-700">Senha Acesso</th>
                    <th className="p-3 border-r border-neutral-700 text-center">Permissão</th>
                    <th className="p-3 text-center">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 font-bold">
                  {searchedUsuarios.map(u => {
                    const ast = assistencias.find(a => a.id === u.assistenciaId);
                    return (
                      <tr key={u.id} className="group hover:bg-neutral-100 dark:hover:bg-neutral-700 bg-white dark:bg-neutral-800">
                        <td className="p-3 font-black text-neutral-900 dark:text-neutral-100 border-r border-neutral-200 dark:border-neutral-700 uppercase sticky left-0 z-10 bg-white dark:bg-neutral-800 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-700">
                          {u.name}
                        </td>
                        <td className="p-3 border-r border-neutral-200 dark:border-neutral-700">
                          {u.email}
                        </td>
                        <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 font-mono font-bold whitespace-nowrap">
                          {u.phone ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-xs text-neutral-800 dark:text-neutral-200">{u.phone}</span>
                              <a 
                                href={`https://wa.me/${(u.phone.replace(/\D/g, '').length <= 11 && !u.phone.replace(/\D/g, '').startsWith('55')) ? '55' : ''}${u.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
                              >
                                📲 WhatsApp
                              </a>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 font-mono bg-neutral-100/30 text-neutral-900 dark:text-neutral-100 text-xs">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-yellow-600 dark:text-yellow-400 font-black tracking-wide text-xs">{u.password || 'Sem Senha'}</span>
                            <button
                              onClick={() => {
                                setPasswordEditingUser(u);
                                setNewAdminEmailInput(u.email || '');
                                setNewAdminPasswordInput(u.password || '');
                              }}
                              className="text-[9px] uppercase font-black bg-yellow-300 hover:bg-yellow-400 text-neutral-950 px-2 py-1.5 rounded-lg border border-yellow-400 transition-all cursor-pointer flex items-center gap-1 mt-1 shrink-0"
                            >
                              <KeyRound className="w-2.5 h-2.5" /> Editar Email/Senha
                            </button>
                          </div>
                        </td>
                        <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-2xl text-[9px] font-black uppercase ${
                            u.role === 'MASTER' ? 'bg-rose-500 text-white'
                            : u.role === 'ADMIN' ? 'bg-amber-300 text-neutral-900'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {u.role === 'MASTER' ? (
                            <span className="text-[9px] text-red-650 font-black">Protegido</span>
                          ) : (
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  title: "Confirmar Exclusão de Usuário",
                                  message: `Deseja realmente excluir permanentemente o usuário administrador "${u.name}"? Esta ação não poderá ser revertida.`,
                                  onConfirm: () => {
                                    onDeleteUser(u.id);
                                    triggerSuccessMsg('O usuário foi excluído do sistema.');
                                  }
                                });
                              }}
                              className="bg-neutral-100 hover:bg-rose-100 text-rose-600 p-2 text-xs rounded-xl border transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Password Changing Modal for Admin Users */}
        {passwordEditingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 border-4 border-yellow-300 rounded-3xl p-6 max-w-sm w-full space-y-4 animate-scaleUp text-neutral-900 dark:text-neutral-100">
              <div className="flex items-center gap-2 border-b-2 border-neutral-100 dark:border-neutral-800 pb-3">
                <KeyRound className="w-5 h-5 text-yellow-600 dark:text-yellow-400 stroke-[2.5]" />
                <h4 className="text-sm font-black uppercase tracking-tight">Editar Acesso do Admin</h4>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-neutral-400">Nome:</p>
                <p className="text-xs font-bold font-sans">{passwordEditingUser.name}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-neutral-400 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  placeholder="Introduza o novo e-mail"
                  value={newAdminEmailInput}
                  onChange={e => setNewAdminEmailInput(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-black font-mono text-neutral-950 dark:text-neutral-50 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-neutral-400 mb-1">Nova Senha *</label>
                <input
                  type="text"
                  placeholder="Introduza a nova senha"
                  value={newAdminPasswordInput}
                  onChange={e => setNewAdminPasswordInput(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 text-xs font-black font-mono text-neutral-950 dark:text-neutral-50 rounded-xl focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => { setPasswordEditingUser(null); setNewAdminEmailInput(''); setNewAdminPasswordInput(''); }}
                  className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newAdminEmailInput.trim()) {
                      triggerErrorMsg('O e-mail não pode estar em branco.');
                      return;
                    }
                    if (!newAdminPasswordInput.trim()) {
                      triggerErrorMsg('A senha não pode estar em branco.');
                      return;
                    }
                    if (newAdminPasswordInput.trim().length < 4) {
                      triggerErrorMsg('A senha deve conter no mínimo 4 caracteres.');
                      return;
                    }
                    const updatedUsr = {
                      ...passwordEditingUser,
                      email: newAdminEmailInput.trim(),
                      password: newAdminPasswordInput.trim()
                    };
                    onAddUser(updatedUsr);
                    triggerSuccessMsg(`Dados de acesso do administrador ${passwordEditingUser.name} alterados com sucesso!`);
                    setPasswordEditingUser(null);
                    setNewAdminEmailInput('');
                    setNewAdminPasswordInput('');
                  }}
                  className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Confirmar
                </button>
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
              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-xs">
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

      </main>

        {showConfigModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-black uppercase mb-4 text-neutral-900 dark:text-neutral-100">Configurações do Perfil</h2>
              <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Nome"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl py-2 px-3 text-sm"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={configEmail}
                  onChange={(e) => setConfigEmail(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl py-2 px-3 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={configPhone}
                  onChange={(e) => setConfigPhone(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl py-2 px-3 text-sm"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={configPassword}
                  onChange={(e) => setConfigPassword(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl py-2 px-3 text-sm"
                />
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 px-4 py-2 text-xs font-bold uppercase rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Footer copyright */}
      <footer className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 py-6 mt-16 text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>👑 Clemente Master Control System © 2026</span>
          <span className="font-mono bg-neutral-100 dark:bg-neutral-950 px-3 py-1 rounded-md border text-[9px]">DEV SECURE MODE</span>
        </div>
      </footer>

    </div>
  );
}
