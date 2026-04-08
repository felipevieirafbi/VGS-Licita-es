import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Search, MessageCircle, Mail, Calendar as CalendarIcon, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from '@google/genai';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function LeadModal({ leadId, onClose }: { leadId: string, onClose: () => void }) {
  const { userData } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSearchingOSINT, setIsSearchingOSINT] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<any>(null);

  useEffect(() => {
    const fetchLead = async () => {
      const docRef = doc(db, 'leads', leadId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLead({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchLead();

    const q = query(collection(db, 'interactions'), where('leadId', '==', leadId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [leadId]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await addDoc(collection(db, 'interactions'), {
        leadId,
        userId: userData?.uid,
        notes: newNote,
        date: serverTimestamp(),
        interactionType: 'note'
      });
      
      // AI Suggestion for next action
      const prompt = `Baseado nesta anotação de CRM: "${newNote}", sugira a próxima ação a ser tomada com este cliente e uma data sugerida (em dias a partir de hoje). Responda em JSON com as chaves "title" (string curta) e "daysToAdd" (number).`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              daysToAdd: { type: Type.NUMBER }
            },
            required: ["title", "daysToAdd"]
          }
        }
      });
      
      const suggestion = JSON.parse(response.text || '{}');
      if (suggestion.title && suggestion.daysToAdd) {
        setSuggestedAction(suggestion);
      }
      
      setNewNote('');
      toast.success('Anotação salva!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar anotação');
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestedAction) return;
    
    const actionDate = new Date();
    actionDate.setDate(actionDate.getDate() + suggestedAction.daysToAdd);
    
    try {
      await addDoc(collection(db, 'tasks'), {
        leadId,
        title: suggestedAction.title,
        actionDate: actionDate.toISOString(),
        description_ai_generated: `Sugerido a partir da anotação.`,
        completed: false
      });
      toast.success('Tarefa agendada no calendário!');
      setSuggestedAction(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao agendar tarefa');
    }
  };

  const handleOSINT = async () => {
    setIsSearchingOSINT(true);
    try {
      const prompt = `Acesse as ferramentas de Busca do Google em tempo real. Investigue profunda e exaustivamente a empresa identificada como ${lead.companyName} (CNPJ: ${lead.cnpj || 'não informado'}). Identifique nos resultados públicos o seu setor primário, eventuais nomes de sócios ou contatos chave em redes sociais como o LinkedIn, histórico recente em portais de notícias corporativos ou de transparência governamental (para saber se já participaram de licitações). Com o volume de dados recuperado, produza um 'Relatório de Panorama' e formule o texto altamente personalizado de abordagem comercial focado em terceirização de licitações, destacando dores prováveis e benefícios imediatos.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const osintResult = response.text;
      
      await updateDoc(doc(db, 'leads', leadId), {
        osintData: osintResult,
        lastModifiedBy: userData?.uid || 'system',
        updatedAt: serverTimestamp()
      });
      
      setLead(prev => ({ ...prev, osintData: osintResult }));
      toast.success('Pesquisa OSINT concluída!');
      
      await addDoc(collection(db, 'audit_logs'), {
        userId: userData?.uid || 'system',
        action: `Realizou pesquisa OSINT`,
        entityId: leadId,
        timestamp: serverTimestamp()
      });
      
    } catch (error) {
      console.error(error);
      toast.error('Erro ao realizar pesquisa OSINT');
    } finally {
      setIsSearchingOSINT(false);
    }
  };

  if (loading) return null;

  const whatsappText = encodeURIComponent(`Olá, sou consultor da VGS Licitações. Vi que a ${lead.companyName} tem grande potencial para fornecer ao governo...`);
  const emailSubject = encodeURIComponent(`Oportunidade de Vendas Governamentais para ${lead.companyName}`);
  const emailBody = encodeURIComponent(`Olá,\n\nSou consultor da VGS Licitações. Analisamos o perfil da ${lead.companyName} e identificamos um excelente potencial para atuar no mercado de compras públicas.\n\nGostaria de agendar uma breve reunião para apresentar como podemos terceirizar todo o seu departamento de licitações.\n\nAtenciosamente,`);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lead.companyName || 'Empresa sem nome'}</h2>
            <p className="text-sm text-gray-500 mt-1">CNPJ: {lead.cnpj || 'Não informado'} • Origem: {lead.source}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Info & OSINT */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Info & Actions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contato e Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">E-mail</p>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone/WhatsApp</p>
                  <p className="font-medium">{lead.phone || '-'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a 
                  href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}?text=${whatsappText}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
                <a 
                  href={`mailto:${lead.email}?subject=${emailSubject}&body=${emailBody}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  E-mail
                </a>
              </div>
            </div>

            {/* OSINT Section */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Search className="w-6 h-6 text-blue-400" />
                    Inteligência OSINT
                  </h3>
                  <button 
                    onClick={handleOSINT}
                    disabled={isSearchingOSINT}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearchingOSINT ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Pesquisando...</>
                    ) : (
                      'Pesquisa Completa da Empresa'
                    )}
                  </button>
                </div>
                
                {lead.osintData ? (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 max-h-96 overflow-y-auto prose prose-invert prose-sm max-w-none">
                    <Markdown>{lead.osintData}</Markdown>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm italic py-8 text-center border border-dashed border-slate-700 rounded-lg">
                    Nenhuma pesquisa OSINT realizada ainda. Clique no botão acima para investigar esta empresa usando IA.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline e Histórico</h3>
            
            {/* Note Input */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
              <textarea 
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Registre os detalhes da ligação ou reunião..."
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
              />
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleSaveNote}
                  disabled={!newNote.trim()}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Salvar Anotação
                </button>
              </div>
            </div>

            {/* AI Suggestion */}
            {suggestedAction && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-orange-900">Sugestão de Próxima Ação da IA</h4>
                    <p className="text-sm text-orange-800 mt-1">{suggestedAction.title} (em {suggestedAction.daysToAdd} dias)</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleAcceptSuggestion} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                        Agendar no Calendário
                      </button>
                      <button onClick={() => setSuggestedAction(null)} className="text-orange-700 hover:text-orange-900 px-3 py-1.5 text-xs font-medium">
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {logs.map(log => (
                <div key={log.id} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.notes}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {log.date ? new Date(log.date.toDate()).toLocaleString('pt-BR') : 'Agora'}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum histórico registrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
