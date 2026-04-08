import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { Globe, Bot, UserPlus, Users, Clock } from 'lucide-react';
import LeadModal from '../components/LeadModal';

const COLUMNS = [
  "Novos Leads",
  "Análise OSINT",
  "Reunião Agendada",
  "Proposta Enviada",
  "Negociação",
  "Fechado",
  "Lixeira"
];

const SOURCE_ICONS: Record<string, React.ElementType> = {
  'Site Orgânico': Globe,
  'Chatbot IA': Bot,
  'Manual/Outbound': UserPlus,
  'Indicação': Users
};

export default function Kanban() {
  const { userData } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'leads'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(leadsData);
    });
    return () => unsubscribe();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId;
      
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStatus } : l));

      try {
        await updateDoc(doc(db, 'leads', draggableId), {
          status: newStatus,
          lastModifiedBy: userData?.uid,
          updatedAt: serverTimestamp()
        });

        // Audit Trail
        await addDoc(collection(db, 'audit_logs'), {
          userId: userData?.uid,
          action: `Moveu lead para ${newStatus}`,
          entityId: draggableId,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating lead status", error);
        // Revert on error could be implemented here
      }
    }
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie seus leads e oportunidades</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {COLUMNS.map(column => (
              <div key={column} className="flex flex-col w-80 shrink-0 max-h-full bg-gray-100/50 rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-100/80 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700">{column}</h3>
                  <span className="bg-white text-gray-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                    {getLeadsByStatus(column).length}
                  </span>
                </div>
                
                <Droppable droppableId={column}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                    >
                      {getLeadsByStatus(column).map((lead, index) => {
                        const Icon = SOURCE_ICONS[lead.source] || Globe;
                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedLeadId(lead.id)}
                                className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-gray-900 line-clamp-2">{lead.companyName || 'Empresa não informada'}</h4>
                                </div>
                                
                                <div className="flex items-center justify-between mt-4">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[100px]">{lead.source}</span>
                                  </div>
                                  
                                  {lead.createdAt && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                      <Clock className="w-3.5 h-3.5" />
                                      {new Date(lead.createdAt?.toDate?.() || Date.now()).toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {selectedLeadId && (
        <LeadModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}
