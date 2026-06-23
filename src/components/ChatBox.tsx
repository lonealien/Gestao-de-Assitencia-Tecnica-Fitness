import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, collectionGroup } from 'firebase/firestore';
import { X, Send, MessageCircle, Users, User, ChevronLeft, Bell } from 'lucide-react';
import { AppUser } from '../types';

type ChatRecipient = { id: string; name: string; role: string; lastSeen?: number } | 'GERAL';

export default function ChatBox({ currentUser }: { currentUser: AppUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [recipient, setRecipient] = useState<ChatRecipient>('GERAL');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [notification, setNotification] = useState<{ senderId: string; senderName: string; text: string; role: string } | null>(null);
  
  const [unreadGeneral, setUnreadGeneral] = useState(false);
  const [unreadPMs, setUnreadPMs] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const assistenciaId = currentUser.assistenciaId || 'global';
  const isFirstLoad = useRef(true);
  const isFirstLoadGlobalGeneral = useRef(true);
  const isFirstLoadGlobalPM = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const recipientRef = useRef<ChatRecipient>('GERAL');
  const notifiedPMIdsRef = useRef<Set<string>>(new Set());
  const notifiedGeneralIdsRef = useRef<Set<string>>(new Set());
  const userSentMessageRef = useRef(false);

  // Sync isOpen state to ref and reset atScroll default
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setIsAtBottom(true);
      isAtBottomRef.current = true;
    }
  }, [isOpen]);

  // Sync recipient state to ref for snapshot callback
  useEffect(() => {
    recipientRef.current = recipient;
    setMessages([]);
    setUnreadCount(0);
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    userSentMessageRef.current = false;
  }, [recipient]);

  // Global Private Message Listener for Notifications
  useEffect(() => {
    isFirstLoadGlobalPM.current = true;
    const q = query(
      collectionGroup(db, 'messages'),
      where('recipientId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstLoadGlobalPM.current) {
        isFirstLoadGlobalPM.current = false;
        snapshot.docs.forEach(doc => {
          notifiedPMIdsRef.current.add(doc.id);
        });
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          if (notifiedPMIdsRef.current.has(docId)) {
            return;
          }
          notifiedPMIdsRef.current.add(docId);

          const data = change.doc.data();
          const currentRecipient = recipientRef.current;
          const isCurrentlyTalkingToSender = currentRecipient !== 'GERAL' && currentRecipient.id === data.senderId;
          
          if (!isOpenRef.current || !isCurrentlyTalkingToSender) {
            setUnreadPMs(prev => Array.from(new Set([...prev, data.senderId])));
            setNotification({
              senderId: data.senderId,
              senderName: data.senderName || 'Usuário',
              text: data.text || '',
              role: data.senderRole || 'USER'
            });
          }
        }
      });
    }, (error) => {
      console.error('PM Notification Listener Error:', error);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Global General Message Listener
  useEffect(() => {
    isFirstLoadGlobalGeneral.current = true;
    const q = query(
      collection(db, `chats/${assistenciaId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstLoadGlobalGeneral.current) {
        isFirstLoadGlobalGeneral.current = false;
        snapshot.docs.forEach(doc => {
          notifiedGeneralIdsRef.current.add(doc.id);
        });
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          if (notifiedGeneralIdsRef.current.has(docId)) {
            return;
          }
          notifiedGeneralIdsRef.current.add(docId);

          const data = change.doc.data();
          if (data.senderId !== currentUser.id) {
            const currentRecipient = recipientRef.current;
            if (!isOpenRef.current || currentRecipient !== 'GERAL') {
              setUnreadGeneral(true);
            }
          }
        }
      });
    }, (error) => {
      console.error('General Notification Listener Error:', error);
    });

    return () => unsubscribe();
  }, [assistenciaId, currentUser.id]);

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
    if (isOpen && scrollRef.current) {
        // Use a timeout to ensure the DOM has rendered the new messages
        const timeoutId = setTimeout(() => {
          if (!scrollRef.current) return;
          const lastMessage = messages[messages.length - 1];
          const isFromMe = lastMessage && lastMessage.senderId === currentUser.id;
          
          if (isAtBottomRef.current || isFromMe || userSentMessageRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              if (isFromMe || userSentMessageRef.current) {
                  userSentMessageRef.current = false;
              }
          }
        }, 50);
        return () => clearTimeout(timeoutId);
    }
  }, [messages, isOpen, currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      if (recipient === 'GERAL') {
        setUnreadGeneral(false);
      } else {
        setUnreadPMs(prev => prev.filter(id => id !== recipient.id));
        if (notification && notification.senderId === recipient.id) {
          setNotification(null);
        }
      }
      if (isAtBottom) {
        setUnreadCount(0);
      }
    }
  }, [isOpen, messages, recipient, notification, isAtBottom]);

  useEffect(() => {
    setUnreadCount(0);
  }, [recipient, isOpen]);

  useEffect(() => {
    if (recipient !== 'GERAL' && notification && recipient.id === notification.senderId) {
      setNotification(null);
    }
  }, [recipient, notification]);

  useEffect(() => {
    let isFirst = true;
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
      if (!isFirst && newMessages.length > 0) {
        // Only count unread if the message is from someone else
        const fromOthers = newMessages.some(change => change.doc.data().senderId !== currentUser.id);
        if (fromOthers) {
          if (isOpen && !isAtBottomRef.current) {
            setUnreadCount(prev => prev + newMessages.filter(c => c.doc.data().senderId !== currentUser.id).length);
          }
        }
      }
      
      isFirst = false;
      setMessages(msgs);
    }, (error) => {
      console.error('Chat Messages Listener Error:', error);
    });
    return () => unsubscribe();
  }, [assistenciaId, isOpen, recipient]);

  const sendMessage = async () => {
    if (newMessage.trim()) {
      let chatPath = `chats/${assistenciaId}/messages`;
      const msgData: any = {
        text: newMessage,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        createdAt: serverTimestamp()
      };

      if (recipient !== 'GERAL') {
        const ids = [currentUser.id, recipient.id].sort();
        chatPath = `chats/${assistenciaId}/private/${ids[0]}_${ids[1]}/messages`;
        msgData.recipientId = recipient.id; // Added for global listener
      }

      userSentMessageRef.current = true;
      
      const tempMsg = newMessage;
      setNewMessage('');

      await addDoc(collection(db, chatPath), msgData);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
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

  const openPrivateChat = (user: any) => {
    setRecipient(user);
    setIsOpen(true);
    setShowUserList(false);
    setNotification(null);
    setUnreadPMs(prev => prev.filter(id => id !== user.id));
  };

  const handleSelectRecipient = (r: ChatRecipient) => {
    setRecipient(r);
    setShowUserList(false);
    if (r === 'GERAL') {
      setUnreadGeneral(false);
    } else {
      setUnreadPMs(prev => prev.filter(id => id !== r.id));
      if (notification && notification.senderId === r.id) {
        setNotification(null);
      }
    }
  };

  // Close chat when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 translate-y-0">
      {/* PM Notification Toast */}
      {notification && !isOpen && (
        <div 
          onClick={() => openPrivateChat({ id: notification.senderId, name: notification.senderName, role: notification.role })}
          className="bg-white dark:bg-neutral-800 border-2 border-blue-500 shadow-2xl rounded-2xl p-4 w-72 cursor-pointer animate-slideInRight hover:scale-105 transition-all group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg text-blue-600">
                <Bell size={16} className="animate-bounce" />
              </div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">Nova Mensagem Privada</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setNotification(null); }}
              className="text-neutral-400 hover:text-neutral-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-neutral-100 dark:bg-neutral-700 p-2 rounded-xl">
              <User size={20} className="text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{notification.senderName}</p>
              <p className="text-xs text-neutral-500 truncate line-clamp-1 italic">"{notification.text}"</p>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Clique para responder <ChevronLeft size={10} className="rotate-180" />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="relative w-[320px] h-[500px] bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl flex flex-col border dark:border-neutral-700 overflow-hidden animate-fadeIn">
          <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-700 border-b dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowUserList(!showUserList)} 
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                title="Trocar chat"
              >
                {showUserList ? <ChevronLeft size={18} /> : <Users size={18} />}
              </button>
              <h2 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-1">
                {showUserList ? 'Chat Com...' : (
                  recipient === 'GERAL' ? (
                    <>
                      Chat Geral
                      {notification && (
                        <button 
                          onClick={() => openPrivateChat({ id: notification.senderId, name: notification.senderName, role: notification.role })}
                          className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full animate-pulse ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                        >
                          +1 {notification.senderName}
                        </button>
                      )}
                    </>
                  ) : recipient.name
                )}
              </h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <X size={18} />
            </button>
          </div>

          {showUserList ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                onClick={() => handleSelectRecipient('GERAL')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${recipient === 'GERAL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
              >
                <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 p-2 rounded-lg">
                  <Users size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold flex items-center gap-2">
                    Geral / Todos
                    {unreadGeneral && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full" title="Novas mensagens" />
                    )}
                  </div>
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
                    onClick={() => handleSelectRecipient(u)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${recipient !== 'GERAL' && recipient.id === u.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                  >
                    <div className="relative">
                      <div className="bg-neutral-100 dark:bg-neutral-700 p-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
                        <User size={16} />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold flex items-center gap-2">
                        {u.name}
                        {unreadPMs.includes(u.id) && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Nova mensagem privada" />
                        )}
                      </div>
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
          }}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center hover:scale-110 active:scale-90 relative w-14 h-14"
          title="Chat com usuários da empresa"
        >
          <MessageCircle className="w-6 h-6" />
          {(unreadGeneral || unreadPMs.length > 0 || unreadCount > 0) && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-neutral-800 animate-pulse flex items-center justify-center" />
          )}
        </button>
      )}
    </div>
  );
}
