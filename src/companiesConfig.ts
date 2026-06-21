import { AssistenciaTecnica, AppUser } from './types';

/**
 * 🛠️ CONFIGURAÇÃO DE ASSISTÊNCIAS E ADMINS VIA CÓDIGO
 * 
 * Seus administradores de empresas (não o admin Master) podem ser definidos aqui!
 * Qualquer alteração neste arquivo refletirá no sistema de login e será
 * sincronizada com o Firebase.
 * 
 * Edite os dados abaixo livremente para ajustar usuários, senhas e empresas.
 */

export const PRECONFIG_COMPANIES: AssistenciaTecnica[] = [
  {
    id: 'ast-exemplo-suporte',
    name: 'Assistência Exemplo Sp',
    phone: '(11) 98888-7777',
    email: 'suporte@exemplosp.com.br',
    address: 'Avenida Paulista, 1500',
    city: 'São Paulo',
    state: 'SP',
    cnpj: '12.345.678/0001-90',
    zipCode: '01311-200',
    logoUrl: '',
    expiresAt: '2027-12-31T23:59:59.000Z',
    active: true
  }
];

export const PRECONFIG_COMPANY_USERS: AppUser[] = [
  {
    id: 'usr-admin-exemplo-suporte',
    name: 'Gerência Exemplo SP',
    username: 'gerentesp',
    email: 'gerente@exemplosp.com.br',
    password: 'senha123', // Edite a senha aqui ou crie novos usuários!
    role: 'ADMIN',
    assistenciaId: 'ast-exemplo-suporte',
    active: true
  }
];
