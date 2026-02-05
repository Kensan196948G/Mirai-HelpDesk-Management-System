/**
 * AI推奨ページ
 */

import React, { useState } from 'react';
import {
  Card,
  List,
  Typography,
  Tag,
  Button,
  Space,
  Avatar,
  Progress,
  Divider
} from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  confidence: number;
  actionItems: string[];
}

const AIRecommend: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations] = useState<Recommendation[]>([
    {
      id: '1',
      title: 'ナレッジベースの強化を推奨',
      description: 'Exchange Online 関連のチケットが頻繁に発生しています。FAQ記事を追加することで、解決時間を30%短縮できる可能性があります。',
      impact: 'high',
      category: 'Knowledge Management',
      confidence: 0.92,
      actionItems: [
        'メール添付ファイルサイズ制限に関するFAQを追加',
        'OneDrive共有リンクの使い方ガイドを作成',
        'よくある質問トップ10をダッシュボードに表示'
      ]
    },
    {
      id: '2',
      title: 'Teams 画面共有のトラブルシューティングガイド作成',
      description: 'Teams 画面共有に関する問い合わせが月32件発生しています。セルフサービスガイドで50%削減可能です。',
      impact: 'medium',
      category: 'Self-Service',
      confidence: 0.88,
      actionItems: [
        'Teams 画面共有トラブルシューティング記事を作成',
        'よくあるエラーと解決方法をリスト化',
        'ビデオガイドの作成を検討'
      ]
    },
    {
      id: '3',
      title: 'P1チケットのエスカレーション基準を見直し',
      description: 'P1チケットの15%が実際にはP2相当でした。分類基準を明確化することで、適切な優先度付けが可能です。',
      impact: 'medium',
      category: 'SLA Management',
      confidence: 0.85,
      actionItems: [
        'Impact と Urgency の判定基準を文書化',
        'エージェント向けトレーニング資料を作成',
        'AI分類の精度向上のためのフィードバックループを構築'
      ]
    },
    {
      id: '4',
      title: 'M365 Operator の負荷分散',
      description: '特定のオペレーターに作業が集中しています。担当者自動割り当てロジックの改善を推奨します。',
      impact: 'low',
      category: 'Workload Distribution',
      confidence: 0.78,
      actionItems: [
        'オペレーターのスキルマトリクスを作成',
        '現在の作業量を考慮した自動割り当て',
        '定期的な負荷レビューミーティングの実施'
      ]
    }
  ]);

  const handleRefresh = () => {
    setLoading(true);
    // 実際のAPIを呼び出す場合はここに実装
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return impact;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <BulbOutlined /> AI推奨・改善提案
        </Title>
        <Paragraph>
          AIがチケットデータを分析し、運用改善の提案を行います。
        </Paragraph>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
          style={{ marginBottom: '16px' }}
        >
          推奨を更新
        </Button>
      </Card>

      <List
        style={{ marginTop: '16px' }}
        grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1 }}
        dataSource={recommendations}
        renderItem={(item) => (
          <List.Item>
            <Card
              title={
                <Space>
                  <StarOutlined style={{ color: '#faad14' }} />
                  <span>{item.title}</span>
                </Space>
              }
              extra={
                <Space>
                  <Tag color={getImpactColor(item.impact)}>
                    影響度: {getImpactText(item.impact)}
                  </Tag>
                  <Tag color="blue">{item.category}</Tag>
                </Space>
              }
            >
              <Paragraph>{item.description}</Paragraph>

              <div style={{ marginBottom: '16px' }}>
                <Text strong>信頼度:</Text>
                <Progress
                  percent={item.confidence * 100}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068'
                  }}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
              </div>

              <Divider orientation="left" plain>
                <Text strong>
                  <CheckCircleOutlined /> 推奨アクション
                </Text>
              </Divider>

              <List
                size="small"
                dataSource={item.actionItems}
                renderItem={(action, index) => (
                  <List.Item>
                    <Space>
                      <Avatar
                        size="small"
                        style={{ backgroundColor: '#1890ff' }}
                      >
                        {index + 1}
                      </Avatar>
                      <Text>{action}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default AIRecommend;
