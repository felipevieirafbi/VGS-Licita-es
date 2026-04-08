import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock } from 'lucide-react';
import LeadModal from '../components/LeadModal';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Calendar() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('actionDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const categorizeTask = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isPast(date)) return 'Atrasadas';
    if (isFuture(date)) return 'Futuras';
    return 'Outros';
  };

  const groupedTasks = tasks.reduce((acc: any, task) => {
    const category = categorizeTask(task.actionDate);
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {});

  const order = ['Atrasadas', 'Hoje', 'Amanhã', 'Futuras'];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          Calendário de Ações
        </h2>
        <p className="text-gray-500 mt-2">Acompanhe seus próximos follow-ups e reuniões</p>
      </div>

      <div className="space-y-8">
        {order.map(category => {
          const categoryTasks = groupedTasks[category];
          if (!categoryTasks || categoryTasks.length === 0) return null;

          return (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`px-6 py-3 border-b border-gray-200 font-semibold flex items-center justify-between ${
                category === 'Atrasadas' ? 'bg-red-50 text-red-700' :
                category === 'Hoje' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                <span>{category}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm">{categoryTasks.length}</span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {categoryTasks.map((task: any) => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedLeadId(task.leadId)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-4"
                  >
                    <div className="mt-1">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{task.description_ai_generated}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.actionDate), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-xs text-blue-600 hover:underline">Ver Lead &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Nenhuma tarefa agendada</h3>
            <p className="text-gray-500">As sugestões da IA aparecerão aqui.</p>
          </div>
        )}
      </div>

      {selectedLeadId && (
        <LeadModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}
