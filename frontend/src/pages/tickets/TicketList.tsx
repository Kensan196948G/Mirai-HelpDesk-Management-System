import React, { useState } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Row,
  Col,
  Typography,
  message,
} from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { getTickets, type Ticket } from '@services/ticketService';
import {
  TicketStatus,
  PriorityLevel,
  TicketType,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
} from '@types/index';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const TicketList: React.FC = () => {
  const navigate = useNavigate();

  // フィルタとページネーションの状態管理
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    type: undefined as string | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  // React Query でチケット一覧を取得
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tickets', filters, pagination],
    queryFn: async () => {
      const result = await getTickets({
        status: filters.status,
        priority: filters.priority,
        type: filters.type,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'チケット一覧の取得に失敗しました');
      }

      return result;
    },
    retry: 1,
    staleTime: 30000, // 30秒間はキャッシュを使用
  });

  // エラー時のメッセージ表示
  React.useEffect(() => {
    if (isError) {
      message.error(error?.message || 'チケット一覧の取得に失敗しました');
    }
  }, [isError, error]);

  // チケットデータの取得
  const tickets = response?.data?.tickets || [];
  const total = response?.meta?.total || 0;

  // テーブルカラムの定義
  const columns: ColumnsType<Ticket> = [
    {
      title: 'チケット番号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 150,
      fixed: 'left',
      render: (text: string, record: Ticket) => (
        <Button
          type="link"
          onClick={() => navigate(`/tickets/${record.ticket_id}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => (
        <Tag color="default">{TICKET_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '件名',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (text: string) => (
        <span title={text}>{text}</span>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || status}
        </Tag>
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
      title: '依頼者',
      dataIndex: 'requester_name',
      key: 'requester_name',
      width: 120,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '担当者',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 120,
      ellipsis: true,
      render: (text: string) => text || '未割当',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '期限',
      dataIndex: 'due_at',
      key: 'due_at',
      width: 170,
      render: (date: string) => {
        if (!date) return '-';
        const dueDate = dayjs(date);
        const now = dayjs();
        const isOverdue = dueDate.isBefore(now);
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dueDate.format('YYYY/MM/DD HH:mm')}
          </span>
        );
      },
    },
  ];

  // フィルタ変更ハンドラ
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 })); // フィルタ変更時は1ページ目に戻る
  };

  // 検索ハンドラ
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // フィルタリセット
  const handleReset = () => {
    setFilters({
      status: undefined,
      priority: undefined,
      type: undefined,
      search: '',
    });
    setPagination({ current: 1, pageSize: 20 });
  };

  // テーブルページネーション変更ハンドラ
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination({
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20,
    });
  };

  // 新規チケット作成
  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* ヘッダー */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }} id="page-title">
              チケット一覧
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTicket}
              >
                新規チケット
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                更新
              </Button>
            </Space>
          </Col>
        </Row>

        {/* フィルタエリア */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="ステータス"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              id="status-filter"
              data-testid="status-filter"
            >
              {Object.values(TicketStatus).map((status) => (
                <Option key={status} value={status}>
                  <Tag color={STATUS_COLORS[status] || 'default'}>
                    {STATUS_LABELS[status] || status}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="優先度"
              allowClear
              style={{ width: '100%' }}
              value={filters.priority}
              onChange={(value) => handleFilterChange('priority', value)}
              id="priority-filter"
              data-testid="priority-filter"
            >
              {Object.values(PriorityLevel).map((priority) => (
                <Option key={priority} value={priority}>
                  <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="タイプ"
              allowClear
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
            >
              {Object.values(TicketType).map((type) => (
                <Option key={type} value={type}>
                  {TICKET_TYPE_LABELS[type] || type}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space.Compact style={{ width: '100%' }}>
              <Search
                placeholder="件名で検索"
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </Space.Compact>
          </Col>
        </Row>

        {/* リセットボタン */}
        {(filters.status || filters.priority || filters.type || filters.search) && (
          <Row style={{ marginBottom: 16 }}>
            <Col>
              <Button onClick={handleReset}>フィルタをリセット</Button>
            </Col>
          </Row>
        )}

        {/* テーブル */}
        <Table<Ticket>
          columns={columns}
          dataSource={tickets}
          rowKey="ticket_id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `全 ${total} 件`,
            pageSizeOptions: ['10', '20', '50', '100'],
            className: 'pagination',
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default TicketList;
