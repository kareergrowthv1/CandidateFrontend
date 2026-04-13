import React from 'react';
import AIBaseLayout from '../components/AIBaseLayout';
import { ROUNDS } from '../constants';

export default function HRManagementPage() {
  const round = ROUNDS.find(r => r.id === 4);
  return <AIBaseLayout round={round} />;
}
