import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import App from './App';
import './index.css';

// React Query設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分
    },
  },
});

// Microsoft Fluent Design Theme for Ant Design
const fluentTheme = {
  token: {
    // カラーパレット
    colorPrimary: '#0078d4',
    colorSuccess: '#107c10',
    colorWarning: '#ff8c00',
    colorError: '#d13438',
    colorInfo: '#0078d4',

    // グレースケール
    colorBgContainer: '#ffffff',
    colorBgLayout: '#faf9f8',
    colorBgElevated: '#ffffff',
    colorBorder: '#edebe9',
    colorBorderSecondary: '#e1dfdd',

    // テキストカラー
    colorText: '#323130',
    colorTextSecondary: '#605e5c',
    colorTextTertiary: '#8a8886',
    colorTextQuaternary: '#a19f9d',

    // フォント
    fontFamily:
      "'Segoe UI', 'Yu Gothic UI', 'Meiryo', 'Hiragino Sans', 'ヒラギノ角ゴ ProN W3', 'Hiragino Kaku Gothic ProN', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 15,
    fontSizeHeading1: 42,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 18,

    // Border Radius
    borderRadius: 4,
    borderRadiusLG: 8,
    borderRadiusSM: 2,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // Shadow - Fluent Design Depths
    boxShadow:
      '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108)',
    boxShadowSecondary:
      '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.132), 0 0.6px 1.8px 0 rgba(0, 0, 0, 0.108)',

    // Line Height
    lineHeight: 1.5,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.25,
    lineHeightHeading3: 1.25,
    lineHeightHeading4: 1.5,
    lineHeightHeading5: 1.5,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.367s',

    // Control Heights
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
  },
  algorithm: theme.defaultAlgorithm,
  components: {
    Button: {
      primaryShadow: 'none',
      fontWeight: 600,
      controlHeight: 32,
      borderRadius: 2,
    },
    Card: {
      borderRadiusLG: 8,
      boxShadowTertiary:
        '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108)',
    },
    Table: {
      headerBg: '#faf9f8',
      headerColor: '#605e5c',
      borderColor: '#edebe9',
      rowHoverBg: '#f3f2f1',
    },
    Input: {
      borderRadius: 2,
      controlHeight: 32,
    },
    Select: {
      borderRadius: 2,
      controlHeight: 32,
    },
    Alert: {
      borderRadiusLG: 4,
    },
    Modal: {
      borderRadiusLG: 8,
    },
    Tag: {
      borderRadiusSM: 2,
      fontSizeSM: 12,
    },
    Notification: {
      borderRadiusLG: 4,
    },
    Message: {
      borderRadiusLG: 4,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={jaJP} theme={fluentTheme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
