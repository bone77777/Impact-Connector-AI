import React, { useState, useCallback, useEffect } from 'react';
import { AppState, ChatMessage, ContributionPlan, MessageAuthor, ChatStep } from './types';
import { getNextChatStep, generateContributionPlan, generateImagesForPlan } from './services/geminiService';
import { ChatInterface } from './components/ChatInterface';
import { ResultsDisplay } from './components/ResultsDisplay';
import { SparklesIcon } from './components/icons';
import { OptionSelectionForm, FormState } from './components/OptionSelectionForm';

const ProcessingIndicator: React.FC = () => {
    const messages = [
        "あなたの可能性を分析しています...",
        "スキルと社会のニーズを繋いでいます...",
        "最適なマッチングを探しています...",
        "インパクトの種を見つけています..."
    ];
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(prev => {
                const currentIndex = messages.indexOf(prev);
                return messages[(currentIndex + 1) % messages.length];
            });
        }, 2500);
        return () => clearInterval(interval);
    }, []);


    return (
        <div className="text-center p-8 animate-fade-in">
             <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-500/30 rounded-full animate-ping"></div>
                <div className="relative w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-12 h-12 text-indigo-500 animate-pulse" />
                </div>
            </div>
            <p className="text-xl text-slate-700 dark:text-slate-300 transition-opacity duration-500">{message}</p>
        </div>
    );
};


function App() {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [contributionPlan, setContributionPlan] = useState<ContributionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showFinalizeButton, setShowFinalizeButton] = useState(false);
  const [userProfile, setUserProfile] = useState<string>('');
  const [initialFormState, setInitialFormState] = useState<FormState | null>(null);
  const [currentChatStep, setCurrentChatStep] = useState<ChatStep | null>(null);

  const resetState = () => {
    setAppState(AppState.INITIAL);
    setChatHistory([]);
    setContributionPlan(null);
    setError(null);
    setIsThinking(false);
    setShowFinalizeButton(false);
    setUserProfile('');
    setInitialFormState(null);
    setCurrentChatStep(null);
  };
  
  const handleGoBack = () => {
    setAppState(AppState.INITIAL);
    setChatHistory([]);
    setCurrentChatStep(null);
    setShowFinalizeButton(false);
  };

  const handleInitialSubmit = async (formState: FormState) => {
    setIsThinking(true);
    setAppState(AppState.CHATTING);
    setInitialFormState(formState);
    
    let profileText = "私の情報です。\n";
    if (formState.skills.length > 0) profileText += `- スキル: ${formState.skills.join(', ')}\n`;
    if (formState.interests.length > 0) profileText += `- 興味・関心: ${formState.interests.join(', ')}\n`;
    if (formState.styles.length > 0) profileText += `- 希望する活動スタイル: ${formState.styles.join(', ')}\n`;
    if (formState.freeText) profileText += `- その他: ${formState.freeText}\n`;
    setUserProfile(profileText);

    const initialPrompt = profileText + "これらの情報をもとに、私にできそうな社会貢献について質問を始めてください。";
    const firstUserMessage: ChatMessage = { author: MessageAuthor.USER, text: initialPrompt };
    const initialHistory = [firstUserMessage];
    setChatHistory(initialHistory);

    try {
      const chatStep = await getNextChatStep(initialHistory);
      const auraMessage: ChatMessage = { author: MessageAuthor.AURA, text: chatStep.question };
      setChatHistory(prev => [...prev, auraMessage]);
      setCurrentChatStep(chatStep);
      if (chatStep.isFinal) {
        setShowFinalizeButton(true);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setIsThinking(false);
    }
  };
  
  const handleFinalize = useCallback(async () => {
    setAppState(AppState.PROCESSING);
    try {
      const planData = await generateContributionPlan(chatHistory);
      const images = await generateImagesForPlan(planData.moodboardPrompt);
      
      setContributionPlan({ ...planData, images });
      setAppState(AppState.RESULTS);
    } catch(e) {
      handleError(e);
    }
  }, [chatHistory]);

  const handleError = (e: unknown) => {
    if (e instanceof Error) {
        setError(e.message);
    } else {
        setError("不明なエラーが発生しました。");
    }
    setAppState(AppState.ERROR);
  }
  
  const handleUserResponse = useCallback(async (responseText: string, isFinalizingAction: boolean) => {
    setIsThinking(true);
    setCurrentChatStep(null);

    const newUserMessage: ChatMessage = { author: MessageAuthor.USER, text: responseText };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);

    if (isFinalizingAction) {
      handleFinalize();
      return;
    }

    try {
      const nextStep = await getNextChatStep(updatedHistory);
      const auraMessage: ChatMessage = { author: MessageAuthor.AURA, text: nextStep.question };
      setChatHistory(prev => [...prev, auraMessage]);
      setCurrentChatStep(nextStep);
      if (nextStep.isFinal) {
        setShowFinalizeButton(true);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setIsThinking(false);
    }
  }, [chatHistory, handleFinalize]);

  const handleOptionSelect = (option: string) => {
    handleUserResponse(option, showFinalizeButton);
  };

  const handleFreeTextSubmit = (text: string) => {
    handleUserResponse(text, false);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.INITIAL:
        return <OptionSelectionForm onSubmit={handleInitialSubmit} isLoading={isThinking} initialState={initialFormState} />;
      case AppState.CHATTING:
        return <ChatInterface 
                  chatHistory={chatHistory} 
                  onOptionSelect={handleOptionSelect}
                  onFreeTextSubmit={handleFreeTextSubmit}
                  isThinking={isThinking} 
                  currentChatStep={currentChatStep}
                  onGoBack={handleGoBack}
                />;
      case AppState.PROCESSING:
        return <ProcessingIndicator />;
      case AppState.RESULTS:
        return contributionPlan && <ResultsDisplay plan={contributionPlan} onReset={resetState} userProfile={userProfile} />;
      case AppState.ERROR:
        return (
          <div className="text-center p-8 max-w-lg mx-auto bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">エラーが発生しました</h2>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button onClick={resetState} className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 transition-colors">もう一度試す</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 bg-[radial-gradient(circle_at_top,_#d1d5db1a_0%,_transparent_50%)] dark:bg-[radial-gradient(circle_at_top,_#4f46e533_0%,_transparent_40%)]">
      {renderContent()}
    </main>
  );
}

export default App;