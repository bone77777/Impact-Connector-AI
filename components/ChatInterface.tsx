import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, MessageAuthor, ChatStep } from '../types';
import { BotIcon, UserIcon, ArrowLeftIcon, SendIcon } from './icons';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  onOptionSelect: (option: string) => void;
  onFreeTextSubmit: (text: string) => void;
  onGoBack: () => void;
  isThinking: boolean;
  currentChatStep: ChatStep | null;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.author === MessageAuthor.USER;
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white">
          <BotIcon className="w-6 h-6" />
        </div>
      )}
      <div className={`px-4 py-3 rounded-2xl max-w-sm md:max-w-md break-words ${isUser ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
        {message.text}
      </div>
       {isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-300">
          <UserIcon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatHistory, onOptionSelect, onFreeTextSubmit, onGoBack, isThinking, currentChatStep }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFreeTextMode, setIsFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  useEffect(() => {
    if (currentChatStep) {
      setIsFreeTextMode(false);
    }
  }, [currentChatStep]);
  
  useEffect(() => {
    if (isFreeTextMode) {
        inputRef.current?.focus();
    }
  }, [isFreeTextMode]);

  const handleFreeTextFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (freeText.trim() && !isThinking) {
      onFreeTextSubmit(freeText.trim());
      setFreeText('');
      setIsFreeTextMode(false);
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[80vh] animate-fade-in-up">
      <div className="relative p-4 border-b border-slate-200 dark:border-slate-700 text-center">
        <button onClick={onGoBack} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">'Aura'との対話</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">あなたの可能性を探りましょう</p>
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {chatHistory.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
        {isThinking && (
          <div className="flex items-start gap-3">
             <div className="w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white">
                <BotIcon className="w-6 h-6" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-bl-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        {currentChatStep && !isThinking ? (
            isFreeTextMode ? (
              <form onSubmit={handleFreeTextFormSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1 w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-slate-800 dark:text-slate-200"
                  disabled={isThinking}
                />
                <button 
                  type="submit" 
                  disabled={isThinking || !freeText.trim()}
                  className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors"
                >
                  <SendIcon className="w-6 h-6" />
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                  {currentChatStep.options.map((option, index) => (
                      <button
                          key={index}
                          onClick={() => onOptionSelect(option)}
                          disabled={isThinking}
                          className="w-full text-left bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold py-3 px-4 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                      >
                          {option}
                      </button>
                  ))}
                  <button
                    onClick={() => setIsFreeTextMode(true)}
                    disabled={isThinking}
                    className="w-full text-left bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold py-3 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                  >
                    その他（自由入力）
                  </button>
              </div>
            )
        ) : !isThinking && chatHistory.length > 0 ? (
          <p className="text-center text-slate-500">対話は終了しました。プランを作成してください。</p>
        ) : null}
      </div>
    </div>
  );
};
