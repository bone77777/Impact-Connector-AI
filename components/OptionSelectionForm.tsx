import React, { useState, useMemo, useEffect } from 'react';
import { SKILL_OPTIONS, INTEREST_OPTIONS, STYLE_OPTIONS, UNKNOWN_OPTION } from '../constants';
import { SparklesIcon, CheckIcon } from './icons';

export interface FormState {
  skills: string[];
  interests: string[];
  styles: string[];
  freeText: string;
}

interface OptionSelectionFormProps {
  onSubmit: (formState: FormState) => void;
  isLoading: boolean;
  initialState?: FormState | null;
}

const OptionButton: React.FC<{
  label: string;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ label, isSelected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative p-3 pl-4 pr-8 text-sm font-medium border rounded-full transition-all duration-200 flex-shrink-0 ${
        isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
    >
      {label}
      {isSelected && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 rounded-full">
          <CheckIcon className="w-5 h-5 text-white" />
        </span>
      )}
    </button>
  );
};

const OptionsSection: React.FC<{
  title: string;
  options: string[];
  selectedOptions: string[];
  onToggle: (option: string) => void;
}> = ({ title, options, selectedOptions, onToggle }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <OptionButton
          key={option}
          label={option}
          isSelected={selectedOptions.includes(option)}
          onToggle={() => onToggle(option)}
        />
      ))}
    </div>
  </div>
);

export const OptionSelectionForm: React.FC<OptionSelectionFormProps> = ({ onSubmit, isLoading, initialState }) => {
  const [formState, setFormState] = useState<FormState>(initialState || {
    skills: [],
    interests: [],
    styles: [],
    freeText: '',
  });

  useEffect(() => {
    if (initialState) {
        setFormState(initialState);
    }
  }, [initialState]);

  const handleToggle = (category: keyof Omit<FormState, 'freeText'>, value: string) => {
    setFormState((prev) => {
      const currentValues = prev[category];
      let newValues: string[];

      if (value === UNKNOWN_OPTION) {
        newValues = currentValues.includes(UNKNOWN_OPTION) ? [] : [UNKNOWN_OPTION];
      } else {
        const filteredValues = currentValues.filter(v => v !== UNKNOWN_OPTION);
        if (filteredValues.includes(value)) {
          newValues = filteredValues.filter(v => v !== value);
        } else {
          newValues = [...filteredValues, value];
        }
      }
      return { ...prev, [category]: newValues };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  const isSubmittable = useMemo(() => {
    return formState.skills.length > 0 || formState.interests.length > 0 || formState.styles.length > 0 || formState.freeText.trim() !== '';
  }, [formState]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-10 h-10 text-indigo-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            あなたの貢献のカタチを見つけよう
        </h1>
        <p className="text-md text-slate-600 dark:text-slate-400 mt-2">
            あなたのスキルや興味を選択して、AIにぴったりの活動を提案してもらいましょう。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <OptionsSection
          title="あなたのスキル"
          options={SKILL_OPTIONS}
          selectedOptions={formState.skills}
          onToggle={(option) => handleToggle('skills', option)}
        />
        <OptionsSection
          title="関心のある分野"
          options={INTEREST_OPTIONS}
          selectedOptions={formState.interests}
          onToggle={(option) => handleToggle('interests', option)}
        />
        <OptionsSection
          title="希望する貢献スタイル"
          options={STYLE_OPTIONS}
          selectedOptions={formState.styles}
          onToggle={(option) => handleToggle('styles', option)}
        />
        
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">その他（自由記述）</h3>
            <textarea
                value={formState.freeText}
                onChange={(e) => setFormState(prev => ({...prev, freeText: e.target.value}))}
                placeholder="選択肢にないスキルや、具体的な希望があれば入力してください。"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-slate-800 dark:text-slate-200"
                rows={3}
                disabled={isLoading}
            />
        </div>

        <div className="text-center pt-4">
            <button 
                type="submit" 
                className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                disabled={!isSubmittable || isLoading}
            >
                {isLoading ? '準備中...' : '貢献プランの作成を開始'}
            </button>
        </div>
      </form>
    </div>
  );
};