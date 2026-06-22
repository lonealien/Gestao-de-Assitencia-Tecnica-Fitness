export interface AssistenciaTecnica {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address: string;
  specialties?: string[];
  rating?: number;
  city: string;
  cnpj?: string;
  zipCode?: string;
  state?: string;
  logoUrl?: string;
  expiresAt?: string; // ISO date string representing trial or credit end date (access limit)
  active?: boolean;
}

export interface Tecnico {
  id: string;
  assistenciaId: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
}

export type OSStatus = 
  | 'Pendente' 
  | 'Aguardando Peça' 
  | 'Finalizada' 
  | 'Cancelada';

export type OSPriority = 'Baixa' | 'Média' | 'Alta';

export interface Part {
  name: string;
  quantity: number;
  value: number;
}

export interface OSHistory {
  date: string;
  status: OSStatus;
  description: string;
  author: string;
}

export interface OrdemServico {
  id: string;
  idFormatado: string;
  assistenciaId: string;
  tecnicoId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  clientZipCode?: string;
  clientCity?: string;
  clientState?: string;
  equipmentType: 'Esteira' | 'Bicicleta Ergométrica' | 'Elíptico' | 'Estação de Musculação' | 'Outro';
  equipmentBrand: string;
  equipmentModel: string;
  reportedIssue: string;
  technicalDiagnosis: string;
  clientDocument?: string;
  status: OSStatus;
  createdAt: string;
  scheduledVisitDate?: string;
  deliveryTargetDate?: string;
  completionDate?: string;
  totalCostValue: number;
  taxaDeslocamento: number;
  partsCostValue?: number;
  parts?: Part[];
  laborCostValue?: number;
  history: OSHistory[];
  sigTecnicoAbertura?: string;
  sigClienteAbertura?: string;
  sigAberturaData?: string;
  sigTecnicoFinal?: string;
  sigClienteFinal?: string;
  sigFinalData?: string;
  servicoRealizado?: string;
  observacoes?: string;
  fotosAntes?: string[];
  fotosDepois?: string[];
}

export interface StoreSettings {
  name: string;
  logoUrl?: string;
  cnpj?: string;
  address?: string;
  zipCode?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  email?: string;
}

export type UserRole = 'MASTER' | 'ADMIN' | 'TECNICO' | 'ASSISTENCIA_GERENTE' | 'ATENDENTE';

export interface ActiveUser {
  role: UserRole;
  assistenciaId?: string; // If ROLE is ASSISTENCIA_GERENTE
  tecnicoId?: string;     // If ROLE is TECNICO
  name: string;
  email?: string;
  isReadOnly?: boolean;   // If true, user can only view system data without modifications
}

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  assistenciaId?: string;
  tecnicoId?: string;
  isReadOnly?: boolean;   // If true, user can only view system data without modifications
  active?: boolean;
}
