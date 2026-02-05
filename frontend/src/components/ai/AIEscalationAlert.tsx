/**
 * AI Escalation Alert
 *
 * エスカレーションリスクアラートコンポーネント
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Card,
  Progress,
  Steps,
  Button,
  Space,
  Typography,
  Tag,
  Spin,
} from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';

const { Text, Title } = Typography;

interface AIEscalationAlertProps {
  ticketId: string;
  autoCheck?: boolean;
  refreshInterval?: number; // ミリ秒（デフォルト: 5分）
}

export const AIEscalationAlert: React.FC<AIEscalationAlertProps> = ({
  ticketId,
  autoCheck = true,
  refreshInterval = 300000, // 5分
}) => {
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiEnabled } = useAIStore();

  const checkRisk = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.detectEscalationRisk({ ticket_id: ticketId });
      setRiskData(result);
    } catch (err: any) {
      console.error('エスカレーションリスクチェックエラー:', err);
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiEnabled && autoCheck) {
      checkRisk();

      // 定期的に再チェック
      const interval = setInterval(() => {
        checkRisk();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [ticketId, aiEnabled, autoCheck]);

  if (!aiEnabled) return null;

  // リスクレベル別の色とアイコン
  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return { color: 'error', icon: <WarningOutlined />, label: '緊急', bgColor: '#fff1f0' };
      case 'high':
        return { color: 'warning', icon: <WarningOutlined />, label: '高', bgColor: '#fffbe6' };
      case 'medium':
        return { color: 'default', icon: <ClockCircleOutlined />, label: '中', bgColor: '#f0f5ff' };
      case 'low':
        return { color: 'success', icon: <CheckCircleOutlined />, label: '低', bgColor: '#f6ffed' };
      default:
        return { color: 'default', icon: <ClockCircleOutlined />, label: '不明', bgColor: '#fafafa' };
    }
  };

  if (loading && !riskData) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="リスク分析中..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        message="エスカレーションリスクチェックエラー"
        description={error}
        type="error"
        closable
        onClose={() => setError(null)}
      />
    );
  }

  if (!riskData) return null;

  const riskConfig = getRiskConfig(riskData.risk_level);

  // リスクレベルが low の場合は表示しない（オプション）
  if (riskData.risk_level === 'low') {
    return null;
  }

  return (
    <Card
      style={{
        marginBottom: 16,
        backgroundColor: riskConfig.bgColor,
        borderColor: riskConfig.color === 'error' ? '#ff4d4f' : riskConfig.color === 'warning' ? '#faad14' : '#d9d9d9',
      }}
    >
      {/* ヘッダー */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {riskConfig.icon}
            <Title level={5} style={{ margin: 0 }}>
              エスカレーションリスク
            </Title>
            <Tag color={riskConfig.color}>{riskConfig.label}</Tag>
          </Space>
          <Text type="secondary">
            スコア: <Text strong>{(riskData.risk_score * 100).toFixed(0)}%</Text>
          </Text>
        </div>

        {/* リスクスコアのプログレスバー */}
        <Progress
          percent={riskData.risk_score * 100}
          strokeColor={
            riskData.risk_level === 'critical' || riskData.risk_level === 'high'
              ? '#ff4d4f'
              : riskData.risk_level === 'medium'
              ? '#faad14'
              : '#52c41a'
          }
          showInfo={false}
        />

        {/* リスク要因 */}
        {riskData.risk_factors && riskData.risk_factors.length > 0 && (
          <div>
            <Text strong>リスク要因:</Text>
            <ul style={{ marginTop: 8, marginBottom: 8 }}>
              {riskData.risk_factors.map((factor: any, index: number) => (
                <li key={index}>
                  <Text>{factor.description}</Text>
                  <Tag color="volcano" style={{ marginLeft: 8 }}>
                    深刻度: {(factor.severity * 100).toFixed(0)}%
                  </Tag>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SLA違反予測 */}
        {riskData.sla_breach_prediction && riskData.sla_breach_prediction.likely_to_breach && (
          <Alert
            message="SLA違反の可能性"
            description={
              <Space direction="vertical">
                <Text>
                  残り時間: <Text strong>{riskData.sla_breach_prediction.current_sla_remaining}</Text>
                </Text>
                {riskData.sla_breach_prediction.estimated_breach_time && (
                  <Text type="danger">
                    予測違反時刻: {new Date(riskData.sla_breach_prediction.estimated_breach_time).toLocaleString('ja-JP')}
                  </Text>
                )}
              </Space>
            }
            type="error"
            showIcon
          />
        )}

        {/* 推奨アクション */}
        {riskData.recommended_actions && riskData.recommended_actions.length > 0 && (
          <div>
            <Text strong>推奨アクション:</Text>
            <Steps
              direction="vertical"
              size="small"
              current={-1}
              style={{ marginTop: 12 }}
              items={riskData.recommended_actions.map((action: string) => ({
                title: action,
                icon: <RocketOutlined />,
              }))}
            />
          </div>
        )}

        {/* アクションボタン */}
        {(riskData.risk_level === 'high' || riskData.risk_level === 'critical') && (
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              danger
              icon={<WarningOutlined />}
              onClick={() => {
                // エスカレーション処理（将来実装）
                console.log('エスカレーション実行');
              }}
            >
              Managerにエスカレーション
            </Button>
          </div>
        )}

        {/* 再チェックボタン */}
        <div style={{ textAlign: 'right' }}>
          <Button size="small" onClick={checkRisk} loading={loading}>
            再チェック
          </Button>
        </div>
      </Space>
    </Card>
  );
};
