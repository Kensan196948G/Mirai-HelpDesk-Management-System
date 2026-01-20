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
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
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
        return response.data.statistics as TicketStatistics;
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
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="新規"
              value={statistics.new}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="対応中"
              value={statistics.in_progress}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="解決済"
              value={statistics.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 優先度別チケット数 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="優先度別チケット数" bordered={false}>
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
          <Card title="SLA統計" bordered={false}>
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

      {/* 最近のチケット一覧 */}
      <Card
        title="最近のチケット"
        bordered={false}
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
          onRow={(record) => ({
            onClick: () => navigate(`/tickets/${record.ticket_id}`),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'チケットがありません' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
