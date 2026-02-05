/**
 * AI分析ページ
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Table,
  Tag,
  Select,
  Space,
  Button,
  Spin
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface AnalysisData {
  totalPredictions: number;
  averageConfidence: number;
  accuracyRate: number;
  topCategories: Array<{ category: string; count: number; accuracy: number }>;
}

const AIAnalyze: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>('7');
  const [data, setData] = useState<AnalysisData>({
    totalPredictions: 127,
    averageConfidence: 0.89,
    accuracyRate: 0.92,
    topCategories: [
      { category: 'Exchange Online', count: 45, accuracy: 0.95 },
      { category: 'Teams', count: 32, accuracy: 0.91 },
      { category: 'OneDrive', count: 28, accuracy: 0.88 },
      { category: 'SharePoint', count: 15, accuracy: 0.85 },
      { category: 'Entra ID', count: 7, accuracy: 0.93 }
    ]
  });

  const handleRefresh = () => {
    setLoading(true);
    // 実際のAPIを呼び出す場合はここに実装
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const columns = [
    {
      title: 'カテゴリ',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '予測回数',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (count: number) => <strong>{count}</strong>
    },
    {
      title: '精度',
      dataIndex: 'accuracy',
      key: 'accuracy',
      sorter: (a: any, b: any) => a.accuracy - b.accuracy,
      render: (accuracy: number) => {
        const percentage = (accuracy * 100).toFixed(0);
        const color = accuracy >= 0.9 ? 'success' : accuracy >= 0.8 ? 'warning' : 'error';
        return (
          <Tag color={color} icon={accuracy >= 0.9 ? <CheckCircleOutlined /> : <WarningOutlined />}>
            {percentage}%
          </Tag>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <RobotOutlined /> AI分析ダッシュボード
        </Title>
        <Paragraph>
          AI機能の精度、パフォーマンス、利用状況を分析します。
        </Paragraph>

        <Space style={{ marginBottom: '16px' }}>
          <span>期間:</span>
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 150 }}
            options={[
              { label: '過去7日間', value: '7' },
              { label: '過去30日間', value: '30' },
              { label: '過去90日間', value: '90' }
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            更新
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="総予測回数"
              value={data.totalPredictions}
              prefix={<ThunderboltOutlined />}
              suffix="回"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="平均信頼度"
              value={data.averageConfidence * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: data.averageConfidence >= 0.8 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="精度率"
              value={data.accuracyRate * 100}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginTop: '16px' }}
        title="カテゴリ別AI予測精度"
      >
        <Table
          columns={columns}
          dataSource={data.topCategories}
          rowKey="category"
          pagination={false}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default AIAnalyze;
