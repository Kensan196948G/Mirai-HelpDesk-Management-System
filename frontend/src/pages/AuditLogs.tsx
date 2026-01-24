import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Input,
  message,
  Typography,
  Drawer,
  Descriptions,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import { useAuthStore } from '@store/authStore';
import {
  getAuditLogs,
  getAuditStatistics,
  exportAuditLogsCSV,
  exportAuditLogsJSON,
  AuditLog,
  AuditStatistics,
  ACTION_LABELS,
  RESOURCE_TYPE_LABELS,
  ACTION_COLORS,
  AUDIT_ACTIONS,
  RESOURCE_TYPES,
} from '@services/auditService';
import './AuditLogs.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

dayjs.locale('ja');

const AuditLogs = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // フィルター
  const [filters, setFilters] = useState({
    action: undefined as string | undefined,
    resource_type: undefined as string | undefined,
    actor_id: undefined as string | undefined,
    search: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });

  // 権限チェック
  useEffect(() => {
    if (user && !['manager', 'auditor'].includes(user.role)) {
      message.error('このページにアクセスする権限がありません');
      window.location.href = '/';
    }
  }, [user]);

  // 監査ログ読み込み
  const loadAuditLogs = async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const response = await getAuditLogs({
        page,
        page_size: pageSize,
        ...filters,
      });

      if (response.data) {
        setAuditLogs(response.data.items);
        setPagination({
          current: response.data.page,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      }
    } catch (error: any) {
      message.error(error.message || '監査ログの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 統計情報読み込み
  const loadStatistics = async () => {
    try {
      const response = await getAuditStatistics({
        start_date: filters.start_date,
        end_date: filters.end_date,
      });

      if (response.data) {
        setStatistics(response.data.statistics);
      }
    } catch (error: any) {
      console.error('統計情報の読み込みに失敗:', error);
    }
  };

  // 初期読み込み
  useEffect(() => {
    loadAuditLogs();
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // フィルター変更時
  useEffect(() => {
    if (pagination.current !== 1) {
      setPagination({ ...pagination, current: 1 });
    } else {
      loadAuditLogs(1, pagination.pageSize);
    }
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ページネーション変更
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    loadAuditLogs(newPagination.current || 1, newPagination.pageSize || 50);
  };

  // 日付範囲変更
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters({
        ...filters,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD'),
      });
    } else {
      setFilters({
        ...filters,
        start_date: undefined,
        end_date: undefined,
      });
    }
  };

  // フィルタークリア
  const handleClearFilters = () => {
    setFilters({
      action: undefined,
      resource_type: undefined,
      actor_id: undefined,
      search: undefined,
      start_date: undefined,
      end_date: undefined,
    });
  };

  // CSV エクスポート
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const blob = await exportAuditLogsCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${dayjs().format('YYYY-MM-DD')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('CSVファイルをエクスポートしました');
    } catch (error: any) {
      message.error(error.message || 'エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  // JSON エクスポート
  const handleExportJSON = async () => {
    setExportLoading(true);
    try {
      const blob = await exportAuditLogsJSON(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${dayjs().format('YYYY-MM-DD')}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('JSONファイルをエクスポートしました');
    } catch (error: any) {
      message.error(error.message || 'エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  // 詳細表示
  const handleShowDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setDrawerVisible(true);
  };

  // テーブルカラム定義
  const columns: ColumnsType<AuditLog> = [
    {
      title: '日時',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY年MM月DD日 HH:mm:ss')}>
          <Space>
            <ClockCircleOutlined />
            <span>{dayjs(date).format('YYYY/MM/DD HH:mm')}</span>
          </Space>
        </Tooltip>
      ),
      sorter: true,
    },
    {
      title: 'ユーザー',
      dataIndex: 'actor_name',
      key: 'actor_name',
      width: 150,
      render: (name: string, record: AuditLog) => (
        <Space>
          <UserOutlined />
          <div>
            <div>{name}</div>
            {record.actor_email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.actor_email}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'アクション',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: string) => (
        <Tag color={ACTION_COLORS[action] || 'default'}>
          {ACTION_LABELS[action] || action}
        </Tag>
      ),
      filters: Object.entries(ACTION_LABELS).map(([value, text]) => ({
        text,
        value,
      })),
    },
    {
      title: 'リソース種別',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 130,
      render: (type: string) => (
        <Tag color="blue">{RESOURCE_TYPE_LABELS[type] || type}</Tag>
      ),
      filters: Object.entries(RESOURCE_TYPE_LABELS).map(([value, text]) => ({
        text,
        value,
      })),
    },
    {
      title: 'リソース',
      dataIndex: 'resource_name',
      key: 'resource_name',
      ellipsis: true,
      render: (name: string, record: AuditLog) => (
        <Tooltip title={record.resource_id}>
          {name || record.resource_id || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'IPアドレス',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (ip: string) => ip || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: AuditLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleShowDetail(record)}
          size="small"
        >
          詳細
        </Button>
      ),
    },
  ];

  // アクション種別オプション
  const actionOptions = Object.entries(ACTION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // リソース種別オプション
  const resourceTypeOptions = Object.entries(RESOURCE_TYPE_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    })
  );

  return (
    <div className="audit-logs-page">
      <div className="page-header">
        <Title level={2}>
          <FileTextOutlined /> 監査ログ
        </Title>
        <Text type="secondary">
          システム内のすべての操作を監査証跡として記録・閲覧できます
        </Text>
      </div>

      {/* 統計サマリー */}
      {statistics && (
        <Card className="statistics-card" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="総ログ数"
                value={statistics.total_logs}
                suffix="件"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="アクティブユーザー"
                value={statistics.unique_users}
                suffix="人"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最近のアクティビティ"
                value={statistics.recent_activity_count}
                suffix="件"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Badge status="success" text="監査ログ記録中" />
            </Col>
          </Row>
        </Card>
      )}

      <Card>
        {/* フィルターセクション */}
        <div className="filters-section">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Text strong>期間指定</Text>
                  <RangePicker
                    style={{ width: '100%' }}
                    placeholder={['開始日', '終了日']}
                    onChange={handleDateRangeChange}
                    format="YYYY/MM/DD"
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Text strong>アクション種別</Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="すべて"
                    allowClear
                    value={filters.action}
                    onChange={(value) =>
                      setFilters({ ...filters, action: value })
                    }
                    showSearch
                    optionFilterProp="label"
                    options={actionOptions}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Text strong>リソース種別</Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="すべて"
                    allowClear
                    value={filters.resource_type}
                    onChange={(value) =>
                      setFilters({ ...filters, resource_type: value })
                    }
                    showSearch
                    optionFilterProp="label"
                    options={resourceTypeOptions}
                  />
                </Space>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={16}>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  <Text strong>検索</Text>
                  <Input
                    placeholder="ユーザー名、リソース名、IPアドレスなどで検索..."
                    prefix={<SearchOutlined />}
                    allowClear
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    onPressEnter={() => loadAuditLogs(1, pagination.pageSize)}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space
                  style={{
                    width: '100%',
                    justifyContent: 'flex-end',
                    paddingTop: 28,
                  }}
                >
                  <Button
                    icon={<FilterOutlined />}
                    onClick={handleClearFilters}
                  >
                    クリア
                  </Button>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={() => loadAuditLogs(1, pagination.pageSize)}
                  >
                    検索
                  </Button>
                </Space>
              </Col>
            </Row>
          </Space>
        </div>

        {/* アクションバー */}
        <div className="action-bar">
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadAuditLogs(pagination.current, pagination.pageSize)}
              loading={loading}
            >
              更新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              loading={exportLoading}
            >
              CSV エクスポート
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportJSON}
              loading={exportLoading}
            >
              JSON エクスポート
            </Button>
          </Space>
        </div>

        {/* 監査ログテーブル */}
        <Table
          columns={columns}
          dataSource={auditLogs}
          rowKey="audit_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `全 ${total} 件`,
            pageSizeOptions: ['20', '50', '100', '200'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 詳細ドロワー */}
      <Drawer
        title="監査ログ詳細"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={600}
      >
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ログID">
                {selectedLog.audit_id}
              </Descriptions.Item>
              <Descriptions.Item label="日時">
                {dayjs(selectedLog.created_at).format(
                  'YYYY年MM月DD日 HH:mm:ss'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="ユーザーID">
                {selectedLog.actor_id}
              </Descriptions.Item>
              <Descriptions.Item label="ユーザー名">
                {selectedLog.actor_name}
              </Descriptions.Item>
              {selectedLog.actor_email && (
                <Descriptions.Item label="メールアドレス">
                  {selectedLog.actor_email}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="アクション">
                <Tag color={ACTION_COLORS[selectedLog.action] || 'default'}>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="リソース種別">
                <Tag color="blue">
                  {RESOURCE_TYPE_LABELS[selectedLog.resource_type] ||
                    selectedLog.resource_type}
                </Tag>
              </Descriptions.Item>
              {selectedLog.resource_id && (
                <Descriptions.Item label="リソースID">
                  {selectedLog.resource_id}
                </Descriptions.Item>
              )}
              {selectedLog.resource_name && (
                <Descriptions.Item label="リソース名">
                  {selectedLog.resource_name}
                </Descriptions.Item>
              )}
              {selectedLog.ip_address && (
                <Descriptions.Item label="IPアドレス">
                  {selectedLog.ip_address}
                </Descriptions.Item>
              )}
              {selectedLog.user_agent && (
                <Descriptions.Item label="User Agent">
                  <Text code style={{ fontSize: 11 }}>
                    {selectedLog.user_agent}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedLog.details && (
              <div>
                <Text strong>詳細情報:</Text>
                <Card size="small" style={{ marginTop: 8 }}>
                  <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </Card>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;
