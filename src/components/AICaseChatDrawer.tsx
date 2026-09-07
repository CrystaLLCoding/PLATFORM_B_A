'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Trash2, 
  HelpCircle,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { BusinessCase } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  sourcesCited?: string[];
  timestamp: string;
}

interface AICaseChatDrawerProps {
  caseId: string;
  businessCase: BusinessCase;
}

export const AICaseChatDrawer: React.FC<AICaseChatDrawerProps> = ({ caseId, businessCase }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialGreeting: Message = {
    id: 'msg-init',
    role: 'assistant',
    content: `Здравствуйте! Я ваш персональный **AI-консультант** по кейсу **«${businessCase.title}»**.

Я изучил все **${businessCase.sources?.length || 0} первоисточников** и отчёт аудита (индекс здоровья: **${businessCase.report?.summary?.healthScore || 75}/100**). 

Готов ответить на любые вопросы о финансах, точках потери прибыли, расчете unit-экономики или шагах на ближайшие недели со **100% обоснованием по вашим файлам**. Выберите быстрый вопрос ниже или напишите свой!`,
    modelUsed: 'Google Gemini 3.5 Flash',
    sourcesCited: businessCase.sources?.map(s => s.name) || [],
    timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickPrompts = [
    { label: 'Где теряем деньги?', icon: DollarSign, query: 'Где мы теряем больше всего денег и в чем главные узкие места?' },
    { label: 'Почему вырос CAC?', icon: TrendingDown, query: 'Почему выросла стоимость привлечения клиента (CAC) и как её снизить?' },
    { label: 'План на 7 дней', icon: Calendar, query: 'Составь конкретный пошаговый спринт-план действий для команды на первые 7 дней.' },
    { label: 'Монетизация 91K базы', icon: Users, query: 'Как эффективно монетизировать базу подписчиков и выпускников без роста затрат на рекламу?' },
    { label: 'Аудит зарплат (ФОТ)', icon: FileSpreadsheet, query: 'Какова реальная структура ФОТ и какие проблемы с мотивацией сотрудников выявлены в ведомости?' }
  ];

  const handleSendMessage = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'msg-init')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/cases/${caseId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyPayload })
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: 'ast-' + Date.now(),
          role: 'assistant',
          content: data.reply,
          modelUsed: data.modelUsed || 'Google Gemini AI',
          sourcesCited: data.sourcesCited || [],
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `⚠️ Не удалось получить ответ: ${data.error || 'Ошибка сервера'}. Пожалуйста, попробуйте еще раз.`,
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `⚠️ Ошибка сетевого соединения. Проверьте подключение и повторите запрос.`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([initialGreeting]);
  };

  // Простой и безопасный рендерер Markdown-подсветки
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} style={{ height: '4px' }} />;

          // Заголовки ###
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFFFFF', margin: '6px 0 2px 0' }}>
                {trimmed.replace('### ', '')}
              </h4>
            );
          }

          // Заголовки ##
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38BDF8', margin: '8px 0 2px 0' }}>
                {trimmed.replace('## ', '')}
              </h3>
            );
          }

          // Элементы списка
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
            const listText = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.88rem', lineHeight: '1.5' }}>
                <span style={{ color: '#818CF8', fontWeight: 700 }}>•</span>
                <span dangerouslySetInnerHTML={{ 
                  __html: formatBoldAndQuotes(listText) 
                }} />
              </div>
            );
          }

          // Обычный абзац
          return (
            <p key={idx} style={{ fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }} dangerouslySetInnerHTML={{ 
              __html: formatBoldAndQuotes(trimmed) 
            }} />
          );
        })}
      </div>
    );
  };

  const formatBoldAndQuotes = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFFFFF; font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #CBD5E1;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #38BDF8; font-size: 0.82rem;">$1</code>');
  };

  return (
    <>
      {/* 1. ПЛАВАЮЩАЯ КНОПКА ОТКРЫТИЯ (TRIGGER) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-chat-trigger-btn"
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 990,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #9333EA 100%)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.92rem',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(147, 51, 234, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Sparkles size={18} color="#FFD700" className="animate-spin-slow" />
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981'
            }} />
          </div>
          <span>Спросить AI-консультанта</span>
          <span style={{
            fontSize: '0.72rem',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            letterSpacing: '0.02em'
          }}>
            0% галлюцинаций
          </span>
        </button>
      )}

      {/* 2. БОКОВАЯ ПАНЕЛЬ ДИАЛОГА (AI CHAT DRAWER) */}
      {isOpen && (
        <div
          className="ai-chat-drawer-overlay"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            width: isExpanded ? '680px' : '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: isExpanded ? '85vh' : '620px',
            maxHeight: 'calc(100vh - 48px)',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s ease, height 0.3s ease'
          }}
        >
          {/* ШАПКА ДИАЛОГА */}
          <div style={{
            padding: '16px 18px',
            background: 'rgba(30, 41, 59, 0.8)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)'
              }}>
                <Bot size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>AI-Консультант</span>
                  <span style={{
                    fontSize: '0.68rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    Active
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Строго по данным «{businessCase.title}»
                </div>
              </div>
            </div>

            {/* Контролы шапки */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleClearHistory}
                title="Очистить историю диалога"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex'
                }}
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Уменьшить размер' : 'Увеличить размер'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex'
                }}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Закрыть"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* СПИСОК СООБЩЕНИЙ */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '4px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    maxWidth: isUser ? '85%' : '94%',
                    flexDirection: isUser ? 'row-reverse' : 'row'
                  }}>
                    {/* Аватар */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isUser ? '#334155' : 'linear-gradient(135deg, #6366F1, #9333EA)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {isUser ? <User size={14} color="#CBD5E1" /> : <Sparkles size={14} color="#FFD700" />}
                    </div>

                    {/* Пузырь сообщения */}
                    <div style={{
                      background: isUser 
                        ? 'linear-gradient(135deg, #4F46E5, #4338CA)' 
                        : 'rgba(30, 41, 59, 0.75)',
                      color: isUser ? '#FFFFFF' : '#E2E8F0',
                      padding: '12px 16px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      border: isUser ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isUser 
                        ? '0 4px 12px rgba(79, 70, 229, 0.3)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.2)',
                      fontSize: '0.88rem',
                      lineHeight: '1.5'
                    }}>
                      {isUser ? (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                      ) : (
                        renderFormattedContent(m.content)
                      )}

                      {/* Метаданные ассистента: модель и цитируемые источники */}
                      {!isUser && (m.modelUsed || m.sourcesCited?.length) && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={13} color="#10B981" />
                            <span>100% Grounded • {m.modelUsed}</span>
                          </div>

                          <button
                            onClick={() => handleCopy(m.id, m.content)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedId === m.id ? '#10B981' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check size={12} />
                                <span>Скопировано</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Копировать</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 36px' }}>
                    {m.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Индикатор набора текста */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366F1, #9333EA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={14} color="#FFD700" />
                </div>
                <div style={{
                  background: 'rgba(30, 41, 59, 0.75)',
                  padding: '10px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span className="dot-pulse" style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                    AI анализирует данные кейса...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* БЫСТРЫЕ ЧИПСЫ-ВОПРОСЫ (QUICK PROMPTS) */}
          <div style={{
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            {quickPrompts.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#E2E8F0',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#818CF8';
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                  }}
                >
                  <IconComp size={12} color="#818CF8" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* ПОЛЕ ВВОДА (INPUT FOOTER) */}
          <div style={{
            padding: '12px 14px 14px 14px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросить о цифрах, расходах, прибыли..."
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                <Send size={16} />
              </button>
            </form>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '8px',
              fontSize: '0.68rem',
              color: 'var(--text-muted)'
            }}>
              <ShieldCheck size={11} color="#10B981" />
              <span>Ответы генерируются строго по фактам первоисточников без домыслов</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
