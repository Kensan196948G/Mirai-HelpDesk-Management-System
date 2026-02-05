import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Space,
  Descriptions,
  Drawer,
  Progress,
  Alert,
  Spin,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getSLAPolicies,
  getSLAMetrics,
  SLAPolicy,
  SLAMetrics,
  PRIORITY_LABELS,
  PRIORITY_DESCRIPTIONS,
  formatBusinessTime,
} from '@services/slaService';
import { PRIORITY_COLORS } from '@types/index';

const { Title, Text } = Typography;

const SLAPage = () => {
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<SLAPolicy | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // SLAポリシーとメトリクスを読み込み
  const loadData = async () => {
    setLoading(true);
    try {
      const [policiesRes, metricsRes] = await Promise.all([
        getSLAPolicies(),
        getSLAMetrics(),
      ]);

      if (policiesRes.success && policiesRes.data) {
        setPolicies(policiesRes.data.policies);
      }

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error: any) {
      // APIが未実装の場合はフォールバックデータを表示
      const fallbackPolicies: SLAPolicy[] = [
        { priority: 'P1', responseMinutes: 15, resolutionMinutes: 120, businessHoursOnly: false },
        { priority: 'P2', responseMinutes: 60, resolutionMinutes: 480, businessHoursOnly: true },
        { priority: 'P3', responseMinutes: 240, resolutionMinutes: 4320, businessHoursOnly: true },
        { priority: 'P4', responseMinutes: 1440, resolutionMinutes: 7200, businessHoursOnly: true },
      ];
      setPolicies(fallbackPolicies);
      message.info('SLA APIに接続中です。ポリシー定義を表示しています。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ポリシー詳細表示
  const handleShowDetail = (record: SLAPolicy) => {
    setSelectedPolicy(record);
    setDrawerVisible(true);
  };

  // テーブルカラム定義
  const columns: ColumnsType<SLAPolicy> = [
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 150,
      render: (priority: string) => (
        <Tag color={PRIORITY_COLORS[priority] || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
          {PRIORITY_LABELS[priority] || priority}
        </Tag>
      ),
    },
    {
      title: '説明',
      key: 'description',
      width: 280,
      render: (_: any, record: SLAPolicy) => (
        <Text type="secondary">
          {PRIORITY_DESCRIPTIONS[record.priority] || ''}
        </Text>
      ),
    },
    {
      title: '初動対応時間',
      dataIndex: 'responseMinutes',
      key: 'responseMinutes',
      width: 180,
      render: (minutes: number, record: SLAPolicy) => (
        <Space>
          <ClockCircleOutlined />
          <Text strong>{formatBusinessTime(minutes, record.businessHoursOnly)}</Text>
        </Space>
      ),
    },
    {
      title: '解決時間',
      dataIndex: 'resolutionMinutes',
      key: 'resolutionMinutes',
      width: 200,
      render: (minutes: number, record: SLAPolicy) => (
        <Space>
          <ClockCircleOutlined />
          <Text strong>{formatBusinessTime(minutes, record.businessHoursOnly)}</Text>
        </Space>
      ),
    },
    {
      title: '計算方式',
      dataIndex: 'businessHoursOnly',
      key: 'businessHoursOnly',
      width: 150,
      render: (businessHoursOnly: boolean) => (
        <Tag color={businessHoursOnly ? 'blue' : 'red'}>
          {businessHoursOnly ? '営業時間' : '24時間体制'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: SLAPolicy) => (
        <a onClick={() => handleShowDetail(record)}>詳細</a>
      ),
    },
  ];

  // エスカレーション情報（優先度別）
  const getEscalationInfo = (priority: string): string => {
    const escalations: Record<string, string> = {
      P1: '直ちにマネージャーへエスカレーション。15分以内に初動対応が必要。',
      P2: '1時間以内に初動対応。4時間超過でマネージャーへ通知。',
      P3: '4時間以内に初動対応。1営業日超過でリーダーへ通知。',
      P4: '1営業日以内に初動対応。3営業日超過でリーダーへ通知。',
    };
    return escalations[priority] || '';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  return (
    <div id="page-content" style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title id="page-title" level={2}>
          <DashboardOutlined /> SLA管理
        </Title>
        <Text type="secondary">
          サービスレベル合意（SLA）ポリシーの定義とSLA達成状況を確認できます
        </Text>
      </div>

      {/* SLAメトリクスサマリー */}
      {metrics && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="対象チケット数"
                value={metrics.total}
                suffix="件"
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="初動SLA達成率"
                value={metrics.responseMetRate}
                suffix="%"
                valueStyle={{ color: metrics.responseMetRate >= 90 ? '#3f8600' : '#cf1322' }}
                prefix={metrics.responseMetRate >= 90 ? <CheckCircleOutlined /> : <WarningOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="解決SLA達成率"
                value={metrics.resolutionMetRate}
                suffix="%"
                valueStyle={{ color: metrics.resolutionMetRate >= 90 ? '#3f8600' : '#cf1322' }}
                prefix={metrics.resolutionMetRate >= 90 ? <CheckCircleOutlined /> : <WarningOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="期限超過"
                value={metrics.overdueCount}
                suffix="件"
                valueStyle={{ color: metrics.overdueCount > 0 ? '#cf1322' : '#3f8600' }}
                prefix={metrics.overdueCount > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              />
            </Col>
          </Row>

          {/* 優先度別SLA達成率 */}
          {metrics.byPriority && (
            <>
              <div style={{ marginTop: 24, marginBottom: 12 }}>
                <Text strong>優先度別 SLA 達成率</Text>
              </div>
              <Row gutter={[16, 16]}>
                {Object.entries(metrics.byPriority).map(([priority, data]) => (
                  <Col xs={12} sm={6} key={priority}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Tag color={PRIORITY_COLORS[priority]} style={{ marginBottom: 8 }}>
                        {priority}
                      </Tag>
                      <div>
                        <Text type="secondary">初動</Text>
                        <Progress
                          percent={Math.round(data.responseMetRate)}
                          size="small"
                          status={data.responseMetRate >= 90 ? 'success' : 'exception'}
                        />
                      </div>
                      <div>
                        <Text type="secondary">解決</Text>
                        <Progress
                          percent={Math.round(data.resolutionMetRate)}
                          size="small"
                          status={data.resolutionMetRate >= 90 ? 'success' : 'exception'}
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {data.total}件
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Card>
      )}

      {/* SLAポリシーテーブル */}
      <Card title="SLA ポリシー定義">
        <Alert
          message="SLAポリシーについて"
          description="各優先度に対して初動対応時間と解決時間が定義されています。P1（緊急）は24時間体制、P2-P4は営業時間（9:00-18:00、平日）で計算されます。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          id="sla-table"
          columns={columns}
          dataSource={policies}
          rowKey="priority"
          loading={loading}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* ポリシー詳細ドロワー */}
      <Drawer
        title={`SLAポリシー詳細 - ${selectedPolicy?.priority || ''}`}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={500}
      >
        {selectedPolicy && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Tag
                color={PRIORITY_COLORS[selectedPolicy.priority]}
                style={{ fontSize: 18, padding: '8px 24px' }}
              >
                {PRIORITY_LABELS[selectedPolicy.priority] || selectedPolicy.priority}
              </Tag>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="優先度">
                {selectedPolicy.priority}
              </Descriptions.Item>
              <Descriptions.Item label="説明">
                {PRIORITY_DESCRIPTIONS[selectedPolicy.priority] || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="初動対応時間">
                {formatBusinessTime(selectedPolicy.responseMinutes, selectedPolicy.businessHoursOnly)}
              </Descriptions.Item>
              <Descriptions.Item label="解決時間">
                {formatBusinessTime(selectedPolicy.resolutionMinutes, selectedPolicy.businessHoursOnly)}
              </Descriptions.Item>
              <Descriptions.Item label="計算方式">
                <Tag color={selectedPolicy.businessHoursOnly ? 'blue' : 'red'}>
                  {selectedPolicy.businessHoursOnly ? '営業時間のみ' : '24時間体制'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="営業時間">
                {selectedPolicy.businessHoursOnly
                  ? '平日 9:00 - 18:00（祝日除く）'
                  : '24時間365日'}
              </Descriptions.Item>
            </Descriptions>

            <Card title="エスカレーション" size="small">
              <Text>{getEscalationInfo(selectedPolicy.priority)}</Text>
            </Card>

            {/* メトリクス情報（あれば表示） */}
            {metrics?.byPriority?.[selectedPolicy.priority] && (
              <Card title="現在の達成状況" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">初動SLA達成率</Text>
                    <Progress
                      percent={Math.round(metrics.byPriority[selectedPolicy.priority].responseMetRate)}
                      status={
                        metrics.byPriority[selectedPolicy.priority].responseMetRate >= 90
                          ? 'success'
                          : 'exception'
                      }
                    />
                  </div>
                  <div>
                    <Text type="secondary">解決SLA達成率</Text>
                    <Progress
                      percent={Math.round(metrics.byPriority[selectedPolicy.priority].resolutionMetRate)}
                      status={
                        metrics.byPriority[selectedPolicy.priority].resolutionMetRate >= 90
                          ? 'success'
                          : 'exception'
                      }
                    />
                  </div>
                  <Text type="secondary">
                    対象チケット: {metrics.byPriority[selectedPolicy.priority].total}件
                  </Text>
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default SLAPage;
