import React from 'react';
import AIBaseLayout from '../components/AIBaseLayout';
import { ROUNDS } from '../constants';

export default function TechnicalPage() {
  const round = ROUNDS.find(r => r.id === 2);
  return <AIBaseLayout round={round} />;
}
