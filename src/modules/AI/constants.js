import { MessageSquare, Briefcase, Brain, User as UserIcon } from 'lucide-react';

export const ROUNDS = [
  { id: 1, title: 'Communication', path: 'communication', icon: MessageSquare, color: 'blue', description: 'Evaluate soft skills and situational judgment.' },
  { id: 2, title: 'Technical', path: 'technical', icon: Briefcase, color: 'purple', description: 'Test technical depth and problem-solving.' },
  { id: 3, title: 'Aptitude', path: 'aptitude', icon: Brain, color: 'emerald', description: 'Logical reasoning and numerical puzzles.' },
  { id: 4, title: 'HR/Management', path: 'hr-management', icon: UserIcon, color: 'orange', description: 'Culture fit and career alignment.' }
];

export const TOPIC_SUGGESTIONS = {
  1: ['Professional Introduction', 'Conflict Resolution', 'Team Collaboration', 'Leadership', 'Client Communication'],
  2: ['Frontend Development', 'Backend Architecture', 'Database Design', 'Cloud Computing', 'System Design'],
  3: ['Quantitative Aptitude', 'Logical Reasoning', 'Data Interpretation', 'Abstract Reasoning', 'Verbal Ability'],
  4: ['Career Goals', 'Culture Fit', 'Salary Negotiation', 'Work-Life Balance', 'Personal Growth']
};

export const CONFIG_OPTIONS = {
  type: ['Conversational', 'Non-Conversational'],
  difficulty: ['Easy', 'Medium', 'Hard'],
  duration: ['5', '10', '15', '20'],
  confirm: ['Yes', 'No']
};

export const QUESTION_COUNT = { 5: 3, 10: 6, 15: 9, 20: 12 };
