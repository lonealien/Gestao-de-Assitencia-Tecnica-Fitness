import React, { useState, useEffect } from 'react';
import { AssistenciaTecnica, Tecnico, OrdemServico, OSPriority, Part, AppUser } from '../types';
import { X, ClipboardList, PenTool, User, Phone, MapPin, DollarSign, Calendar, Plus, Trash2 } from 'lucide-react';
import { maskPhone, maskDocument, maskCEP } from '../utils';

interface OrdemServicoFormProps {
  assistencias: AssistenciaTecnica[];
  usuarios: AppUser[];
  onAdd: (os: OrdemServico) => void;
  onCancel: () => void;
  defaultAssistenciaId?: string;
}

export default function OrdemServicoForm({
  assistencias,
  usuarios,
  onAdd,
  onCancel,
  defaultAssistenciaId
}: OrdemServicoFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [address, setAddress] = useState('');
  const [clientZipCode, setClientZipCode] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [equipmentType, setEquipmentType] = useState<OrdemServico['equipmentType']>('Esteira');
  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');
  const [assistenciaId, setAssistenciaId] = useState(defaultAssistenciaId || assistencias[0]?.id || '');
  const [tecnicoId, setTecnicoId] = useState<string>('');
  const [scheduledVisitDate, setScheduledVisitDate] = useState('');
  
  const [parts, setParts] = useState<Part[]>([]);
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partValue, setPartValue] = useState(0);

  const [totalCostValue, setTotalCostValue] = useState<number>(0);
  const [taxaDeslocamento, setTaxaDeslocamento] = useState<number>(0);
  const [laborCostValue, setLaborCostValue] = useState<number>(0);

  const filteredTecnicos = usuarios.filter(u => u.role === 'TECNICO');

  useEffect(() => {
    const isStillValid = filteredTecnicos.some(u => u.tecnicoId === tecnicoId);
    if (!isStillValid) {
      setTecnicoId('');
    }
  }, [assistenciaId, filteredTecnicos, tecnicoId]);

  useEffect(() => {
    const partsSum = parts.reduce((acc, part) => acc + (part.value * part.quantity), 0);
    const labor = Number(laborCostValue) || 0;
    const deslocamento = Number(taxaDeslocamento) || 0;
    setTotalCostValue(partsSum + labor + deslocamento);
  }, [parts, laborCostValue, taxaDeslocamento]);

  const addPart = () => {
    if (!partName || partQuantity <= 0 || partValue < 0) return;
    setParts([...parts, { name: partName, quantity: partQuantity, value: partValue }]);
    setPartName('');
    setPartQuantity(1);
    setPartValue(0);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress(data.logradouro + (data.bairro ? ` - ${data.bairro}` : ''));
        setClientCity(data.localidade);
        setClientState(data.uf);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskCEP(e.target.value);
    setClientZipCode(value);
    if (value.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !address || !equipmentBrand || !equipmentModel || !reportedIssue) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const customIdNum = Math.floor(1000 + Math.random() * 9000); // Ex: OS-3849
    const formattedDate = new Date().toISOString();

    const partsCostTotal = parts.reduce((acc, part) => acc + (part.value * part.quantity), 0);

    const newOS: OrdemServico = {
      id: 'os-' + Date.now(),
      idFormatado: `OS-${customIdNum}`,
      assistenciaId,
      tecnicoId: tecnicoId || null,
      clientName,
      clientDocument,
      clientPhone,
      clientEmail,
      address,
      clientZipCode,
      clientCity,
      clientState,
      equipmentType,
      equipmentBrand,
      equipmentModel,
      reportedIssue,
      technicalDiagnosis: '',
      status: 'Pendente',
      createdAt: formattedDate,
      scheduledVisitDate,
      deliveryTargetDate: scheduledVisitDate ? new Date(new Date(scheduledVisitDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalCostValue: Number(totalCostValue) || 0,
      taxaDeslocamento: Number(taxaDeslocamento) || 0,
      partsCostValue: partsCostTotal,
      parts,
      laborCostValue: Number(laborCostValue) || 0,
      history: [
        {
          date: formattedDate,
          status: 'Pendente',
          description: 'Ordem de Serviço criada com sucesso no sistema.',
          author: 'Administrador (Loja)'
        }
      ]
    };

    onAdd(newOS);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none font-sans overflow-hidden">
      <div className="bg-neutral-900 dark:bg-neutral-100 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between text-white dark:text-neutral-900">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-yellow-300 stroke-[2.5]" />
          <h3 className="font-black text-lg uppercase tracking-tight">Nova Ordem de Serviço (OS)</h3>
        </div>
        <button 
          onClick={onCancel} 
          className="text-white dark:text-neutral-900 hover:text-red-400 transition-colors cursor-pointer"
          aria-label="Cancelar criação de ordem de serviço"
        >
          <X className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Section 1: Cliente info */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b-2 border-neutral-100 pb-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Informações Gerais do Cliente
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="clientName" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Nome do Cliente *</label>
              <input
                id="clientName"
                type="text"
                required
                placeholder="Nome completo ou Academia"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
            <div>
              <label htmlFor="clientDocument" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">CPF / CNPJ</label>
              <input
                id="clientDocument"
                type="text"
                placeholder="000.000.000-00"
                value={clientDocument}
                onChange={(e) => setClientDocument(maskDocument(e.target.value))}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Celular / Contato *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                <input
                  id="clientPhone"
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(maskPhone(e.target.value))}
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-9 pr-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label htmlFor="clientEmail" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">E-mail (Opcional)</label>
              <input
                id="clientEmail"
                type="email"
                placeholder="parceiro@academia.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label htmlFor="os-address" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Local de Retirada / Endereço *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                <input
                  id="os-address"
                  type="text"
                  required
                  placeholder="Endereço onde o equipamento está localizado"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-9 pr-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label htmlFor="clientZipCode" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">
                CEP {isFetchingCep && <span className="text-emerald-500 ml-1 animate-pulse">(Buscando...)</span>}
              </label>
              <input
                id="clientZipCode"
                type="text"
                placeholder="00000-000"
                value={clientZipCode}
                onChange={handleCepChange}
                className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold ${isFetchingCep ? 'opacity-70' : ''}`}
                disabled={isFetchingCep}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="clientCity" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Cidade</label>
              <input
                id="clientCity"
                type="text"
                placeholder="Ex: Rio de Janeiro"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
            <div>
              <label htmlFor="clientState" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Estado (UF)</label>
              <input
                id="clientState"
                type="text"
                maxLength={2}
                placeholder="Ex: RJ"
                value={clientState}
                onChange={(e) => setClientState(e.target.value.toUpperCase())}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Equipment details */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b-2 border-neutral-100 pb-1 flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Equipamento Fitness Danificado
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="equipmentType" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Tipo de Aparelho *</label>
              <select
                id="equipmentType"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value as OrdemServico['equipmentType'])}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none text-sm font-bold active:bg-neutral-50"
              >
                <option value="Esteira">Esteira</option>
                <option value="Bicicleta Ergométrica">Bicicleta Ergométrica</option>
                <option value="Elíptico">Elíptico</option>
                <option value="Estação de Musculação">Estação de Musculação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label htmlFor="equipmentBrand" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Marca / Fabricante *</label>
              <input
                id="equipmentBrand"
                type="text"
                required
                placeholder="Ex: Movement, Kikos, Matrix"
                value={equipmentBrand}
                onChange={(e) => setEquipmentBrand(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
            <div>
              <label htmlFor="equipmentModel" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Modelo *</label>
              <input
                id="equipmentModel"
                type="text"
                required
                placeholder="Ex: LX-160, Run 2"
                value={equipmentModel}
                onChange={(e) => setEquipmentModel(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="reportedIssue" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Defeito Relatado / Queixa do Cliente *</label>
            <textarea
              id="reportedIssue"
              required
              rows={3}
              placeholder="Descreva em detalhes o comportamento anormal do equipamento, barulhos, falhas no display ou fiação."
              value={reportedIssue}
              onChange={(e) => setReportedIssue(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold font-sans"
            ></textarea>
          </div>
        </div>

        {/* Section 3: Allocation details */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b-2 border-neutral-100 pb-1 flex items-center gap-1.5">
            Atribuição de Técnico
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            
            <div>
              <label htmlFor="tecnicoId" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Técnico Encarregado (Instalação/Análise)</label>
              <select
                id="tecnicoId"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none text-sm font-bold"
              >
                <option value="">Aguardando diagnóstico técnico (Sem técnico)</option>
                {filteredTecnicos.map(u => (
                  <option key={u.id} value={u.tecnicoId || u.id}>{u.name}</option>
                ))}
              </select>
              {filteredTecnicos.length === 0 && assistenciaId && (
                <p className="text-[11px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Nenhum técnico cadastrado para esta assistência técnica ainda.</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Budget details */}
        <div className="space-y-6 pt-2">
          {/* Sub-section A: Prazos */}
          <div className="bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700 space-y-3 rounded-2xl">
            <h4 className="text-[10px] font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Agendamento de Atendimento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduledVisitDate" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Data para Primeiro Atendimento</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" />
                  <input
                    id="scheduledVisitDate"
                    type="date"
                    value={scheduledVisitDate}
                    onChange={(e) => setScheduledVisitDate(e.target.value)}
                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl pl-9 pr-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none text-xs font-bold bg-white dark:bg-neutral-800"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-tight mt-1 font-bold">Defina manualmente a data da visita técnica.</p>
              </div>
            </div>
          </div>

          {/* Sub-section B: Peças Utilizadas */}
          <div className="bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700 space-y-4">
            <h4 className="text-[10px] font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Componentes e Peças de Reposição
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Nome da Peça / Componente</label>
                <input type="text" placeholder="Ex: Correia de transmissão, Cabo de aço de 3m, Sensor óptico" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800 placeholder-zinc-400 dark:placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Quantidade</label>
                <input type="number" placeholder="Qtd" value={partQuantity} onChange={(e) => setPartQuantity(Number(e.target.value))} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Valor Unitário R$</label>
                <input type="number" placeholder="R$ 0.00" value={partValue || ''} onChange={(e) => setPartValue(Number(e.target.value))} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800 placeholder-zinc-400 dark:placeholder-zinc-500" />
              </div>
              <div className="sm:col-span-3 md:col-span-4 flex justify-end">
                <button type="button" onClick={addPart} className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-5 py-2.5 font-black uppercase text-xs tracking-wider border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Adicionar Peça na Lista
                </button>
              </div>
            </div>
            
            {parts.length > 0 ? (
              <div className="mt-3 border border-neutral-200 dark:border-neutral-700 divide-y-2 divide-black bg-white dark:bg-neutral-800">
                <div className="bg-neutral-100 p-2 text-[10px] font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700">Peças Adicionadas na OS</div>
                {parts.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 text-xs font-bold">
                    <span className="uppercase text-neutral-900 dark:text-neutral-100 font-semibold font-mono break-all"><span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 mr-2 text-[10px] font-black">{p.quantity}x</span> {p.name}</span>
                    <div className="flex flex-row items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className="text-emerald-700 font-mono">R$ {(p.value * p.quantity).toFixed(2)}</span>
                      <button type="button" onClick={() => removePart(i)} className="text-red-600 hover:bg-red-50 p-1 border border-neutral-200 dark:border-neutral-700 transition-colors" title="Remover"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 bg-white dark:bg-neutral-800 p-3 border border-neutral-200 dark:border-neutral-700 italic">Nenhuma peça adicionada ainda.</p>
            )}
          </div>

          {/* Sub-section C: Financas Mão de obra e Deslocamento + TOTAL FINAl */}
          <div className="bg-neutral-50 p-5 border border-neutral-200 dark:border-neutral-700 space-y-4 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-900 border-b border-neutral-200 pb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 stroke-[2.5]" /> Custos de Prestação de Serviço e Orçamento
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="laborCostValue" className="block text-[11px] font-black uppercase text-neutral-900 mb-1.5 font-mono">Custo Mão de Obra R$</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-neutral-400">R$</span>
                  <input
                    id="laborCostValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={laborCostValue || ''}
                    onChange={(e) => setLaborCostValue(parseFloat(e.target.value) || 0)}
                    className="w-full border border-neutral-200 bg-white text-neutral-900 pl-9 pr-3 py-2 rounded-2xl text-xs font-black focus:outline-none focus:bg-neutral-50"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-tight mt-1 font-bold">Trabalho do mecânico responsável.</p>
              </div>

              <div>
                <label htmlFor="taxaDeslocamento" className="block text-[11px] font-black uppercase text-neutral-900 mb-1.5 font-mono">Taxa de Deslocamento/Visita R$</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-neutral-400">R$</span>
                  <input
                    id="taxaDeslocamento"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={taxaDeslocamento || ''}
                    onChange={(e) => setTaxaDeslocamento(parseFloat(e.target.value) || 0)}
                    className="w-full border border-neutral-200 bg-white text-neutral-900 pl-9 pr-3 py-2 rounded-2xl text-xs font-black focus:outline-none focus:bg-neutral-50"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-tight mt-1 font-bold">Custo de deslocamento até o local do cliente.</p>
              </div>
            </div>

            {/* GRAND TOTAL: Orçamento Estimado */}
            <div className="bg-white border-2 border-neutral-900 p-4 mt-2 text-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-center sm:text-left">
                  <span className="block text-[12px] font-black uppercase tracking-wider text-neutral-900 font-mono">Orçamento Estimado R$ (Automático)</span>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Mão de Obra + Deslocamento + Peças Adicionadas</span>
                </div>
                <div className="text-center sm:text-right">
                  <span className="text-2xl font-black text-neutral-900 inline-block px-4 py-1.5 ">
                    R$ {totalCostValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t-2 border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer placeholder-neutral-500 dark:placeholder-neutral-400 dark:placeholder-neutral-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-black uppercase tracking-widest px-6 py-2.5 rounded-2xl text-xs shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer"
          >
            Criar Ordem de Serviço
          </button>
        </div>
      </form>
    </div>
  );
}
