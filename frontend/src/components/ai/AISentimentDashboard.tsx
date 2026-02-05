/**
 * AI Sentiment Dashboard
 *
 * 感情分析・顧客満足度予測ダッシュボード
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  Typography,
  Space,
  Alert,
  Spin,
  Button,
} from 'antd';
import {
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useAIStore } from '../../store/aiStore';

const { Text } = Typography;

interface AISentimentDashboardProps {
  ticketId: string;
  autoAnalyze?: boolean;
}

export const AISentimentDashboard: React.FC<AISentimentDashboardProps> = ({
  ticketId,
  autoAnalyze = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { aiEnabled } = useAIStore();

  const analyzeSentiment = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.analyzeSentiment({ ticket_id: ticketId });
      setSentimentData(result);
    } catch (err: any) {
      console.error('感情分析エラー:', err);
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiEnabled && autoAnalyze) {
      analyzeSentiment();
    }
  }, [ticketId, aiEnabled, autoAnalyze]);

  if (!aiEnabled) return null;

  // 感情スコアに応じたアイコンと色
  const getSentimentConfig = (score: number) => {
    if (score >= 0.5) {
      return { icon: <SmileOutlined />, color: '#52c41a', label: 'ポジティブ' };
    } else if (score >= -0.2) {
      return { icon: <MehOutlined />, color: '#faad14', label: '中立' };
    } else {
      return { icon: <FrownOutlined />, color: '#ff4d4f', label: 'ネガティブ' };
    }
  };

  // 満足度レベルのラベル
  const getSatisfactionLabel = (level: string) => {
    const labels: Record<string, string> = {
      very_satisfied: '非常に満足',
      satisfied: '満足',
      neutral: '普通',
      dissatisfied: '不満',
      very_dissatisfied: '非常に不満',
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="感情分析中..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        message="感情分析エラー"
        description={error}
        type="error"
        closable
        onClose={() => setError(null)}
      />
    );
  }

  if (!sentimentData) return null;

  const overallConfig = getSentimentConfig(sentimentData.overall_sentiment.score);

  return (
    <Card
      title="顧客満足度分析"
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={analyzeSentiment}>
          再分析
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* アラート（満足度低下時） */}
        {sentimentData.alert_required && (
          <Alert
            message="満足度低下アラート"
            description="利用者の不満が検出されました。即座に対応を推奨します。"
            type="error"
            showIcon
            icon={<WarningOutlined />}
          />
        )}

        {/* 全体的な感情スコア */}
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="全体的な感情"
                value={(sentimentData.overall_sentiment.score * 100).toFixed(0)}
                suffix="%"
                prefix={overallConfig.icon}
                valueStyle={{ color: overallConfig.color }}
              />
              <Tag color={overallConfig.color} style={{ marginTop: 8 }}>
                {overallConfig.label}
              </Tag>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="予測満足度"
                value={sentimentData.satisfaction_prediction.predicted_satisfaction.toFixed(1)}
                suffix="/ 5.0"
                valueStyle={{
                  color: sentimentData.satisfaction_prediction.predicted_satisfaction >= 4.0 ? '#52c41a' : '#ff4d4f',
                }}
              />
              <Tag
                color={sentimentData.satisfaction_prediction.predicted_satisfaction >= 4.0 ? 'success' : 'error'}
                style={{ marginTop: 8 }}
              >
                {getSatisfactionLabel(sentimentData.satisfaction_prediction.satisfaction_level)}
              </Tag>
            </Card>
          </Col>
        </Row>

        {/* リスク要因 */}
        {sentimentData.satisfaction_prediction.risk_factors && sentimentData.satisfaction_prediction.risk_factors.length > 0 && (
          <div>
            <Text strong>不満要因:</Text>
            <ul style={{ marginTop: 8 }}>
              {sentimentData.satisfaction_prediction.risk_factors.map((factor: string, index: number) => (
                <li key={index}>
                  <Text>{factor}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 改善提案 */}
        {sentimentData.satisfaction_prediction.improvement_suggestions && sentimentData.satisfaction_prediction.improvement_suggestions.length > 0 && (
          <div>
            <Text strong>改善提案:</Text>
            <List
              style={{ marginTop: 8 }}
              size="small"
              dataSource={sentimentData.satisfaction_prediction.improvement_suggestions}
              renderItem={(suggestion: string) => (
                <List.Item>
                  <Text>• {suggestion}</Text>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* コメント別の感情分析 */}
        {sentimentData.comment_sentiments && sentimentData.comment_sentiments.length > 0 && (
          <div>
            <Text strong>コメント別の感情分析:</Text>
            <List
              style={{ marginTop: 8 }}
              size="small"
              dataSource={sentimentData.comment_sentiments}
              renderItem={(comment: any) => {
                const config = getSentimentConfig(comment.sentiment.score);
                return (
                  <List.Item>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        {config.icon}
                        <Text strong>{config.label}</Text>
                        <Tag>{(comment.sentiment.score * 100).toFixed(0)}%</Tag>
                      </Space>
                      {comment.key_phrases && comment.key_phrases.length > 0 && (
                        <div>
                          <Text type="secondary">キーフレーズ:</Text>
                          <div style={{ marginTop: 4 }}>
                            {comment.key_phrases.map((phrase: string) => (
                              <Tag key={phrase} color="orange">
                                {phrase}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </Space>
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </Space>
    </Card>
  );
};
