import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Send, MessageCircle } from 'lucide-react';
import { AppUser } from '../types';

export default function ChatBox({ currentUser }: { currentUser: AppUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const assistenciaId = currentUser.assistenciaId || 'global';
  const isFirstLoad = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const newIsAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(newIsAtBottom);
        isAtBottomRef.current = newIsAtBottom;
        if (newIsAtBottom) {
            setUnreadCount(0);
        }
    }
  };

  useEffect(() => {
    if (isOpen && isAtBottom && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isAtBottom]);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${assistenciaId}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (!isFirstLoad.current) {
            if (!isOpen) {
                setHasUnread(true);
            } else if (!isAtBottomRef.current) {
                setUnreadCount(prev => prev + snapshot.docChanges().filter(change => change.type === 'added').length);
            }
        }
        
        isFirstLoad.current = false;
        setMessages(msgs);
    });
    return () => unsubscribe();
  }, [assistenciaId, isOpen]);

  const sendMessage = async () => {
    if (newMessage.trim()) {
      await addDoc(collection(db, `chats/${assistenciaId}/messages`), {
        text: newMessage,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'text-red-500';
      case 'ATENDENTE': return 'text-blue-500';
      case 'TECNICO': return 'text-green-500';
      default: return 'text-neutral-500';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="relative w-[320px] h-[500px] mb-2 bg-white dark:bg-neutral-800 rounded-lg shadow-2xl flex flex-col border dark:border-neutral-700 overflow-hidden animate-fadeIn">
          <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-700 border-b dark:border-neutral-700">
            <h2 className="font-bold text-neutral-900 dark:text-white text-sm">Chat da Empresa</h2>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef} onScroll={handleScroll}>
            {messages.map((m) => (
              <div key={m.id} className={m.senderId === currentUser.id ? 'text-right' : ''}>
                <div className="inline-block p-2 rounded text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-600">
                  <div className={`block font-bold mb-0.5 ${getRoleColor(m.senderRole)}`}>{m.senderName}</div>
                  <div className="block">{m.text}</div>
                </div>
              </div>
            ))}
            {unreadCount > 0 && (
                <div className="absolute bottom-20 right-4 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg text-xs" onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}>
                    +{unreadCount}
                </div>
            )}
          </div>
          <div className="p-3 border-t dark:border-neutral-700 flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="border p-2 flex-1 rounded text-sm dark:bg-neutral-900 dark:text-white"
              placeholder="Mensagem..."
            />
            <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasUnread(false);
          }}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 relative w-12 h-12"
          title="Chat com usuários da empresa"
        >
          <MessageCircle className="w-5 h-5" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-800 animate-pulse" />
          )}
        </button>
      )}
    </div>
  );
}
