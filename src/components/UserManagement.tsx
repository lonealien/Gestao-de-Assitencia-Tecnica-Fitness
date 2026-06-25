import React, { useState, useEffect } from 'react';
import { AppUser, AssistenciaTecnica, Tecnico, UserRole, StoreSettings } from '../types';
import { UserPlus, Shield, Hammer, Building2, Eye, KeyRound, Check, AlertCircle, X, Trash2, User, Ban, CheckCircle, Pencil, Download, Upload } from 'lucide-react';
import { getStoreDomain, maskPhone } from '../utils';
import { fetchBackupData, downloadBackup, BackupData } from '../backupService';

interface UserManagementProps {
  usuarios: AppUser[];
  assistencias: AssistenciaTecnica[];
  tecnicos: Tecnico[];
  currentUser: AppUser;
  onAddUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onToggleUserActive: (userId: string) => void;
  onAddTecnicoAndUser?: (newTecnico: Tecnico, userLogin: string, userPass: string) => void;
  onUpdateUser?: (user: AppUser) => void;
  onRestoreBackup?: (backup: any) => Promise<void>;
  storeSettings?: StoreSettings;
  onShowBlockedAlert?: (message: string) => void;
}

export default function UserManagement({
  usuarios,
  assistencias,
  tecnicos,
  currentUser,
  onAddUser,
  onDeleteUser,
  onToggleUserActive,
  onAddTecnicoAndUser,
  onUpdateUser,
  onRestoreBackup,
  storeSettings,
  onShowBlockedAlert
}: UserManagementProps) {
  const [activeForm, setActiveForm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('TECNICO');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  
  // Dynamic links
  const [selectedAstId, setSelectedAstId] = useState(assistencias?.[0]?.id || '');
  const [selectedTecId, setSelectedTecId] = useState('');
  
  // Custom option to create a new Tecnico *and* its user at the same time for Oficinas!
  const [createTecOnTheFly, setCreateTecOnTheFly] = useState(true);
  const [tecPhone, setTecPhone] = useState('');

  const [minimizedUsers, setMinimizedUsers] = useState<Set<string>>(new Set());
  
  const toggleMinimize = (userId: string) => {
    const next = new Set(minimizedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setMinimizedUsers(next);
  };

  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleManualBackup = async () => {
    if (!currentUser.assistenciaId) return;
    setBackupStatus('loading');
    try {
      const data = await fetchBackupData(currentUser.assistenciaId);
      if (data) {
        downloadBackup(data);
        setSuccessMsg('Backup realizado com sucesso!');
      }
    } catch (err) {
      setErrorMsg('Erro ao gerar backup.');
    } finally {
      setBackupStatus('idle');
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreBackup) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup.type !== 'assistencia_backup') {
          setErrorMsg('Arquivo de backup inválido.');
          return;
        }
        
        if (currentUser.assistenciaId && backup.assistencia.id !== currentUser.assistenciaId) {
          setErrorMsg('Este backup pertence a outra assistência e não pode ser restaurado aqui.');
          return;
        }

        if (window.confirm('Deseja restaurar este backup? Dados atuais podem ser sobrescritos.')) {
          await onRestoreBackup(backup);
          setSuccessMsg('Backup restaurado com sucesso!');
        }
      } catch (err) {
        setErrorMsg('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    setMinimizedUsers(new Set(usuarios.map(u => u.id)));
  }, [usuarios]);

  // Inline editing states for admin
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('TECNICO');
  const [editIsReadOnly, setEditIsReadOnly] = useState<boolean>(false);
  const [editAssistenciaId, setEditAssistenciaId] = useState<string>('');
  const [editTecnicoId, setEditTecnicoId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');

  const handleSaveEdit = (u: AppUser) => {
    setSuccessMsg('');
    setErrorMsg('');

    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    const emailLower = editEmail.trim().toLowerCase();
    const emailExists = usuarios.some(user => user.email.toLowerCase() === emailLower && user.id !== u.id);
    if (emailExists) {
      setErrorMsg('Este e-mail de acesso já está cadastrado para outro usuário.');
      return;
    }

    // Limit administrators secondary check (up to 2 secondary admins)
    if (editRole === 'ADMIN' && u.role !== 'ADMIN') {
      const secondaryAdminsCount = usuarios.filter(user => user.role === 'ADMIN').length;
      if (secondaryAdminsCount >= 2) {
        setErrorMsg('Erro: Limite atingido! O sistema permite apenas até em 2 administradores secundários além do principal.');
        return;
      }
    }

    const updatedUser: AppUser = {
      ...u,
      name: editName.trim(),
      email: emailLower,
      password: editPassword.trim(),
      role: editRole,
      isReadOnly: editIsReadOnly,
      phone: editPhone.trim(),
      assistenciaId: (editRole === 'TECNICO' || editRole === 'ATENDENTE' || editRole === 'ASSISTENCIA_GERENTE') ? (editAssistenciaId || u.assistenciaId || undefined) : undefined,
      tecnicoId: editRole === 'TECNICO' ? (editTecnicoId || u.tecnicoId || undefined) : undefined,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
      setSuccessMsg(`O usuário "${editName.trim()}" foi atualizado com sucesso!`);
      setEditingUserId(null);
    } else {
      setErrorMsg('Erro: Função de atualização não configurada no aplicativo.');
    }
  };

  const canRegisterAdmin = currentUser.role === 'ADMIN' && !currentUser.assistenciaId;
  const canRegisterAstGerente = currentUser.role === 'ADMIN' && !currentUser.assistenciaId;
  
  // If current user is ASSISTENCIA_GERENTE or company admin, they can only register technicians/attendants for their own office.
  React.useEffect(() => {
    if (currentUser.role === 'ASSISTENCIA_GERENTE' || (currentUser.role === 'ADMIN' && currentUser.assistenciaId)) {
      setSelectedRole('TECNICO');
      setSelectedAstId(currentUser.assistenciaId || '');
    }
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }
    
    // Validation
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s]+$/;
    if (!nameRegex.test(name.trim())) {
      setErrorMsg('O nome do usuário deve conter apenas letras e números.');
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const emailExists = usuarios.some(u => u.email.toLowerCase() === emailLower);
    if (emailExists) {
      setErrorMsg('Este e-mail de acesso já está cadastrado.');
      return;
    }

    if (tecPhone && !/^\d+$/.test(tecPhone.replace(/\D/g, ''))) {
      setErrorMsg('O telefone deve conter apenas números.');
      return;
    }
    
    const usernameTrimmed = emailLower;

    // Limit administrators secondary check (up to 2 secondary admins)
    if (selectedRole === 'ADMIN') {
      const secondaryAdminsCount = usuarios.filter(u => u.role === 'ADMIN').length;
      if (secondaryAdminsCount >= 2) {
        setErrorMsg('Erro: Limite atingido! O sistema permite apenas até em 2 administradores secundários além do principal.');
        return;
      }
    }

    // Creating user based on selected configurations
    if (selectedRole === 'TECNICO' && createTecOnTheFly && currentUser.role === 'ASSISTENCIA_GERENTE') {
      // Create technical record first
      const newTecId = 'tec-' + Date.now();
      const newTecnico: Tecnico = {
        id: newTecId,
        assistenciaId: currentUser.assistenciaId || '',
        name: name.trim(),
        phone: tecPhone.trim() || '(21) 99999-9999',
        email: emailLower,
        active: true
      };

      if (onAddTecnicoAndUser) {
        onAddTecnicoAndUser(newTecnico, usernameTrimmed, password);
      } else {
        // Fallback
        const newUser: AppUser = {
          id: 'usr-' + Date.now(),
          name: name.trim(),
          username: usernameTrimmed,
          email: emailLower || `${usernameTrimmed}@gestaoservico.com`,
          password: password,
          phone: tecPhone.trim(),
          role: 'TECNICO',
          tecnicoId: newTecId,
          assistenciaId: currentUser.assistenciaId
        };
        onAddUser(newUser);
      }
    } else {
      // General user record creation
      const newUserId = 'usr-' + Date.now();
      const newUser: AppUser = {
        id: newUserId,
        name: name.trim(),
        username: usernameTrimmed,
        email: emailLower || `${usernameTrimmed}@gestaoservico.com`,
        password: password,
        phone: tecPhone.trim(),
        role: selectedRole,
        assistenciaId: (selectedRole === 'TECNICO' || selectedRole === 'ATENDENTE' || selectedRole === 'ASSISTENCIA_GERENTE') ? (selectedAstId || currentUser.assistenciaId) : undefined,
        tecnicoId: selectedRole === 'TECNICO' ? (selectedTecId || newUserId) : undefined,
        isReadOnly: isReadOnly,
        active: true
      };

      onAddUser(newUser);
    }

    setSuccessMsg('Usuário cadastrado com sucesso!');
    // Reset Form
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setTecPhone('');
    setIsReadOnly(false);
    setActiveForm(false);
  };

  // Filter users lists to keep it safe & compliant
  // ADMIN without assistenciaId (global admin) sees all users. ADMIN with assistenciaId (company admin) and ASSISTENCIA_GERENTE see only users in their assistencia.
  const filteredUsers = usuarios.filter(u => {
    if (u.role === 'MASTER') return false; // Filter out Master accounts for anyone else!
    if (currentUser.role === 'ADMIN' && !currentUser.assistenciaId) return true;
    if (currentUser.role === 'ASSISTENCIA_GERENTE' || (currentUser.role === 'ADMIN' && currentUser.assistenciaId)) {
      return u.assistenciaId === currentUser.assistenciaId;
    }
    return u.id === currentUser.id; // Tecnico sees only himself
  }).sort((a, b) => {
    // Sort: active users (active=true or undefined -> active=true) come first
    const activeA = a.active !== false;
    const activeB = b.active !== false;
    if (activeA === activeB) return 0;
    return activeA ? -1 : 1;
  });

  return (
    <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none p-6 space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-4 gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
            Gerenciamento de Acessos & Usuários
          </h3>

        </div>

        {currentUser.role !== 'TECNICO' && (
          <button
            onClick={() => {
              if (currentUser.isReadOnly) {
                onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                return;
              }
              setActiveForm(!activeForm);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 text-xs font-black uppercase tracking-widest px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md  transition-all flex items-center gap-2 cursor-pointer self-start"
          >
            {activeForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {activeForm ? 'Cancelar Cadastro' : 'Cadastrar Usuário'}
          </button>
        )}
      </div>


      {successMsg && (
        <div className="bg-emerald-200 border border-neutral-200 dark:border-neutral-700 p-3 text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide flex items-center gap-2">
          <Check className="w-4 h-4 stroke-[3]" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-100 border border-neutral-200 dark:border-neutral-700 p-3 text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /> {errorMsg}
        </div>
      )}

      {/* Backup and Security Section */}
      {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTENCIA_GERENTE') && (
        <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Backup e Segurança dos Dados
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-800 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Exportar Dados</p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Baixe uma cópia completa de todas as suas ordens, técnicos e usuários.</p>
              <button
                onClick={handleManualBackup}
                disabled={backupStatus === 'loading'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {backupStatus === 'loading' ? 'Gerando...' : <><Download className="w-3.5 h-3.5" /> Fazer Backup Agora</>}
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Restaurar Dados</p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Importe um arquivo de backup (.json) para recuperar informações.</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <button
                onClick={handleRestoreClick}
                className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Carregar Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert User Accordion Form */}
      {activeForm && (
        <form onSubmit={handleSubmit} className="bg-yellow-50 dark:bg-yellow-900/40 border border-neutral-200 dark:border-neutral-700 p-5 space-y-4 animate-fadeIn">
          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
            📌 Preencha as credenciais de acesso
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="user-name-input" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                Nome (Pessoa) *
              </label>
              <input
                id="user-name-input"
                type="text"
                required
                placeholder="Ex: Roberto Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="user-email-input" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                E-mail *
              </label>
              <input
                id="user-email-input"
                type="email"
                required
                placeholder={`roberto@${getStoreDomain(storeSettings?.name)}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>

            <div>
              <label htmlFor="user-pass-input" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                Senha de Entrada *
              </label>
              <input
                id="user-pass-input"
                type="text"
                required
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTENCIA_GERENTE') ? (
              <div>
                <label htmlFor="user-role-input" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                  Nível de Permissão (Role) *
                </label>
                <select
                  id="user-role-input"
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as any);
                    if (e.target.value !== 'ATENDENTE') setIsReadOnly(false);
                  }}
                  className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
                >
                  <option value="TECNICO">TÉCNICO / MECÂNICO</option>
                  <option value="ATENDENTE">ATENDENTE (Recepção / Suporte)</option>
                  {currentUser.role === 'ADMIN' && !currentUser.assistenciaId && (
                    <option value="ADMIN">ADMIN (Restrito - Máximo 2)</option>
                  )}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                  Nível de Permissão
                </label>
                <div className="w-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 p-2 text-xs font-black uppercase text-neutral-600">
                  🔧 TÉCNICO (Cadastro Restrito à sua Oficina)
                </div>
              </div>
            )}

            {/* Context links based on chosen role */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="link-tec-phone" className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="link-tec-phone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={tecPhone}
                  onChange={(e) => setTecPhone(maskPhone(e.target.value))}
                  className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="user-readonly-checkbox"
                  type="checkbox"
                  checked={isReadOnly}
                  onChange={(e) => setIsReadOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="user-readonly-checkbox" className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 cursor-pointer">
                  Modo Somente Leitura
                </label>
              </div>
            </div>
          </div>

          {/* Conditional Dropdowns based on Role (For ADMIN or general linking) */}
          {(selectedRole === 'TECNICO' || selectedRole === 'ATENDENTE' || selectedRole === 'ASSISTENCIA_GERENTE') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentUser.role === 'ADMIN' && !currentUser.assistenciaId && (
                <div>
                  <label htmlFor="user-office-select" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                    Vincular à Oficina / Empresa *
                  </label>
                  <select
                    id="user-office-select"
                    required
                    value={selectedAstId}
                    onChange={(e) => {
                      setSelectedAstId(e.target.value);
                      setSelectedTecId('');
                    }}
                    className="w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="">Selecione uma oficina...</option>
                    {assistencias.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        {ast.name} ({ast.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedRole === 'TECNICO' && (
                <div>
                  <label htmlFor="user-tec-link-select" className="block text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 mb-1">
                    Vincular a qual Técnico?
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="user-tec-link-select"
                      value={selectedTecId}
                      onChange={(e) => {
                        setSelectedTecId(e.target.value);
                        setCreateTecOnTheFly(e.target.value === '');
                      }}
                      className="flex-1 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                    >
                      <option value="">+ Criar novo técnico com este nome</option>
                      {tecnicos.filter(t => t.assistenciaId === (selectedAstId || currentUser.assistenciaId)).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 italic">
                    {selectedTecId ? "✓ O usuário terá acesso aos dados deste técnico." : "💡 Um novo registro de técnico será criado automaticamente."}
                  </p>
                </div>
              )}


            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-dashed border-black pt-3">
            <button
              type="button"
              onClick={() => setActiveForm(false)}
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-4 py-2 font-bold text-xs uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-900"
            >
              Salvar Usuário
            </button>
          </div>
        </form>
      )}

      {/* Users Accounts List */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          👤 Usuários Ativos no Sistema ({filteredUsers.length} registros)
        </h4>

        <div className="border border-neutral-200 dark:border-neutral-700 overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse min-w-[600px] text-xs">
            <thead>
              <tr className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 uppercase font-black tracking-wider text-[10px]">
                <th className="p-3 border-r border-neutral-700 sticky left-0 z-20 bg-neutral-900 dark:bg-neutral-100">Nome (Pessoa)</th>
                <th className="p-3 border-r border-neutral-700">E-mail de Acesso</th>
                <th className="p-3 border-r border-neutral-700 whitespace-nowrap">WhatsApp</th>
                <th className="p-3 border-r border-neutral-700">Senha Acesso</th>
                <th className="p-3 border-r border-neutral-700 text-center text-[10px]">Permissão</th>
                <th className="p-3 border-r border-neutral-700">Responsável Vinculado</th>
                <th className="p-3 text-center">{currentUser.role === 'ADMIN' ? 'Ações' : 'Remover'}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black text-neutral-900 dark:text-neutral-100 font-bold">
              {filteredUsers.map((u, i) => {
                const linkedAst = assistencias.find(a => a.id === u.assistenciaId);
                const linkedTec = tecnicos.find(t => t.id === u.tecnicoId);
                const isEditing = editingUserId === u.id;

                return (
                  <tr key={u.id} className={`group ${i % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50'} hover:bg-neutral-100 dark:hover:bg-neutral-700 ${isEditing ? 'bg-amber-50 dark:bg-amber-900/30 border-y-2 border-black' : ''}`}>
                    <td className={`p-3 border-r border-neutral-200 dark:border-neutral-700 font-black uppercase text-neutral-900 dark:text-neutral-100 sticky left-0 z-10 ${isEditing ? 'bg-amber-50 dark:bg-amber-900' : (i % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800')} group-hover:bg-neutral-100 dark:group-hover:bg-neutral-700`}>
                      {isEditing && currentUser.role === 'ADMIN' ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold p-1 w-full focus:outline-none uppercase"
                          placeholder="Nome"
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 font-mono font-bold text-neutral-600">
                      {isEditing && currentUser.role === 'ADMIN' ? (
                        <div className="space-y-1">
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold p-1 w-full focus:outline-none font-mono"
                            placeholder="E-mail"
                          />
                          {!u.active && (
                             <span className="block text-[8px] font-black uppercase text-rose-600 bg-rose-100 max-w-max px-1">Inativo</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="block text-neutral-900 dark:text-neutral-100 font-black text-xs mb-0.5">{u.email}</span>
                          {!u.active && (
                             <span className="block text-[8px] font-black uppercase text-rose-600 bg-rose-100 mt-1 max-w-max px-1">Inativo</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 font-mono font-bold whitespace-nowrap">
                      {isEditing && currentUser.role === 'ADMIN' ? (
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(maskPhone(e.target.value))}
                          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold p-1 w-full focus:outline-none font-mono"
                          placeholder="WhatsApp"
                        />
                      ) : (
                        u.phone ? (
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
                        )
                      )}
                    </td>
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 font-mono text-neutral-900 bg-neutral-100/50">
                      {isEditing && currentUser.role === 'ADMIN' ? (
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold p-1 w-full focus:outline-none font-mono"
                          placeholder="Senha"
                        />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          {u.password || '—'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 text-center min-w-[170px]">
                      {isEditing ? (
                        <div className="space-y-2 text-left">
                          <label className="block text-[9px] font-black uppercase text-neutral-600">Nível de Permissão</label>
                          <select
                            value={editRole}
                            onChange={(e) => {
                              const r = e.target.value as UserRole;
                              setEditRole(r);
                            }}
                            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-black uppercase p-1 w-full focus:outline-none"
                          >
                            <option value="TECNICO">TÉCNICO / MECÂNICO</option>
                            <option value="ATENDENTE">ATENDENTE</option>
                            {currentUser.role === 'ADMIN' && !currentUser.assistenciaId && (
                              <>
                                <option value="ASSISTENCIA_GERENTE">GERENTE DE ASSISTÊNCIA</option>
                                <option value="ADMIN">ADMIN</option>
                              </>
                            )}
                          </select>
                          
                          <div className="flex items-center gap-2 mt-2">
                             <input
                               id={`edit-readonly-${u.id}`}
                               type="checkbox"
                               checked={editIsReadOnly}
                               onChange={(e) => setEditIsReadOnly(e.target.checked)}
                               className="w-4 h-4 rounded border-neutral-300 text-neutral-900"
                             />
                             <label htmlFor={`edit-readonly-${u.id}`} className="text-[10px] font-black uppercase text-neutral-600 cursor-pointer">Somente Leitura</label>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-[9px] font-black uppercase ${
                            u.role === 'ADMIN' ? 'bg-rose-200 text-neutral-900 dark:text-neutral-100'
                            : u.role === 'ASSISTENCIA_GERENTE' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-neutral-900 dark:text-neutral-100' 
                            : u.role === 'ATENDENTE' ? 'bg-blue-200 text-neutral-900 dark:text-neutral-100'
                            : u.role === 'MASTER' ? 'bg-amber-300 dark:bg-amber-400 text-neutral-900'
                            : 'bg-emerald-200 text-neutral-900 dark:text-neutral-100'
                          }`}>
                            {(u.role === 'ADMIN' || u.role === 'MASTER') && <Shield className="w-3 h-3" />}
                            {u.role === 'ASSISTENCIA_GERENTE' && <Building2 className="w-3 h-3" />}
                            {u.role === 'TECNICO' && <Hammer className="w-3 h-3" />}
                            {u.role === 'ATENDENTE' && <User className="w-3 h-3" />}
                            {u.role === 'MASTER' ? 'ADMIN MASTER' : u.role}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-700 min-w-[200px]">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          {(editRole === 'TECNICO' || editRole === 'ATENDENTE' || editRole === 'ASSISTENCIA_GERENTE') && currentUser.role === 'ADMIN' && !currentUser.assistenciaId && (
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase text-neutral-600">Oficina / Empresa *</label>
                              <select
                                value={editAssistenciaId}
                                onChange={(e) => {
                                  setEditAssistenciaId(e.target.value);
                                  if (editRole !== 'TECNICO') {
                                    setEditTecnicoId('');
                                  }
                                }}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold p-1 w-full focus:outline-none"
                              >
                                <option value="">Selecione a oficina...</option>
                                {assistencias.map(a => (
                                  <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {editRole === 'TECNICO' && (
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase text-neutral-600">Mecânico Associado</label>
                              <select
                                value={editTecnicoId}
                                onChange={(e) => setEditTecnicoId(e.target.value)}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold p-1 w-full focus:outline-none"
                              >
                                <option value="">Nenhum mestre técnico...</option>
                                {tecnicos
                                  .filter(t => !editAssistenciaId || t.assistenciaId === editAssistenciaId)
                                  .map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {editRole !== 'TECNICO' && editRole !== 'ATENDENTE' && editRole !== 'ASSISTENCIA_GERENTE' && (
                            <span className="text-neutral-400 italic text-[10px]">Acesso Geral (Sem oficina vinculada)</span>
                          )}
                        </div>
                      ) : (
                        <>
                          {linkedAst && (
                            <p className="font-bold text-neutral-800 dark:text-neutral-200 uppercase text-[10px]">
                              🏢 {linkedAst.name}
                            </p>
                          )}
                          {linkedTec && (
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[9px]">
                              🔧 Mecânico: {linkedTec.name}
                            </p>
                          )}
                          {!linkedAst && !linkedTec && (
                            <span className="text-neutral-400 italic text-[10px]">Lojista Geral</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(u)}
                            className="bg-emerald-400 text-neutral-900 dark:text-neutral-100 hover:bg-emerald-50 dark:bg-emerald-900/300 p-1 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md  transition-all cursor-pointer"
                            title="Confirmar Alterações de Permissão"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="bg-neutral-200 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-300 p-1 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md  transition-all cursor-pointer"
                            title="Cancelar Edição"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {u.id === currentUser.id ? (
                            <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider">Logado</span>
                          ) : u.email === 'admin@lonnetech.com' ? (
                            <span className="text-[10px] text-amber-600 uppercase font-black tracking-wider">Principal (Bloqueado)</span>
                          ) : (
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-1.5">
                              {currentUser.role === 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (currentUser.isReadOnly) {
                                      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                                      return;
                                    }
                                    setEditingUserId(u.id);
                                    setEditName(u.name);
                                    setEditEmail(u.email);
                                    setEditPhone(u.phone || '');
                                    setEditPassword(u.password || '');
                                    setEditRole(u.role);
                                    setEditIsReadOnly(u.isReadOnly || false);
                                    setEditAssistenciaId(u.assistenciaId || '');
                                    setEditTecnicoId(u.tecnicoId || '');
                                  }}
                                  className="bg-amber-400 dark:bg-amber-500 hover:bg-amber-500 dark:hover:bg-amber-600 text-neutral-900 text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded-2xl transition-all cursor-pointer flex items-center gap-1 shadow-sm hover:shadow-md"
                                  title="Editar Usuário"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </button>
                              )}
                              {currentUser.role === 'ASSISTENCIA_GERENTE' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (currentUser.isReadOnly) {
                                      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                                      return;
                                    }
                                    setEditingUserId(u.id);
                                    setEditName(u.name);
                                    setEditEmail(u.email);
                                    setEditPhone(u.phone || '');
                                    setEditPassword(u.password || '');
                                    setEditRole(u.role);
                                    setEditIsReadOnly(u.isReadOnly || false);
                                    setEditAssistenciaId(u.assistenciaId || '');
                                    setEditTecnicoId(u.tecnicoId || '');
                                  }}
                                  className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-yellow-300 text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded-2xl transition-all cursor-pointer flex items-center gap-1 shadow-sm dark:shadow-none hover:shadow-md "
                                  title="Editar Permissões do Usuário"
                                >
                                  <Shield className="w-3 h-3" />
                                  Permissão
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser.isReadOnly) {
                                    onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                                    return;
                                  }
                                  onToggleUserActive(u.id);
                                }}
                                className={`p-1.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl transition-colors cursor-pointer ${u.active !== false ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 hover:bg-emerald-200' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                                title={u.active !== false ? "Desativar Conta" : "Ativar Conta"}
                              >
                                {u.active !== false ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              </button>

                              {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTENCIA_GERENTE') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (currentUser.isReadOnly) {
                                      onShowBlockedAlert && onShowBlockedAlert("Acesso restrito: O painel está em modo leitura ou a assinatura está expirada.");
                                      return;
                                    }
                                    setDeleteConfirm({
                                      title: "Confirmar Exclusão de Usuário",
                                      message: `Deseja realmente excluir permanentemente o usuário "${u.name}"? Esta ação não pode ser desfeita.`,
                                      onConfirm: () => {
                                        onDeleteUser(u.id);
                                      }
                                    });
                                  }}
                                  className="bg-neutral-100 text-red-600 hover:bg-neutral-200 p-1.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl transition-colors cursor-pointer"
                                  title="Excluir Permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Grid */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredUsers.map((u) => {
            const linkedAst = assistencias.find(a => a.id === u.assistenciaId);
            const linkedTec = tecnicos.find(t => t.id === u.tecnicoId);
            
            return (
              <div key={u.id} className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleMinimize(u.id)}>
                  <div>
                    <h5 className="font-black uppercase text-neutral-900 dark:text-neutral-100 text-sm flex items-center gap-2">
                       {minimizedUsers.has(u.id) ? '▶' : '▼'} {u.name}
                    </h5>
                    <p className="font-mono text-[10px] text-neutral-500">{u.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-[9px] font-black uppercase ${
                    u.role === 'ADMIN' ? 'bg-amber-300 text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {u.role}
                  </span>
                </div>
                
                {!minimizedUsers.has(u.id) && (
                  <>
                    {u.phone && (
                      <div className="mt-1">
                        <a 
                          href={`https://wa.me/${(u.phone.replace(/\D/g, '').length <= 11 && !u.phone.replace(/\D/g, '').startsWith('55')) ? '55' : ''}${u.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
                        >
                          📲 WhatsApp ({u.phone})
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-xl text-[10px] font-mono border border-neutral-100 dark:border-neutral-800">
                      <Eye className="w-3 h-3 text-neutral-400" />
                      <span className="text-neutral-900 dark:text-neutral-100">{u.password}</span>
                      {!u.active && (
                        <span className="ml-auto text-[8px] font-black uppercase text-rose-600 bg-rose-100 px-1 rounded-sm">Inativo</span>
                      )}
                    </div>

                    {/* Edit Form Area */}
                    {editingUserId === u.id ? (
                      <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl border border-amber-200 dark:border-amber-700 space-y-2 mt-2">
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-xs p-1 border rounded" placeholder="Nome" />
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full text-xs p-1 border rounded" placeholder="E-mail" />
                        <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full text-xs p-1 border rounded" placeholder="Senha" />
                        <div className="flex gap-2">
                          <button className="bg-emerald-500 text-white px-2 py-1 text-xs rounded" onClick={() => handleSaveEdit(u)}>Salvar</button>
                          <button className="bg-neutral-300 px-2 py-1 text-xs rounded" onClick={() => setEditingUserId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(linkedAst || linkedTec) && (
                          <div className="text-[10px] space-y-1">
                            {linkedAst && <p className="text-neutral-500 uppercase font-black tracking-tight flex items-center gap-1"><Building2 className="w-3 h-3" /> {linkedAst.name}</p>}
                            {linkedTec && <p className="text-neutral-500 uppercase font-black tracking-tight flex items-center gap-1"><Hammer className="w-3 h-3" /> {linkedTec.name}</p>}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                          {/* EDIT BUTTON */}
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTENCIA_GERENTE') && (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditName(u.name);
                                setEditEmail(u.email);
                                setEditPassword(u.password || '');
                                setEditRole(u.role);
                                setEditPhone(u.phone || '');
                              }}
                              className="p-2 bg-amber-100 text-amber-700 rounded-xl"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          
                          {(currentUser.role === 'ADMIN' || currentUser.role === 'ASSISTENCIA_GERENTE') && (
                            <button
                              onClick={() => onToggleUserActive(u.id)}
                              className={`p-2 ${u.active ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400' : 'bg-rose-100 text-rose-600'} rounded-xl transition-colors`}
                            >
                              {u.active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                title: "Confirmar Exclusão de Usuário",
                                message: `Deseja realmente excluir permanentemente o usuário "${u.name}"?\n\nDigite a senha para confirmar:`,
                                onConfirm: () => {
                                  const password = prompt("Digite a senha do admin:");
                                  if (password === "0000") {
                                    onDeleteUser(u.id);
                                  } else if (password !== null) {
                                    alert("Senha incorreta.");
                                  }
                                }
                              });
                            }}
                            disabled={u.role === 'MASTER'}
                            className="p-2 bg-rose-100 text-rose-600 rounded-xl disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 animate-pulse" />
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

    </div>
  );
}
