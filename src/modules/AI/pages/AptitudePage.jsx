import React from 'react';
import AIBaseLayout from '../components/AIBaseLayout';
import { ROUNDS } from '../constants';

export default function AptitudePage() {
  const round = ROUNDS.find(r => r.id === 3);
  return <AIBaseLayout round={round} />;
}
