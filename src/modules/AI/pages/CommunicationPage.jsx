import React from 'react';
import AIBaseLayout from '../components/AIBaseLayout';
import { ROUNDS } from '../constants';

export default function CommunicationPage() {
  const round = ROUNDS.find(r => r.id === 1);
  return <AIBaseLayout round={round} />;
}
