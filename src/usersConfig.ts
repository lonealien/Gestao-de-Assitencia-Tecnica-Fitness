import { AppUser } from './types';

/**
 * =========================================================================
 * CADASTRO MANUAL DE USUÁRIOS (SGFIT)
 * =========================================================================
 * 
 * Você pode gerenciar, desativar, alterar senhas ou cadastrar novos 
 * usuários de forma MANUAL editando a lista 'MANUAL_USERS' abaixo!
 * 
 * Qualquer alteração salva neste arquivo entra em vigor instantaneamente
 * e terá prioridade máxima sobre cadastros feitos pela interface web.
 * 
 * -------------------------------------------------------------------------
 * CONFIGURAÇÃO DOS ATRIBUTOS:
 * -------------------------------------------------------------------------
 * - id: Identificador único de texto livre (ex: "usr-meu-tecnico").
 * - name: Nome completo do usuário ou departamento.
 * - email: E-mail de acesso (será o login de acesso do usuário).
 * - password: Senha de acesso livre (texto puro).
 * - role: Nível de permissão técnica. Opções válidas:
 *         'ADMIN'               => Administrador Geral (Lojista) com acesso total.
 *         'ASSISTENCIA_GERENTE' => Diretor de uma Oficina específica. Requer 'assistenciaId'.
 *         'TECNICO'             => Mecânico escalado para campo. Requer 'tecnicoId'.
 *         'ATENDENTE'           => Atendente de suporte / recepção (gera chamados e OS).
 * - assistenciaId: Define qual oficina este gerente controla (Ex: "ast-1", "ast-2", etc).
 * - tecnicoId: Vincula o usuário ao cadastro de técnico para receber Ordens (Ex: "tec-1").
 */
export const MANUAL_USERS: AppUser[] = [
  // -------------------------------------------------------------------------
  // 1. ADMINISTRADORES DO SISTEMA (LOJISTAS)
  // -------------------------------------------------------------------------
  {
    id: 'usr-master-clemente',
    name: 'Clemente Master',
    username: 'clemente',
    email: 'clementebsf@gmail.com',
    password: 'clementebsf', 
    role: 'MASTER'
  }
];
