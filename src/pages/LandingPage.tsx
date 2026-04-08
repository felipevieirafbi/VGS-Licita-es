import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, MessageSquare, Send, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function LandingPage() {
  const [cookieAccepted, setCookieAccepted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    cnpj: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('vgs_cookies_accepted');
    if (accepted === 'true') {
      setCookieAccepted(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('vgs_cookies_accepted', 'true');
    setCookieAccepted(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookieAccepted) {
      toast.error('Você precisa aceitar os termos de privacidade para continuar.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        source: 'Site Orgânico',
        status: 'Novos Leads',
        createdAt: serverTimestamp(),
        lastModifiedBy: 'system'
      });
      toast.success('Dados enviados com sucesso! Entraremos em contato em breve.');
      setFormData({ name: '', email: '', phone: '', companyName: '', cnpj: '' });
    } catch (error) {
      console.error('Error adding document: ', error);
      toast.error('Erro ao enviar dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-orange-500" />
          <span className="text-xl font-bold tracking-tight">VGS Licitações</span>
        </div>
        <a href="/login" className="text-sm font-medium text-blue-100 hover:text-white transition-colors">
          Área Restrita
        </a>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative bg-gray-50 py-20 md:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-blue-900 leading-tight tracking-tight">
                Aumente as receitas da sua empresa vendendo para o Governo
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
                Sem precisar criar um departamento interno. Terceirize a burocracia e foque no que você faz de melhor: entregar excelência.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href="#captacao" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl">
                  Falar com um Especialista
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </div>
              
              <div className="mt-12 flex items-center gap-6 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Conformidade Legal</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Aumento de Market Share</span>
                </div>
              </div>
            </div>
            
            {/* Form Section */}
            <div id="captacao" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Solicite uma Análise de Viabilidade</h3>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Corporativo</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input required type="text" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !cookieAccepted}
                  className="w-full mt-6 bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Quero Vender para o Governo'}
                </button>
                {!cookieAccepted && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    Aceite os termos de privacidade no banner abaixo para enviar.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {showChat ? (
          <ChatbotWidget onClose={() => setShowChat(false)} cookieAccepted={cookieAccepted} />
        ) : (
          <button 
            onClick={() => setShowChat(true)}
            className="w-14 h-14 bg-orange-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-orange-700 transition-transform hover:scale-105"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Cookie Banner */}
      {!cookieAccepted && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-300">
              <strong className="text-white">Aviso de Privacidade (LGPD):</strong> Utilizamos cookies essenciais e analíticos para melhorar sua experiência. Ao continuar navegando ou enviar seus dados, você concorda com nossa Política de Privacidade.
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={handleAcceptCookies} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors">
                Aceitar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatbotWidget({ onClose, cookieAccepted }: { onClose: () => void, cookieAccepted: boolean }) {
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
    { role: 'model', text: 'Olá! Sou o assistente virtual da VGS Licitações. Como posso ajudar sua empresa a vender para o governo hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      if (leadCaptured) {
        setMessages(prev => [...prev, { role: 'model', text: 'Obrigado! Um de nossos especialistas entrará em contato com você em breve.' }]);
        setIsTyping(false);
        return;
      }

      if (interactionCount >= 1) {
        // Time to ask for lead info
        const prompt = `O usuário disse: "${userMsg}". Responda de forma cordial, confirme que a VGS pode ajudar e peça os dados de contato (Nome, E-mail, Telefone, Empresa e CNPJ) para agendar uma reunião com um especialista humano. Seja persuasivo e breve.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-05-20',
          contents: prompt,
        });
        
        setMessages(prev => [...prev, { role: 'model', text: response.text || 'Poderia me informar seu Nome, E-mail, Telefone, Empresa e CNPJ para que um especialista entre em contato?' }]);
        setInteractionCount(prev => prev + 1);
        
        // If user provides data (simple heuristic: contains @ or numbers)
        if (userMsg.includes('@') || /\d{4,}/.test(userMsg)) {
          if (!cookieAccepted) {
            setMessages(prev => [...prev, { role: 'model', text: 'Por favor, aceite os termos de privacidade no banner inferior para podermos registrar seus dados.' }]);
          } else {
            // Save lead
            await addDoc(collection(db, 'leads'), {
              companyName: 'Lead via Chatbot',
              email: userMsg.includes('@') ? userMsg.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/)?.[0] || '' : '',
              phone: '',
              cnpj: '',
              source: 'Chatbot IA',
              status: 'Novos Leads',
              createdAt: serverTimestamp(),
              lastModifiedBy: 'system',
              osintData: `Dados extraídos do chat: ${userMsg}`
            });
            setLeadCaptured(true);
            setMessages(prev => [...prev, { role: 'model', text: 'Dados recebidos com sucesso! Nossa equipe entrará em contato.' }]);
          }
        }
      } else {
        // Normal chat
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash-preview-05-20',
          config: {
            systemInstruction: 'Você é um SDR (Sales Development Representative) da VGS Licitações. Seu objetivo é qualificar empresas que querem vender para o governo. Seja cordial, profissional e focado em mostrar o valor de terceirizar o departamento de licitações. Responda de forma concisa.'
          }
        });
        
        // Replay history
        for (const msg of messages.slice(1)) {
          await chat.sendMessage({ message: msg.text });
        }
        
        const response = await chat.sendMessage({ message: userMsg });
        setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
        setInteractionCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro na minha conexão.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[500px]">
      <div className="bg-blue-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-medium">Assistente VGS</span>
        </div>
        <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-900 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..." 
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2 text-sm outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white hover:bg-orange-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
