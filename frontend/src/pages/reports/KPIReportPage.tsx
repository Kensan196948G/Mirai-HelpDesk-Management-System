import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  Progress,
  DatePicker,
  message,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { getKPIReport, downloadKPIReport, KPIReportData } from '@services/reportService';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#ff4d4f',
  P2: '#faad14',
  P3: '#1890ff',
  P4: '#52c41a',
};

const STATUS_LABELS: Record<string, string> = {
  new: '新規',
  triage: 'トリアージ',
  assigned: '担当割当済',
  in_progress: '対応中',
  pending_customer: '顧客回答待ち',
  pending_approval: '承認待ち',
  resolved: '解決済み',
  closed: 'クローズ',
  canceled: 'キャンセル',
};

const TYPE_LABELS: Record<string, string> = {
  incident: 'インシデント',
  service_request: 'サービス要求',
  change_request: '変更要求',
  question: '問い合わせ',
};

const KPIReportPage = () => {
  const defaultTo = dayjs();
  const defaultFrom = dayjs().subtract(30, 'day');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultFrom, defaultTo]);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);

  const fromStr = dateRange[0].format('YYYY-MM-DD');
  const toStr = dateRange[1].format('YYYY-MM-DD');

  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['kpiReport', fromStr, toStr],
    queryFn: async () => {
      const response = await getKPIReport(fromStr, toStr);
      if (response.success && response.data) {
        return response.data.report;
      }
      throw new Error(response.error?.message || 'KPIレポートの取得に失敗しました');
    },
  });

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setDownloading(format);
    try {
      await downloadKPIReport(fromStr, toStr, format);
      message.success(`${format.toUpperCase()}ファイルをダウンロードしました`);
    } catch {
      message.error(`${format.toUpperCase()}ダウンロードに失敗しました`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // 担当者パフォーマンステーブル列定義
  const assigneeColumns: ColumnsType<KPIReportData['assigneePerformance'][number]> = [
    {
      title: '担当者',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '割当件数',
      dataIndex: 'totalAssigned',
      key: 'totalAssigned',
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
    },
    {
      title: '解決件数',
      dataIndex: 'resolvedCount',
      key: 'resolvedCount',
      sorter: (a, b) => a.resolvedCount - b.resolvedCount,
    },
    {
      title: '解決率',
      key: 'resolvedRate',
      render: (_, record) => {
        const rate = record.totalAssigned > 0
          ? Math.round((record.resolvedCount / record.totalAssigned) * 100)
          : 0;
        return <Progress percent={rate} size="small" />;
      },
      sorter: (a, b) => {
        const rateA = a.totalAssigned > 0 ? a.resolvedCount / a.totalAssigned : 0;
        const rateB = b.totalAssigned > 0 ? b.resolvedCount / b.totalAssigned : 0;
        return rateA - rateB;
      },
    },
    {
      title: '平均解決時間',
      dataIndex: 'avgResolutionHours',
      key: 'avgResolutionHours',
      render: (hours: number | null) => hours !== null ? `${hours}時間` : '-',
      sorter: (a, b) => (a.avgResolutionHours ?? 999) - (b.avgResolutionHours ?? 999),
    },
  ];

  // 月次トレンドテーブル列定義
  const trendColumns: ColumnsType<KPIReportData['monthlyTrend'][number]> = [
    {
      title: '月',
      dataIndex: 'month',
      key: 'month',
    },
    {
      title: '作成',
      dataIndex: 'created',
      key: 'created',
      render: (val: number) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '解決',
      dataIndex: 'resolved',
      key: 'resolved',
      render: (val: number) => <Tag color="green">{val}</Tag>,
    },
    {
      title: 'クローズ',
      dataIndex: 'closed',
      key: 'closed',
      render: (val: number) => <Tag color="default">{val}</Tag>,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="KPIレポートを生成中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="エラー"
          description="KPIレポートの取得に失敗しました。権限を確認するか、しばらくしてから再度お試しください。"
          type="error"
          showIcon
          action={
            <Button onClick={() => refetch()} size="small">
              再試行
            </Button>
          }
        />
      </div>
    );
  }

  const report = reportData;

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title id="page-title" level={2} style={{ margin: 0 }}>
          <BarChartOutlined /> KPIレポート
        </Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownload('csv')}
            loading={downloading === 'csv'}
          >
            CSV
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => handleDownload('pdf')}
            loading={downloading === 'pdf'}
            type="primary"
          >
            PDF
          </Button>
        </Space>
      </div>

      {report && (
        <>
          {/* サマリー統計 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="総チケット数"
                  value={report.summary.totalTickets}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="新規"
                  value={report.summary.newTickets}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="解決済み"
                  value={report.summary.resolvedTickets}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="クローズ"
                  value={report.summary.closedTickets}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="未対応"
                  value={report.summary.openTickets}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: report.summary.openTickets > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card>
                <Statistic
                  title="平均解決時間"
                  value={report.summary.avgResolutionHours ?? 0}
                  prefix={<ClockCircleOutlined />}
                  suffix="時間"
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* SLA達成率 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title="初動対応SLA達成率">
                <Progress
                  type="dashboard"
                  percent={report.sla.responseMetRate}
                  strokeColor={report.sla.responseMetRate >= 95 ? '#52c41a' : report.sla.responseMetRate >= 80 ? '#faad14' : '#ff4d4f'}
                  format={(percent) => `${percent}%`}
                />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">
                    {report.sla.responseMetCount} / {report.sla.responseTotal} 件
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="解決SLA達成率">
                <Progress
                  type="dashboard"
                  percent={report.sla.resolutionMetRate}
                  strokeColor={report.sla.resolutionMetRate >= 95 ? '#52c41a' : report.sla.resolutionMetRate >= 80 ? '#faad14' : '#ff4d4f'}
                  format={(percent) => `${percent}%`}
                />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">
                    {report.sla.resolutionMetCount} / {report.sla.resolutionTotal} 件
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="期限超過チケット">
                <Statistic
                  value={report.sla.overdueCount}
                  suffix="件"
                  valueStyle={{
                    color: report.sla.overdueCount > 0 ? '#ff4d4f' : '#52c41a',
                    fontSize: 48,
                    textAlign: 'center',
                  }}
                  prefix={report.sla.overdueCount > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 優先度別・ステータス別・タイプ別 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title="優先度別チケット数">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {Object.entries(report.byPriority).map(([priority, count]) => {
                    const slaInfo = report.slaBypriority[priority];
                    return (
                      <div key={priority} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
                          <Text strong>{count}件</Text>
                        </Space>
                        {slaInfo && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            SLA: {slaInfo.resolutionMetRate}%
                          </Text>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(report.byPriority).length === 0 && (
                    <Text type="secondary">データなし</Text>
                  )}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="ステータス別チケット数">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {Object.entries(report.byStatus).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{STATUS_LABELS[status] || status}</Text>
                      <Tag>{count}</Tag>
                    </div>
                  ))}
                  {Object.keys(report.byStatus).length === 0 && (
                    <Text type="secondary">データなし</Text>
                  )}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="タイプ別チケット数">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {Object.entries(report.byType).map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>{TYPE_LABELS[type] || type}</Text>
                      <Tag color="blue">{count}</Tag>
                    </div>
                  ))}
                  {Object.keys(report.byType).length === 0 && (
                    <Text type="secondary">データなし</Text>
                  )}
                </Space>
              </Card>
            </Col>
          </Row>

          {/* 優先度別SLA達成率 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24}>
              <Card title="優先度別SLA達成率">
                <Row gutter={[16, 16]}>
                  {Object.entries(report.slaBypriority).map(([priority, info]) => (
                    <Col xs={24} sm={12} lg={6} key={priority}>
                      <Card
                        size="small"
                        style={{
                          borderLeft: `4px solid ${PRIORITY_COLORS[priority] || '#d9d9d9'}`,
                        }}
                      >
                        <Text strong>{priority}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          ({info.total}件)
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 12 }}>初動SLA: </Text>
                          <Progress
                            percent={info.responseMetRate}
                            size="small"
                            strokeColor={info.responseMetRate >= 95 ? '#52c41a' : '#faad14'}
                          />
                        </div>
                        <div>
                          <Text style={{ fontSize: 12 }}>解決SLA: </Text>
                          <Progress
                            percent={info.resolutionMetRate}
                            size="small"
                            strokeColor={info.resolutionMetRate >= 95 ? '#52c41a' : '#faad14'}
                          />
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 担当者別パフォーマンス */}
          {report.assigneePerformance.length > 0 && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24}>
                <Card title="担当者別パフォーマンス">
                  <Table
                    columns={assigneeColumns}
                    dataSource={report.assigneePerformance}
                    rowKey="assignee_id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 月次トレンド */}
          {report.monthlyTrend.length > 0 && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24}>
                <Card title="月次トレンド">
                  <Table
                    columns={trendColumns}
                    dataSource={report.monthlyTrend}
                    rowKey="month"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* レポート生成情報 */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              レポート期間: {report.period.from} - {report.period.to}
              {' | '}
              生成日時: {new Date(report.generatedAt).toLocaleString('ja-JP')}
            </Text>
          </div>
        </>
      )}
    </div>
  );
};

export default KPIReportPage;
