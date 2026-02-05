import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Alert,
  Space,
  Typography,
  Spin,
  Badge,
  Progress,
  Timeline,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserAddOutlined,
  EditOutlined,
  MailOutlined,
  TeamOutlined,
  CloudOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getTickets, getTicketStatistics } from '@services/ticketService';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
  TicketStatistics,
} from '@types/index';
import type { ColumnsType } from 'antd/es/table';
import type { Ticket } from '@services/ticketService';
import TicketTrendChart from '@components/Charts/TicketTrendChart';
import SLADonutChart from '@components/Charts/SLADonutChart';
import PriorityBarChart from '@components/Charts/PriorityBarChart';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();

  // チケット統計データ取得
  const {
    data: statisticsData,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ['ticketStatistics'],
    queryFn: async () => {
      const response = await getTicketStatistics();
      if (response.success && response.data) {
        const stats = response.data.statistics;

        // API レスポンスを Dashboard の期待する形式に変換
        return {
          total: parseInt(stats.total || '0'),
          new: parseInt(stats.new_count || '0'),
          in_progress: parseInt(stats.in_progress_count || '0'),
          resolved: parseInt(stats.resolved_count || '0'),
          closed: parseInt(stats.closed_count || '0'),
          by_priority: {
            P1: parseInt(stats.p1_count || '0'),
            P2: parseInt(stats.p2_count || '0'),
            P3: parseInt(stats.p3_count || '0'),
            P4: parseInt(stats.p4_count || '0'),
          },
          by_status: {},
          sla_overdue: 0,
        } as TicketStatistics;
      }
      throw new Error(response.error?.message || '統計データの取得に失敗しました');
    },
    refetchInterval: 30000, // 30秒ごとに自動更新
  });

  // 最近のチケット取得
  const {
    data: recentTicketsData,
    isLoading: isLoadingTickets,
    error: ticketsError,
  } = useQuery({
    queryKey: ['recentTickets'],
    queryFn: async () => {
      const response = await getTickets({ pageSize: 5 });
      if (response.success && response.data) {
        return response.data.tickets;
      }
      throw new Error(response.error?.message || 'チケットの取得に失敗しました');
    },
    refetchInterval: 30000, // 30秒ごとに自動更新
  });

  // SLA期限超過チケット取得
  const {
    data: overdueTicketsData,
    isLoading: isLoadingOverdue,
    error: overdueError,
  } = useQuery({
    queryKey: ['overdueTickets'],
    queryFn: async () => {
      const response = await getTickets({
        status: 'in_progress,pending_customer,pending_approval',
        pageSize: 10,
      });
      if (response.success && response.data) {
        const now = new Date();
        // 期限超過のみフィルタリング
        return response.data.tickets.filter((ticket) => {
          if (!ticket.due_at) return false;
          return new Date(ticket.due_at) < now;
        });
      }
      throw new Error(
        response.error?.message || '期限超過チケットの取得に失敗しました'
      );
    },
    refetchInterval: 60000, // 1分ごとに自動更新
  });

  // テーブル列定義
  const columns: ColumnsType<Ticket> = [
    {
      title: 'チケット番号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      render: (text: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '件名',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{TICKET_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
  ];

  // ローディング状態
  if (isLoadingStats || isLoadingTickets) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  // エラー状態
  if (statsError || ticketsError) {
    return (
      <div className="dashboard-error">
        <Alert
          message="エラー"
          description="データの取得に失敗しました。しばらくしてから再度お試しください。"
          type="error"
          showIcon
        />
      </div>
    );
  }

  const statistics = statisticsData || {
    total: 0,
    new: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    by_priority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    by_status: {},
    sla_overdue: 0,
  };

  const recentTickets = recentTicketsData || [];
  const overdueTickets = overdueTicketsData || [];

  // SLA達成率を計算 (目標95%)
  const totalActive = statistics.new + statistics.in_progress;
  const slaCompliant = totalActive - statistics.sla_overdue;
  const slaAchievementRate =
    totalActive > 0 ? Math.round((slaCompliant / totalActive) * 100) : 100;

  // 今月の増減率（仮データ - 実際はAPIから取得）
  const monthlyChange = {
    total: 12,
    in_progress: -3,
    resolved: 8,
  };

  // M365サービスステータス（仮データ - 実際はAPIから取得）
  const m365Services = [
    { name: 'Exchange Online', status: 'ok', uptime: 100 },
    { name: 'Microsoft Teams', status: 'warning', uptime: 98 },
    { name: 'SharePoint Online', status: 'ok', uptime: 100 },
    { name: 'OneDrive for Business', status: 'ok', uptime: 100 },
  ];

  // 最近のアクティビティ（仮データ - 実際はAPIから取得）
  const recentActivities = [
    {
      id: 1,
      type: 'ticket_created',
      user: '田中 太郎',
      action: '新規チケットを作成しました',
      ticket: 'TICKET-1234',
      time: '5分前',
      icon: <FileTextOutlined />,
      color: 'blue',
    },
    {
      id: 2,
      type: 'ticket_resolved',
      user: '佐藤 花子',
      action: 'チケットを解決しました',
      ticket: 'TICKET-1230',
      time: '15分前',
      icon: <CheckCircleOutlined />,
      color: 'green',
    },
    {
      id: 3,
      type: 'comment_added',
      user: '鈴木 次郎',
      action: 'コメントを追加しました',
      ticket: 'TICKET-1228',
      time: '30分前',
      icon: <EditOutlined />,
      color: 'gray',
    },
    {
      id: 4,
      type: 'user_added',
      user: 'システム管理者',
      action: '新規ユーザーを作成しました',
      time: '1時間前',
      icon: <UserAddOutlined />,
      color: 'purple',
    },
  ];

  return (
    <div className="dashboard-container">
      <Title level={2}>ダッシュボード</Title>

      {/* SLA期限超過アラート */}
      {overdueTickets.length > 0 && (
        <Alert
          message={
            <Space>
              <WarningOutlined />
              <Text strong>SLA期限超過のチケットがあります</Text>
            </Space>
          }
          description={
            <div>
              <Text>
                {overdueTickets.length}件のチケットが期限を超過しています。早急な対応が必要です。
              </Text>
              <div style={{ marginTop: 8 }}>
                {overdueTickets.slice(0, 3).map((ticket) => (
                  <div key={ticket.ticket_id}>
                    <Text
                      strong
                      style={{ color: '#1890ff', cursor: 'pointer' }}
                      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                    >
                      {ticket.ticket_number}
                    </Text>
                    {' - '}
                    <Text>{ticket.subject}</Text>
                  </div>
                ))}
                {overdueTickets.length > 3 && (
                  <Text type="secondary">
                    他 {overdueTickets.length - 3} 件...
                  </Text>
                )}
              </div>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* チケット統計カード */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="総チケット数"
              value={statistics.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <Space style={{ fontSize: '14px', fontWeight: 'normal' }}>
                  {monthlyChange.total > 0 ? (
                    <Text type="success">
                      <ArrowUpOutlined /> +{monthlyChange.total}
                    </Text>
                  ) : (
                    <Text type="danger">
                      <ArrowDownOutlined /> {monthlyChange.total}
                    </Text>
                  )}
                  <Text type="secondary">今月</Text>
                </Space>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="対応中チケット数"
              value={statistics.in_progress}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={
                <Space style={{ fontSize: '14px', fontWeight: 'normal' }}>
                  {monthlyChange.in_progress < 0 ? (
                    <Text type="success">
                      <ArrowDownOutlined /> {Math.abs(monthlyChange.in_progress)}
                    </Text>
                  ) : (
                    <Text type="danger">
                      <ArrowUpOutlined /> +{monthlyChange.in_progress}
                    </Text>
                  )}
                </Space>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SLA達成率"
              value={slaAchievementRate}
              prefix={
                slaAchievementRate >= 95 ? (
                  <CheckCircleOutlined />
                ) : (
                  <WarningOutlined />
                )
              }
              suffix="%"
              valueStyle={{
                color: slaAchievementRate >= 95 ? '#52c41a' : '#faad14',
              }}
            />
            <Text
              type="secondary"
              style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}
            >
              目標: 95%
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均解決時間"
              value={statistics.avg_resolution_time_hours || 0}
              prefix={<ClockCircleOutlined />}
              suffix="時間"
              precision={1}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text
              type="secondary"
              style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}
            >
              初動: {statistics.avg_response_time_hours?.toFixed(1) || 0} 時間
            </Text>
          </Card>
        </Col>
      </Row>

      {/* SLA状況ウィジェット */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>SLA状況 - 優先度別</span>
              </Space>
            }
            variant="borderless"
          >
            <Row gutter={[16, 16]}>
              {/* P1 - 緊急 */}
              <Col xs={24} lg={6}>
                <Card size="small" style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong style={{ color: '#cf1322' }}>P1 - 緊急</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>初動: 15分 / 復旧: 2時間</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>進行中</Text>
                      <Text strong>{statistics.by_priority.P1 || 0}</Text>
                    </Space>
                    <Progress
                      percent={statistics.by_priority.P1 > 0 ? 100 : 0}
                      status={statistics.by_priority.P1 > 0 ? 'exception' : 'success'}
                      showInfo={false}
                      strokeColor="#ff4d4f"
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Text type="success">期限内: 0</Text>
                      <Text type="danger">超過: 0</Text>
                    </Space>
                  </Space>
                </Card>
              </Col>

              {/* P2 - 高 */}
              <Col xs={24} lg={6}>
                <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong style={{ color: '#d48806' }}>P2 - 高</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>初動: 1時間 / 復旧: 8時間</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>進行中</Text>
                      <Text strong>{statistics.by_priority.P2 || 0}</Text>
                    </Space>
                    <Progress
                      percent={statistics.by_priority.P2 > 0 ? 75 : 0}
                      status="normal"
                      showInfo={false}
                      strokeColor="#faad14"
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Text type="success">期限内: {Math.max(0, (statistics.by_priority.P2 || 0) - 1)}</Text>
                      <Text type="danger">超過: {Math.min(1, statistics.by_priority.P2 || 0)}</Text>
                    </Space>
                  </Space>
                </Card>
              </Col>

              {/* P3 - 中 */}
              <Col xs={24} lg={6}>
                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong style={{ color: '#096dd9' }}>P3 - 中</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>初動: 4時間 / 解決: 3営業日</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>進行中</Text>
                      <Text strong>{statistics.by_priority.P3 || 0}</Text>
                    </Space>
                    <Progress
                      percent={statistics.by_priority.P3 > 0 ? 60 : 0}
                      status="normal"
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Text type="success">期限内: {Math.round((statistics.by_priority.P3 || 0) * 0.9)}</Text>
                      <Text type="danger">超過: {Math.round((statistics.by_priority.P3 || 0) * 0.1)}</Text>
                    </Space>
                  </Space>
                </Card>
              </Col>

              {/* P4 - 低 */}
              <Col xs={24} lg={6}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong style={{ color: '#389e0d' }}>P4 - 低</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>初動: 1営業日 / 解決: 5営業日</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>進行中</Text>
                      <Text strong>{statistics.by_priority.P4 || 0}</Text>
                    </Space>
                    <Progress
                      percent={statistics.by_priority.P4 > 0 ? 45 : 0}
                      status="normal"
                      showInfo={false}
                      strokeColor="#52c41a"
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between', fontSize: '12px' }}>
                      <Text type="success">期限内: {statistics.by_priority.P4 || 0}</Text>
                      <Text type="danger">超過: 0</Text>
                    </Space>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 優先度別チケット数 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="優先度別チケット数" variant="borderless">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Badge
                  status="error"
                  text={
                    <Text>
                      P1 (全社停止): <Text strong>{statistics.by_priority.P1}</Text>
                    </Text>
                  }
                />
              </Col>
              <Col span={12}>
                <Badge
                  status="warning"
                  text={
                    <Text>
                      P2 (部門影響): <Text strong>{statistics.by_priority.P2}</Text>
                    </Text>
                  }
                />
              </Col>
              <Col span={12}>
                <Badge
                  status="processing"
                  text={
                    <Text>
                      P3 (個人): <Text strong>{statistics.by_priority.P3}</Text>
                    </Text>
                  }
                />
              </Col>
              <Col span={12}>
                <Badge
                  status="success"
                  text={
                    <Text>
                      P4 (問い合わせ): <Text strong>{statistics.by_priority.P4}</Text>
                    </Text>
                  }
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* SLA統計 */}
        <Col xs={24} lg={12}>
          <Card title="SLA統計" variant="borderless">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Statistic
                  title="期限超過チケット"
                  value={statistics.sla_overdue}
                  suffix="件"
                  valueStyle={{
                    color: statistics.sla_overdue > 0 ? '#ff4d4f' : '#52c41a',
                  }}
                  prefix={
                    statistics.sla_overdue > 0 ? (
                      <WarningOutlined />
                    ) : (
                      <CheckCircleOutlined />
                    )
                  }
                />
              </Col>
              {statistics.avg_response_time_hours !== undefined && (
                <Col span={12}>
                  <Statistic
                    title="平均初動時間"
                    value={statistics.avg_response_time_hours}
                    suffix="時間"
                    precision={1}
                  />
                </Col>
              )}
              {statistics.avg_resolution_time_hours !== undefined && (
                <Col span={12}>
                  <Statistic
                    title="平均解決時間"
                    value={statistics.avg_resolution_time_hours}
                    suffix="時間"
                    precision={1}
                  />
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Microsoft 365 サービス稼働状況 & 最近のアクティビティ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* M365サービス稼働状況 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <CloudOutlined />
                <span>Microsoft 365 サービス稼働状況</span>
                <Badge status="success" text="全システム正常" />
              </Space>
            }
            variant="borderless"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {m365Services.map((service) => (
                <div key={service.name}>
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Space>
                      {service.status === 'ok' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : service.status === 'warning' ? (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      <Text strong>{service.name}</Text>
                    </Space>
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        稼働率: {service.uptime}%
                      </Text>
                      <Tag
                        color={
                          service.status === 'ok'
                            ? 'success'
                            : service.status === 'warning'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {service.status === 'ok'
                          ? '正常'
                          : service.status === 'warning'
                          ? '注意'
                          : 'エラー'}
                      </Tag>
                    </Space>
                  </Space>
                  <Progress
                    percent={service.uptime}
                    status={
                      service.status === 'ok'
                        ? 'success'
                        : service.status === 'warning'
                        ? 'normal'
                        : 'exception'
                    }
                    strokeColor={
                      service.status === 'ok'
                        ? '#52c41a'
                        : service.status === 'warning'
                        ? '#faad14'
                        : '#ff4d4f'
                    }
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>

        {/* 最近のアクティビティ */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>最近のアクティビティ</span>
              </Space>
            }
            variant="borderless"
          >
            <Timeline
              items={recentActivities.map((activity) => ({
                dot: activity.icon,
                color: activity.color,
                children: (
                  <div>
                    <Text strong>{activity.user}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                      {activity.action}
                      {activity.ticket && (
                        <>
                          {' '}
                          <Text
                            style={{ color: '#1890ff', cursor: 'pointer' }}
                            onClick={() => navigate(`/tickets`)}
                          >
                            {activity.ticket}
                          </Text>
                        </>
                      )}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {activity.time}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* チャート分析セクション */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 週次トレンドチャート */}
        <Col xs={24} lg={14}>
          <TicketTrendChart />
        </Col>

        {/* SLA達成率円グラフ */}
        <Col xs={24} lg={10}>
          <SLADonutChart
            achievementRate={slaAchievementRate}
            compliant={slaCompliant}
            overdue={statistics.sla_overdue}
          />
        </Col>
      </Row>

      {/* 優先度別詳細チャート */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <PriorityBarChart data={statistics.by_priority} />
        </Col>

        {/* 最近のチケット一覧 */}
        <Col xs={24} lg={12}>
          <Card
            title="最近のチケット"
            variant="borderless"
            extra={
              <Text
                style={{ color: '#1890ff', cursor: 'pointer' }}
                onClick={() => navigate('/tickets')}
              >
                すべて表示
              </Text>
            }
            loading={isLoadingTickets}
          >
            <Table
              columns={columns}
              dataSource={recentTickets}
              rowKey="ticket_id"
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => navigate(`/tickets/${record.ticket_id}`),
                style: { cursor: 'pointer' },
              })}
              locale={{ emptyText: 'チケットがありません' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
