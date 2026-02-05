/**
 * AI検索ページ
 */

import React from 'react';
import { Card } from 'antd';
import { AISmartSearch } from '../../components/ai/AISmartSearch';

const AISearchPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <AISmartSearch />
    </div>
  );
};

export default AISearchPage;
