import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit } from 'firebase/firestore';
import { X, Send, MessageCircle, Users, User, ChevronLeft } from 'lucide-react';
import { AppUser } from '../types';

type ChatRecipient = { id: string; name: string; role: string; lastSeen?: number } | 'GERAL';

export default function ChatBox({ currentUser }: { currentUser: AppUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [recipient, setRecipient] = useState<ChatRecipient>('GERAL');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  
  const isAtBottomRef = useRef(true);
  const assistenciaId = currentUser.assistenciaId || 'global';
  const isFirstLoad = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recipientRef = useRef<ChatRecipient>('GERAL');

  // Sync recipient state to ref for snapshot callback
  useEffect(() => {
    recipientRef.current = recipient;
    setMessages([]);
    isFirstLoad.current = true;
    setUnreadCount(0);
  }, [recipient]);

  // Handle Online Users syncing
  useEffect(() => {
    const q = query(
      collection(db, 'usuarios'),
      where('assistenciaId', '==', assistenciaId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(u => u.id !== currentUser.id && (u.lastSeen || 0) > fiveMinutesAgo);
      setOnlineUsers(users);
    });
    return () => unsubscribe();
  }, [assistenciaId, currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setUnreadCount(0);
    }
  }, [isOpen, recipient]);

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
    let chatPath = `chats/${assistenciaId}/messages`;
    if (recipient !== 'GERAL') {
      const ids = [currentUser.id, recipient.id].sort();
      chatPath = `chats/${assistenciaId}/private/${ids[0]}_${ids[1]}/messages`;
    }

    const q = query(
      collection(db, chatPath),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const newMessages = snapshot.docChanges().filter(change => change.type === 'added');
      if (!isFirstLoad.current && newMessages.length > 0) {
        // Only count unread if the message is from someone else
        const fromOthers = newMessages.some(change => change.doc.data().senderId !== currentUser.id);
        if (fromOthers) {
          if (!isOpen) {
            setHasUnread(true);
          } else if (!isAtBottomRef.current) {
            setUnreadCount(prev => prev + newMessages.filter(c => c.doc.data().senderId !== currentUser.id).length);
          }
        }
      }
      
      isFirstLoad.current = false;
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [assistenciaId, isOpen, recipient]);

  const sendMessage = async () => {
    if (newMessage.trim()) {
      let chatPath = `chats/${assistenciaId}/messages`;
      if (recipient !== 'GERAL') {
        const ids = [currentUser.id, recipient.id].sort();
        chatPath = `chats/${assistenciaId}/private/${ids[0]}_${ids[1]}/messages`;
      }

      await addDoc(collection(db, chatPath), {
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
        <div className="relative w-[320px] h-[500px] mb-2 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl flex flex-col border dark:border-neutral-700 overflow-hidden animate-fadeIn">
          <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-700 border-b dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowUserList(!showUserList)} 
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                title="Trocar chat"
              >
                {showUserList ? <ChevronLeft size={18} /> : <Users size={18} />}
              </button>
              <h2 className="font-bold text-neutral-900 dark:text-white text-sm">
                {showUserList ? 'Chat Com...' : (recipient === 'GERAL' ? 'Chat Geral' : recipient.name)}
              </h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <X size={18} />
            </button>
          </div>

          {showUserList ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                onClick={() => { setRecipient('GERAL'); setShowUserList(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${recipient === 'GERAL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
              >
                <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-2 rounded-lg">
                  <Users size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">Geral / Todos</div>
                  <div className="text-[10px] text-neutral-500">Conversa com a oficina</div>
                </div>
              </button>
              
              <div className="px-3 py-2 mt-2">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Usuários Online</span>
              </div>

              {onlineUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 italic">Ninguém online no momento</div>
              ) : (
                onlineUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => { setRecipient(u); setShowUserList(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${recipient !== 'GERAL' && recipient.id === u.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                  >
                    <div className="relative">
                      <div className="bg-neutral-100 dark:bg-neutral-700 p-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
                        <User size={16} />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold">{u.name}</div>
                      <div className={`text-[10px] font-bold ${getRoleColor(u.role)}`}>{u.role}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef} onScroll={handleScroll}>
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2 opacity-50">
                    <MessageCircle size={32} />
                    <p className="text-xs">Nenhuma mensagem ainda</p>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={m.senderId === currentUser.id ? 'text-right' : ''}>
                    <div className={`inline-block p-2 rounded-xl text-xs shadow-sm ${m.senderId === currentUser.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-tl-none border border-neutral-200 dark:border-neutral-600'}`}>
                      {m.senderId !== currentUser.id && recipient === 'GERAL' && (
                        <div className={`block font-bold mb-0.5 ${getRoleColor(m.senderRole)}`}>{m.senderName}</div>
                      )}
                      <div className="block whitespace-pre-wrap">{m.text}</div>
                    </div>
                  </div>
                ))}
                {unreadCount > 0 && (
                    <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                      <button 
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-full cursor-pointer shadow-lg text-[10px] font-bold pointer-events-auto flex items-center gap-1 hover:scale-105 active:scale-95 transition-all" 
                        onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                      >
                        Novas Mensagens (+{unreadCount})
                      </button>
                    </div>
                )}
              </div>
              <div className="p-3 border-t dark:border-neutral-700 flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="border dark:border-neutral-600 p-2 flex-1 rounded-xl text-sm dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mensagem..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasUnread(false);
          }}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center hover:scale-110 active:scale-90 relative w-14 h-14"
          title="Chat com usuários da empresa"
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-neutral-800 animate-pulse flex items-center justify-center" />
          )}
        </button>
      )}
    </div>
  );
}
