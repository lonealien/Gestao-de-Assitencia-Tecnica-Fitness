import React, { useState, useEffect } from 'react';
import { AssistenciaTecnica, Tecnico, Orcamento, Part, AppUser, Client } from '../types';
import { X, ClipboardList, PenTool, User, Phone, MapPin, DollarSign, Calendar, Plus, Trash2, Search, FileText } from 'lucide-react';
import { maskPhone, maskDocument, maskCEP } from '../utils';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { saveToFirestore, handleFirestoreError, OperationType } from '../db';

interface OrcamentoFormProps {
  assistencias: AssistenciaTecnica[];
  usuarios: AppUser[];
  onAdd: (orc: Orcamento) => void;
  onCancel: () => void;
  defaultAssistenciaId?: string;
  editingOrcamento?: Orcamento;
}

export default function OrcamentoForm({
  assistencias,
  usuarios,
  onAdd,
  onCancel,
  defaultAssistenciaId,
  editingOrcamento
}: OrcamentoFormProps) {
  const [clientName, setClientName] = useState(editingOrcamento?.clientName || '');
  const [clientDocument, setClientDocument] = useState(editingOrcamento?.clientDocument || '');
  const [clientPhone, setClientPhone] = useState(editingOrcamento?.clientPhone || '');
  const [additionalContacts, setAdditionalContacts] = useState<{name: string, phone: string}[]>(editingOrcamento?.additionalContacts || []);
  const [clientEmail, setClientEmail] = useState(editingOrcamento?.clientEmail || '');
  const [address, setAddress] = useState(editingOrcamento?.address || '');
  const [addressNumber, setAddressNumber] = useState(editingOrcamento?.addressNumber || '');
  const [addressComplement, setAddressComplement] = useState(editingOrcamento?.addressComplement || '');
  const [clientZipCode, setClientZipCode] = useState(editingOrcamento?.clientZipCode || '');
  const [clientCity, setClientCity] = useState(editingOrcamento?.clientCity || '');
  const [clientState, setClientState] = useState(editingOrcamento?.clientState || '');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [equipmentType, setEquipmentType] = useState<Orcamento['equipmentType']>(editingOrcamento?.equipmentType || 'Esteira');
  const [equipmentBrand, setEquipmentBrand] = useState(editingOrcamento?.equipmentBrand || '');
  const [equipmentModel, setEquipmentModel] = useState(editingOrcamento?.equipmentModel || '');
  const [reportedIssue, setReportedIssue] = useState(editingOrcamento?.reportedIssue || '');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState(editingOrcamento?.technicalDiagnosis || '');
  const [assistenciaId, setAssistenciaId] = useState(editingOrcamento?.assistenciaId || defaultAssistenciaId || assistencias[0]?.id || '');
  const [tecnicoId, setTecnicoId] = useState<string>(editingOrcamento?.tecnicoId || '');
  
  const [parts, setParts] = useState<Part[]>(editingOrcamento?.parts || []);
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partValue, setPartValue] = useState(0);

  const [totalCostValue, setTotalCostValue] = useState<number>(editingOrcamento?.totalCostValue || 0);
  const [taxaDeslocamento, setTaxaDeslocamento] = useState<number>(editingOrcamento?.taxaDeslocamento || 0);
  const [laborCostValue, setLaborCostValue] = useState<number>(editingOrcamento?.laborCostValue || 0);
  const [discountValue, setDiscountValue] = useState<number>(editingOrcamento?.discountValue || 0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(editingOrcamento?.discountType || 'fixed');
  const [isLaborCourtesy, setIsLaborCourtesy] = useState(editingOrcamento?.isLaborCourtesy || false);
  const [isTravelCourtesy, setIsTravelCourtesy] = useState(editingOrcamento?.isTravelCourtesy || false);
  const [paymentMethod, setPaymentMethod] = useState<'Pix/À vista' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto' | ''>(editingOrcamento?.paymentMethod || '');
  const [installments, setInstallments] = useState<number>(editingOrcamento?.installments || 1);
  const [validityDays, setValidityDays] = useState<number>(editingOrcamento?.validityDays || 10);

  const filteredTecnicos = usuarios.filter(u => u.role === 'TECNICO');

  useEffect(() => {
    const isStillValid = filteredTecnicos.some(u => u.tecnicoId === tecnicoId);
    if (!isStillValid) {
      setTecnicoId('');
    }
  }, [assistenciaId, filteredTecnicos, tecnicoId]);

  useEffect(() => {
    const partsSum = parts.reduce((acc, part) => acc + (part.value * part.quantity), 0);
    const labor = isLaborCourtesy ? 0 : (Number(laborCostValue) || 0);
    const deslocamento = isTravelCourtesy ? 0 : (Number(taxaDeslocamento) || 0);
    
    let subtotal = partsSum + labor + deslocamento;
    let finalTotal = subtotal;
    
    if (discountValue > 0) {
      if (discountType === 'fixed') {
        finalTotal = Math.max(0, subtotal - discountValue);
      } else {
        finalTotal = Math.max(0, subtotal * (1 - discountValue / 100));
      }
    }
    
    setTotalCostValue(finalTotal);
  }, [parts, laborCostValue, taxaDeslocamento, isLaborCourtesy, isTravelCourtesy, discountValue, discountType]);

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

  const searchClientByDocument = async (docStr: string) => {
    const cleanDoc = docStr.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) return;

    setIsSearchingClient(true);
    try {
      const q = query(
        collection(db, 'clients'),
        where('document', '==', docStr),
        where('assistenciaId', '==', assistenciaId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const clientData = querySnapshot.docs[0].data() as Client;
        setClientName(clientData.name);
        setClientPhone(clientData.phone);
        setClientEmail(clientData.email);
        setClientZipCode(clientData.zipCode || '');
        setAddress(clientData.address);
        setAddressNumber(clientData.addressNumber || '');
        setAddressComplement(clientData.addressComplement || '');
        setClientCity(clientData.city || '');
        setClientState(clientData.state || '');
        setAdditionalContacts(clientData.additionalContacts || []);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
    } finally {
      setIsSearchingClient(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = maskDocument(e.target.value);
    setClientDocument(value);
    const cleanDoc = value.replace(/\D/g, '');
    if (cleanDoc.length === 11 || cleanDoc.length === 14) {
      searchClientByDocument(value);
    }
  };

  const saveClient = async () => {
    if (!clientDocument || !clientName) return;
    
    const cleanDoc = clientDocument.replace(/\D/g, '');
    const clientId = `client-${cleanDoc}`;
    
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      const now = new Date().toISOString();
      const clientData: Client = {
        id: clientId,
        name: clientName,
        document: clientDocument,
        phone: clientPhone,
        email: clientEmail,
        zipCode: clientZipCode,
        address: address,
        addressNumber: addressNumber,
        addressComplement: addressComplement,
        city: clientCity,
        state: clientState,
        additionalContacts: additionalContacts,
        assistenciaId: assistenciaId,
        updatedAt: now,
        createdAt: clientSnap.exists() ? (clientSnap.data() as Client).createdAt : now
      };

      await setDoc(clientRef, clientData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !address || !equipmentBrand || !equipmentModel || !reportedIssue) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    await saveClient();

    const partsCostTotal = parts.reduce((acc, part) => acc + (part.value * part.quantity), 0);

    const createdAtStr = editingOrcamento?.createdAt || new Date().toISOString();
    const expiresDate = new Date(createdAtStr);
    expiresDate.setDate(expiresDate.getDate() + validityDays);
    const expiresAtStr = expiresDate.toISOString();

    const updatedOrcamento: Orcamento = {
      id: editingOrcamento?.id || 'orc-' + Date.now(),
      idFormatado: editingOrcamento?.idFormatado || `ORC-${Math.floor(1000 + Math.random() * 9000)}`,
      assistenciaId,
      tecnicoId: tecnicoId || null,
      clientName,
      clientDocument,
      clientPhone,
      additionalContacts: additionalContacts.length > 0 ? additionalContacts : undefined,
      clientEmail,
      address,
      addressNumber,
      addressComplement,
      clientZipCode,
      clientCity,
      clientState,
      equipmentType,
      equipmentBrand,
      equipmentModel,
      reportedIssue,
      technicalDiagnosis,
      status: editingOrcamento?.status || 'Pendente',
      createdAt: createdAtStr,
      expiresAt: expiresAtStr,
      validityDays,
      totalCostValue: Number(totalCostValue) || 0,
      taxaDeslocamento: Number(taxaDeslocamento) || 0,
      partsCostValue: partsCostTotal,
      parts,
      laborCostValue: Number(laborCostValue) || 0,
      discountValue: Number(discountValue) || 0,
      discountType,
      isLaborCourtesy,
      isTravelCourtesy,
      paymentMethod: paymentMethod || undefined,
      installments: paymentMethod === 'Cartão de Crédito' ? installments : undefined
    };

    onAdd(updatedOrcamento);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm dark:shadow-none font-sans overflow-hidden">
      <div className="bg-neutral-900 dark:bg-neutral-100 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between text-white dark:text-neutral-900">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-yellow-300 stroke-[2.5]" />
          <h3 className="font-black text-lg uppercase tracking-tight">
            {editingOrcamento ? `Editar Orçamento #${editingOrcamento.idFormatado}` : 'Novo Orçamento'}
          </h3>
        </div>
        <button 
          onClick={onCancel} 
          className="text-white dark:text-neutral-900 hover:text-red-400 transition-colors cursor-pointer"
          aria-label="Cancelar criação de orçamento"
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
              <label htmlFor="clientDocument" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">CPF ou CNPJ</label>
              <input
                id="clientDocument"
                type="text"
                placeholder="Apenas números"
                value={clientDocument}
                onChange={handleDocumentChange}
                className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold ${isSearchingClient ? 'opacity-70 animate-pulse bg-neutral-50' : ''}`}
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Telefone Principal *</label>
              <input
                id="clientPhone"
                type="text"
                required
                placeholder="(00) 00000-0000"
                value={clientPhone}
                onChange={(e) => setClientPhone(maskPhone(e.target.value))}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="clientEmail" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">E-mail do Cliente</label>
              <input
                id="clientEmail"
                type="email"
                placeholder="exemplo@gmail.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="block text-[10px] font-black uppercase text-neutral-500 tracking-wider">Contatos Adicionais / Telefones extras</span>
                <button
                  type="button"
                  onClick={() => setAdditionalContacts([...additionalContacts, {name: '', phone: ''}])}
                  className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Outro Contato
                </button>
              </div>
              <div className="space-y-2">
                {additionalContacts.map((contact, index) => (
                  <div key={index} className="flex gap-2 items-center bg-neutral-50 dark:bg-neutral-900/30 p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <input
                      type="text"
                      placeholder="Nome do contato"
                      value={contact.name}
                      onChange={(e) => {
                        const list = [...additionalContacts];
                        list[index].name = e.target.value;
                        setAdditionalContacts(list);
                      }}
                      className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-neutral-900 dark:text-neutral-100 text-xs bg-white dark:bg-neutral-800 font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Telefone"
                      value={contact.phone}
                      onChange={(e) => {
                        const list = [...additionalContacts];
                        list[index].phone = maskPhone(e.target.value);
                        setAdditionalContacts(list);
                      }}
                      className="w-40 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-neutral-900 dark:text-neutral-100 text-xs bg-white dark:bg-neutral-800 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setAdditionalContacts(additionalContacts.filter((_, i) => i !== index))}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label htmlFor="clientZipCode" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">CEP *</label>
              <input
                id="clientZipCode"
                type="text"
                required
                placeholder="00000-000"
                value={clientZipCode}
                onChange={handleCepChange}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Endereço (Rua, Bairro) *</label>
              <input
                id="address"
                type="text"
                required
                placeholder="Rua, Bairro ou condomínio"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold ${isFetchingCep ? 'opacity-70' : ''}`}
                disabled={isFetchingCep}
              />
            </div>
            <div>
              <label htmlFor="addressNumber" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Número / Apt *</label>
              <input
                id="addressNumber"
                type="text"
                required
                placeholder="Nº ou S/N"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="addressComplement" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Complemento</label>
              <input
                id="addressComplement"
                type="text"
                placeholder="Bloco, sala, ponto de referência"
                value={addressComplement}
                onChange={(e) => setAddressComplement(e.target.value)}
                className={`w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold ${isFetchingCep ? 'opacity-70' : ''}`}
                disabled={isFetchingCep}
              />
            </div>
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
                onChange={(e) => setEquipmentType(e.target.value as Orcamento['equipmentType'])}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none text-sm font-bold active:bg-neutral-50"
              >
                <option value="Esteira">Esteira</option>
                <option value="Bicicleta Ergométrica">Bicicleta Ergométrica</option>
                <option value="Elíptico">Elíptico</option>
                <option value="Estação de Musculação">Estação de Musculação</option>
                <option value="Macas">Macas</option>
                <option value="Pilates">Pilates</option>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label htmlFor="reportedIssue" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Defeito Relatado *</label>
              <textarea
                id="reportedIssue"
                required
                rows={3}
                placeholder="Descreva o defeito relatado pelo cliente."
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold font-sans"
              ></textarea>
            </div>
            <div>
              <label htmlFor="technicalDiagnosis" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Diagnóstico / Parecer Técnico (Opcional)</label>
              <textarea
                id="technicalDiagnosis"
                rows={3}
                placeholder="Laudo preliminar, diagnóstico, observações do mecânico..."
                value={technicalDiagnosis}
                onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold font-sans"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Section 3: Allocation */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b-2 border-neutral-100 pb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Atribuição de Técnico
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tecnicoId" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Mecânico / Técnico Encarregado</label>
              <select
                id="tecnicoId"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 focus:outline-none text-sm font-bold active:bg-neutral-50"
              >
                <option value="">Nenhum - Avaliação na Oficina / Sem técnico fixado</option>
                {filteredTecnicos.map(t => (
                  <option key={t.id} value={t.tecnicoId}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="validityDays" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1">Validade do Orçamento (Dias) *</label>
              <input
                id="validityDays"
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:bg-neutral-50 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Budget details */}
        <div className="space-y-6 pt-2">
          {/* Componentes e Peças */}
          <div className="bg-neutral-50 p-4 border border-neutral-200 dark:border-neutral-700 space-y-4">
            <h4 className="text-[10px] font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-1 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-neutral-900 dark:text-neutral-100 stroke-[2.5]" /> Componentes, Peças ou Serviços
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Peça ou Serviço</label>
                <input type="text" placeholder="Ex: Correia de transmissão, Cabo de aço, Placa inversora" value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800 placeholder-zinc-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Quantidade</label>
                <input type="number" placeholder="Qtd" value={partQuantity} onChange={(e) => setPartQuantity(Number(e.target.value))} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-900 dark:text-neutral-100 mb-1 font-mono">Valor Unitário R$</label>
                <input type="number" placeholder="R$ 0.00" value={partValue || ''} onChange={(e) => setPartValue(Number(e.target.value))} className="w-full border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs font-bold bg-white dark:bg-neutral-800 placeholder-zinc-400" />
              </div>
              <div className="sm:col-span-3 md:col-span-4 flex justify-end">
                <button type="button" onClick={addPart} className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 px-5 py-2.5 font-black uppercase text-xs tracking-wider border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Adicionar Peça ou Serviço
                </button>
              </div>
            </div>
            
            {parts.length > 0 ? (
              <div className="mt-3 border border-neutral-200 dark:border-neutral-700 divide-y-2 divide-black bg-white dark:bg-neutral-800">
                <div className="bg-neutral-100 p-2 text-[10px] font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700">Itens do Orçamento</div>
                {parts.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 text-xs font-bold">
                    <div className="flex-1">
                      <label className="block text-[8px] font-black uppercase text-neutral-400 mb-0.5">Peça ou Serviço</label>
                      <span className="uppercase text-neutral-900 dark:text-neutral-100 font-semibold font-mono break-all">
                        <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 border border-neutral-200 mr-2 text-[10px] font-black">{p.quantity}x</span> 
                        {p.name}
                      </span>
                    </div>
                    <div className="flex flex-row items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="text-right">
                        <label className="block text-[8px] font-black uppercase text-neutral-400 mb-0.5">Unitário</label>
                        <span className="text-neutral-500 font-mono">R$ {p.value.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <label className="block text-[8px] font-black uppercase text-neutral-400 mb-0.5">Total</label>
                        <span className="text-emerald-700 font-mono">R$ {(p.value * p.quantity).toFixed(2)}</span>
                      </div>
                      <button type="button" onClick={() => removePart(i)} className="text-red-600 hover:bg-red-50 p-1 border border-neutral-200 transition-colors" title="Remover"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 bg-white dark:bg-neutral-800 p-3 border border-neutral-200 italic">Nenhuma peça ou serviço adicional inserido.</p>
            )}
          </div>

          {/* Custos Financeiros */}
          <div className="bg-neutral-50 p-5 border border-neutral-200 dark:border-neutral-700 space-y-4 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 stroke-[2.5]" /> Valores de Mão de Obra e Deslocamento
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="laborCostValue" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 font-mono">Custo Mão de Obra R$</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLaborCourtesy}
                      onChange={(e) => setIsLaborCourtesy(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="text-[10px] font-black uppercase text-emerald-600">Cortesia</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-neutral-400">R$</span>
                  <input
                    id="laborCostValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isLaborCourtesy}
                    value={laborCostValue || ''}
                    onChange={(e) => setLaborCostValue(parseFloat(e.target.value) || 0)}
                    className={`w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 pl-9 pr-3 py-2 rounded-2xl text-xs font-black focus:outline-none focus:bg-neutral-50 ${isLaborCourtesy ? 'opacity-50 line-through' : ''}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="taxaDeslocamento" className="block text-[11px] font-black uppercase text-neutral-900 dark:text-neutral-100 font-mono">Taxa de Visita / Deslocamento R$</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isTravelCourtesy}
                      onChange={(e) => setIsTravelCourtesy(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="text-[10px] font-black uppercase text-emerald-600">Cortesia</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-neutral-400">R$</span>
                  <input
                    id="taxaDeslocamento"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isTravelCourtesy}
                    value={taxaDeslocamento || ''}
                    onChange={(e) => setTaxaDeslocamento(parseFloat(e.target.value) || 0)}
                    className={`w-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 pl-9 pr-3 py-2 rounded-2xl text-xs font-black focus:outline-none focus:bg-neutral-50 ${isTravelCourtesy ? 'opacity-50 line-through' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Desconto */}
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Aplicar Desconto
                </label>
                <div className="flex bg-amber-100 dark:bg-amber-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${discountType === 'fixed' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-amber-700 dark:text-amber-300 hover:bg-amber-200'}`}
                  >
                    R$ Fixo
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${discountType === 'percentage' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-amber-700 dark:text-amber-300 hover:bg-amber-200'}`}
                  >
                    % Porcentagem
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-amber-500">
                  {discountType === 'fixed' ? 'R$' : '%'}
                </span>
                <input
                  type="number"
                  min="0"
                  step={discountType === 'fixed' ? '0.01' : '1'}
                  max={discountType === 'percentage' ? '100' : undefined}
                  placeholder="0.00"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full border border-amber-200 dark:border-amber-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white pl-9 pr-3 py-2 rounded-xl text-sm font-black focus:outline-none"
                />
              </div>
            </div>

            {/* Método de Pagamento */}
            <div className="bg-white dark:bg-neutral-800 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl space-y-1.5 shadow-sm">
              <label htmlFor="paymentMethod" className="block text-[11px] font-black uppercase text-neutral-500 dark:text-neutral-400">
                Sugestão de Método de Pagamento
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => {
                  const method = e.target.value as any;
                  setPaymentMethod(method);
                  if (method !== 'Cartão de Crédito') {
                    setInstallments(1);
                  }
                }}
                className="w-full border border-neutral-200 dark:border-neutral-700 p-2.5 text-xs font-black text-neutral-900 dark:text-neutral-100 focus:outline-none bg-neutral-50 dark:bg-neutral-900 rounded-xl"
              >
                <option value="">Selecione a forma de pagamento...</option>
                <option value="Pix/À vista">Pix / À vista</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto</option>
              </select>

              {paymentMethod === 'Cartão de Crédito' && (
                <div className="mt-3 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-700 space-y-2">
                  <label htmlFor="installments" className="block text-[11px] font-black uppercase text-neutral-500 dark:text-neutral-400">
                    Número de Parcelas (Cartão de Crédito)
                  </label>
                  <select
                    id="installments"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full border border-neutral-200 dark:border-neutral-700 p-2.5 text-xs font-black text-neutral-900 dark:text-neutral-100 focus:outline-none bg-neutral-50 dark:bg-neutral-900 rounded-xl"
                  >
                    {[...Array(12)].map((_, i) => {
                      const count = i + 1;
                      const valuePerInstallment = totalCostValue / count;
                      return (
                        <option key={count} value={count}>
                          {count}x de R$ {valuePerInstallment.toFixed(2)} (Sem juros)
                        </option>
                      );
                    })}
                  </select>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-neutral-900 border border-emerald-100 dark:border-neutral-800 p-2 rounded-xl text-center">
                    Simulação: {installments}x de R$ {(totalCostValue / installments).toFixed(2)} = Total de R$ {totalCostValue.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* TOTAL DO ORÇAMENTO */}
            <div className="bg-white border-2 border-neutral-900 p-4 mt-2 text-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-center sm:text-left">
                  <span className="block text-[12px] font-black uppercase tracking-wider text-neutral-900 font-mono">Total Geral Estimado (Automático)</span>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">MÃO DE OBRA + VISITA + PEÇAS</span>
                </div>
                <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-1">
                  <div className="flex items-center gap-2">
                    {discountValue > 0 && (
                      <span className="px-2 py-0.5 text-xs font-black bg-red-100 text-red-800 border border-red-200 uppercase rounded-md tracking-wider">
                        {discountType === 'percentage' ? `-${discountValue}%` : `-R$ ${discountValue.toFixed(2)}`}
                      </span>
                    )}
                    <span className="text-2xl font-black text-neutral-900 inline-block font-mono">
                      R$ {totalCostValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t-2 border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 text-white dark:text-neutral-900 font-black uppercase tracking-widest px-6 py-2.5 rounded-2xl text-xs shadow-sm dark:shadow-none hover:shadow-md transition-all cursor-pointer"
          >
            Salvar Orçamento
          </button>
        </div>
      </form>
    </div>
  );
}
