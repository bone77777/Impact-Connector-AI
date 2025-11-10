import React, { useState } from 'react';
import { ContributionPlan, ActionStep, Opportunity, ActionType } from '../types';
import { findOrganizations, generateContactEmail, learnMoreAboutTopic, findEvents, draftProjectPlan } from '../services/geminiService';
import { 
  RedoIcon, SparklesIcon, TargetIcon, ClipboardCheckIcon, SearchIcon, MailIcon, 
  ExternalLinkIcon, ClipboardCopyIcon, BookOpenIcon, CalendarDaysIcon, DocumentTextIcon 
} from './icons';

interface ResultsDisplayProps {
  plan: ContributionPlan;
  onReset: () => void;
  userProfile: string;
}

const SectionCard: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({ title, children, icon, className }) => (
  <div className={`bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
      {icon && <span className="mr-3 text-indigo-500">{icon}</span>}
      {title}
    </h3>
    <div className="text-slate-600 dark:text-slate-300 space-y-4">
      {children}
    </div>
  </div>
);

const ActionModal: React.FC<{ title: string; content: React.ReactNode; onClose: () => void; isLoading: boolean }> = ({ title, content, onClose, isLoading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-6 overflow-y-auto">
        {isLoading ? (
            <div className="flex items-center justify-center h-48">
                <SparklesIcon className="w-10 h-10 text-indigo-500 animate-pulse" />
            </div>
        ) : content}
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-right">
        <button onClick={onClose} className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
          閉じる
        </button>
      </div>
    </div>
  </div>
);


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ plan, onReset, userProfile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const handleAction = async (item: ActionStep | Opportunity) => {
    if (!item.actionType || !item.actionParams) return;

    setModalTitle(item.title);
    setIsModalOpen(true);
    setIsLoadingAction(true);

    try {
      switch (item.actionType) {
        case 'find_organizations':
          const orgs = await findOrganizations(item.actionParams.query);
          setModalContent(<OrganizationList organizations={orgs} />);
          break;
        case 'draft_email':
          const emailText = await generateContactEmail(userProfile, item.actionParams.query);
          setModalContent(<EmailDraft emailText={emailText} />);
          break;
        case 'learn_more':
          const learnResult = await learnMoreAboutTopic(item.actionParams.query);
          setModalContent(<LearnMoreContent result={learnResult} />);
          break;
        case 'find_events':
          const events = await findEvents(item.actionParams.query);
          setModalContent(<EventList events={events} />);
          break;
        case 'draft_plan':
          const plan = await draftProjectPlan(item.actionParams.query);
          setModalContent(<PlanDraft plan={plan} />);
          break;
        default:
          throw new Error("未対応のアクションです。");
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : "不明なエラーが発生しました。";
      setModalContent(<p className="text-red-500">{error}</p>);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const actionButtonConfig: { [key in ActionType]: { label: string; icon: React.ReactNode } } = {
    find_organizations: {
      label: '団体を探す',
      icon: <SearchIcon className="w-4 h-4 mr-2" />,
    },
    draft_email: {
      label: '連絡メールを作成する',
      icon: <MailIcon className="w-4 h-4 mr-2" />,
    },
    learn_more: {
      label: '詳しく学ぶ',
      icon: <BookOpenIcon className="w-4 h-4 mr-2" />,
    },
    find_events: {
      label: 'イベントを探す',
      icon: <CalendarDaysIcon className="w-4 h-4 mr-2" />,
    },
    draft_plan: {
      label: '計画を立てる',
      icon: <DocumentTextIcon className="w-4 h-4 mr-2" />,
    },
  };
  
  const OrganizationList: React.FC<{ organizations: { name: string; description: string; url: string }[] }> = ({ organizations }) => (
    <div className="space-y-4">
      {organizations.length > 0 ? organizations.map((org, index) => (
        <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <a href={org.url} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
            {org.name} <ExternalLinkIcon className="w-4 h-4 ml-2" />
          </a>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{org.description}</p>
        </div>
      )) : <p>関連する団体が見つかりませんでした。</p>}
    </div>
  );

  const EmailDraft: React.FC<{ emailText: string }> = ({ emailText }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div>
        <div className="relative p-4 bg-slate-100 dark:bg-slate-900 rounded-lg whitespace-pre-wrap font-mono text-sm">
          <button onClick={handleCopy} className="absolute top-2 right-2 p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
             <ClipboardCopyIcon className="w-5 h-5" />
          </button>
          {emailText}
        </div>
        {copied && <p className="text-green-600 text-sm mt-2 text-right">コピーしました！</p>}
      </div>
    );
  };

  const LearnMoreContent: React.FC<{ result: { summary: string; keywords: string[] } }> = ({ result }) => (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{result.summary}</p>
      <div>
        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">関連キーワード</h4>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((keyword, index) => (
            <span key={index} className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full dark:bg-indigo-900 dark:text-indigo-200">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const EventList: React.FC<{ events: { name: string; date: string; url: string }[] }> = ({ events }) => (
    <div className="space-y-4">
      {events.length > 0 ? events.map((event, index) => (
        <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
            {event.name} <ExternalLinkIcon className="w-4 h-4 ml-2" />
          </a>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{event.date}</p>
        </div>
      )) : <p>関連するイベントは見つかりませんでした。</p>}
    </div>
  );

  const PlanDraft: React.FC<{ plan: { title: string; steps: string[] } }> = ({ plan }) => (
    <div className="space-y-4">
        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{plan.title}</h4>
        <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
            {plan.steps.map((step, index) => (
                <li key={index}>{step}</li>
            ))}
        </ul>
    </div>
  );


  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            {plan.planTitle}
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">{plan.summary}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <SectionCard title="あなたにおすすめの貢献活動" icon={<TargetIcon className="w-6 h-6" />}>
              <div className="space-y-6">
                    {plan.suggestedOpportunities.map((opp, index) => {
                      const actionConfig = opp.actionType ? actionButtonConfig[opp.actionType] : null;
                      return (
                        <div key={index} className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                            <div className="flex-grow">
                              <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{opp.title}</h4>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{opp.description}</p>
                              <div className="mt-3">
                                  <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">マッチするスキル</h5>
                                  <div className="flex flex-wrap gap-2">
                                      {opp.requiredSkills.map((skill, i) => (
                                          <span key={i} className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full dark:bg-indigo-900 dark:text-indigo-200">{skill}</span>
                                      ))}
                                  </div>
                              </div>
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 dark:border-green-600 rounded-r-md">
                                  <h5 className="font-semibold text-green-800 dark:text-green-200">期待されるインパクト</h5>
                                  <p className="text-sm text-green-700 dark:text-green-300">{opp.impactStatement}</p>
                              </div>
                            </div>
                            {actionConfig && opp.actionParams && (
                                <button
                                    onClick={() => handleAction(opp)}
                                    className="mt-4 w-full flex items-center justify-center px-3 py-2 text-sm font-bold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {actionConfig.icon}
                                    {actionConfig.label}
                                </button>
                            )}
                        </div>
                      );
                    })}
                </div>
            </SectionCard>
            
            <SectionCard title="Mood Board" icon={<SparklesIcon className="w-6 h-6" />} className="transform-none">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {plan.images.map((src, index) => (
                  <img key={index} src={src} alt={`Mood board image ${index + 1}`} className="rounded-lg object-cover w-full h-full aspect-square shadow-md" />
              ))}
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-1">
            <SectionCard title="Action Center: はじめの一歩" icon={<ClipboardCheckIcon className="w-6 h-6" />}>
              <div className="space-y-4">
                  {plan.firstSteps.map((step, index) => {
                    const actionConfig = step.actionType ? actionButtonConfig[step.actionType] : null;
                    return (
                      <div key={index} className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <strong className="text-slate-700 dark:text-slate-200">{index + 1}. {step.title}</strong>
                          <p className="text-sm mt-1 mb-3">{step.description}</p>
                          {actionConfig && step.actionParams && (
                              <button
                                  onClick={() => handleAction(step)}
                                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-bold text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                  {actionConfig.icon}
                                  {actionConfig.label}
                              </button>
                          )}
                      </div>
                    );
                  })}
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onReset}
            className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center mx-auto"
          >
            <RedoIcon className="w-5 h-5 mr-2" />
            もう一度探す
          </button>
        </div>
      </div>
      {isModalOpen && <ActionModal title={modalTitle} content={modalContent} onClose={() => setIsModalOpen(false)} isLoading={isLoadingAction} />}
    </>
  );
};