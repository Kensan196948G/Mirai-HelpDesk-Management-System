/**
 * AI検索ページ
 */

import React from 'react';
import { AISmartSearch } from '../../components/ai/AISmartSearch';

const AISearchPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }} id="ai-search-page">
      <AISmartSearch />
    </div>
  );
};

export default AISearchPage;
