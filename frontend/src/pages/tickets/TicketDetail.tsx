import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Timeline,
  Button,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Divider,
  Row,
  Col,
  Spin,
  Alert,
  message,
  Radio,
  Tabs,
  Upload,
  List,
  Avatar,
} from 'antd';
import type { TabsProps, UploadFile } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  FileOutlined,
  HistoryOutlined,
  CommentOutlined,
  CloudServerOutlined,
  UploadOutlined,
  DownloadOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import {
  getTicketDetail,
  addComment,
  updateTicketStatus,
  uploadAttachment,
} from '@services/ticketService';
import { useAuthStore } from '@store/authStore';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
  TicketStatus,
  UserRole,
} from '@types/index';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

dayjs.extend(relativeTime);
dayjs.locale('ja');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// アクション表示名マッピング
const ACTION_LABELS: Record<string, string> = {
  created: 'チケット作成',
  updated: '更新',
  status_changed: 'ステータス変更',
  priority_changed: '優先度変更',
  category_changed: 'カテゴリ変更',
  assigned: '担当者割当',
  reassigned: '担当者変更',
  resolved: '解決',
  closed: '完了',
  reopened: '再開',
  commented: 'コメント追加',
};

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [commentForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('comments');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // チケット詳細取得
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ticket-detail', id],
    queryFn: () => getTicketDetail(id!),
    enabled: !!id,
  });

  // コメント追加
  const addCommentMutation = useMutation({
    mutationFn: ({ body, visibility }: { body: string; visibility: 'public' | 'internal' }) =>
      addComment(id!, body, visibility),
    onSuccess: (response) => {
      if (response.success) {
        message.success('コメントを追加しました');
        commentForm.resetFields();
        refetch();
      } else {
        message.error(response.error?.message || 'コメントの追加に失敗しました');
      }
    },
    onError: () => {
      message.error('コメントの追加に失敗しました');
    },
  });

  // ステータス更新
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updateTicketStatus(id!, status, reason),
    onSuccess: (response) => {
      if (response.success) {
        message.success('ステータスを更新しました');
        queryClient.invalidateQueries({ queryKey: ['ticket-detail', id] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      } else {
        message.error(response.error?.message || 'ステータスの更新に失敗しました');
      }
    },
    onError: () => {
      message.error('ステータスの更新に失敗しました');
    },
  });

  // ファイルアップロード
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(id!, file),
    onSuccess: (response) => {
      if (response.success) {
        message.success('ファイルをアップロードしました');
        setFileList([]);
        refetch();
      } else {
        message.error(response.error?.message || 'アップロードに失敗しました');
      }
    },
    onError: () => {
      message.error('アップロードに失敗しました');
    },
  });

  const handleCommentSubmit = (values: { body: string; visibility: 'public' | 'internal' }) => {
    addCommentMutation.mutate(values);
  };

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({ status });
  };

  const handleFileUpload = () => {
    if (fileList.length === 0) {
      message.warning('アップロードするファイルを選択してください');
      return;
    }

    const file = fileList[0].originFileObj as File;
    uploadMutation.mutate(file);
  };

  // ステータス遷移可能かチェック（Agent以上のロール）
  const canUpdateStatus = user && [
    UserRole.AGENT,
    UserRole.M365_OPERATOR,
    UserRole.APPROVER,
    UserRole.MANAGER,
  ].includes(user.role as UserRole);

  // 利用可能なステータス遷移を定義
  const getAvailableStatuses = (currentStatus: string): string[] => {
    const statusMap: Record<string, string[]> = {
      [TicketStatus.NEW]: [TicketStatus.TRIAGE, TicketStatus.CANCELED],
      [TicketStatus.TRIAGE]: [TicketStatus.ASSIGNED, TicketStatus.CANCELED],
      [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.IN_PROGRESS]: [
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.PENDING_APPROVAL,
        TicketStatus.PENDING_CHANGE_WINDOW,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELED,
      ],
      [TicketStatus.PENDING_CUSTOMER]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.PENDING_APPROVAL]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.PENDING_CHANGE_WINDOW]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS],
    };

    return statusMap[currentStatus] || [];
  };

  // ファイルサイズフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="読み込み中..." />
      </div>
    );
  }

  if (error || !data?.success || !data.data) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="エラー"
          description="チケット情報の取得に失敗しました"
          type="error"
          showIcon
        />
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/tickets')}
        >
          チケット一覧に戻る
        </Button>
      </div>
    );
  }

  const { ticket, comments, attachments, history } = data.data;
  const availableStatuses = getAvailableStatuses(ticket.status);

  // タブアイテム
  const tabItems: TabsProps['items'] = [
    {
      key: 'comments',
      label: (
        <span>
          <CommentOutlined />
          コメント ({comments.length})
        </span>
      ),
      children: (
        <div>
          {comments && comments.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={comments}
              renderItem={(comment) => (
                <List.Item key={comment.comment_id}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{comment.author_name}</Text>
                        {comment.visibility === 'internal' && (
                          <Tag color="orange">内部メモ</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        {dayjs(comment.created_at).format('YYYY/MM/DD HH:mm')}
                        {' '}
                        ({dayjs(comment.created_at).fromNow()})
                      </Text>
                    }
                  />
                  <Paragraph style={{ whiteSpace: 'pre-wrap', marginLeft: 48 }}>
                    {comment.body}
                  </Paragraph>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">コメントがありません</Text>
          )}

          <Divider />

          <Form
            form={commentForm}
            onFinish={handleCommentSubmit}
            initialValues={{ visibility: 'public' }}
          >
            <Form.Item
              name="body"
              rules={[{ required: true, message: 'コメントを入力してください' }]}
            >
              <TextArea
                rows={4}
                placeholder="コメントを入力してください"
              />
            </Form.Item>

            {canUpdateStatus && (
              <Form.Item name="visibility">
                <Radio.Group>
                  <Radio value="public">公開（依頼者も閲覧可能）</Radio>
                  <Radio value="internal">内部メモ（担当者のみ）</Radio>
                </Radio.Group>
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={addCommentMutation.isPending}
                icon={<CommentOutlined />}
              >
                コメントを追加
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'attachments',
      label: (
        <span>
          <PaperClipOutlined />
          添付ファイル ({attachments.length})
        </span>
      ),
      children: (
        <div>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title="ファイルアップロード" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={() => false}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>ファイルを選択</Button>
                </Upload>
                <Text type="secondary">
                  対応ファイル: .txt, .pdf, .doc, .docx, .xls, .xlsx, .png, .jpg (最大10MB)
                </Text>
                <Button
                  type="primary"
                  onClick={handleFileUpload}
                  loading={uploadMutation.isPending}
                  disabled={fileList.length === 0}
                >
                  アップロード
                </Button>
              </Space>
            </Card>

            <List
              itemLayout="horizontal"
              dataSource={attachments}
              locale={{ emptyText: '添付ファイルがありません' }}
              renderItem={(attachment) => (
                <List.Item
                  key={attachment.id}
                  actions={[
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      href={`/api/tickets/${id}/attachments/${attachment.id}/download`}
                      target="_blank"
                    >
                      ダウンロード
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<FileOutlined />} />}
                    title={attachment.original_filename}
                    description={
                      <Space split="|">
                        <Text type="secondary">{formatFileSize(attachment.size)}</Text>
                        <Text type="secondary">{attachment.uploader_name}</Text>
                        <Text type="secondary">
                          {dayjs(attachment.created_at).format('YYYY/MM/DD HH:mm')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Space>
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          履歴 ({history.length})
        </span>
      ),
      children: (
        <Timeline
          items={history.map((entry) => {
            let description = ACTION_LABELS[entry.action] || entry.action;

            if (entry.field_name && entry.before && entry.after) {
              description = `${description}: ${entry.before} → ${entry.after}`;
            }

            return {
              children: (
                <>
                  <Text strong>{entry.actor_name || 'システム'}</Text>
                  <br />
                  <Text>{description}</Text>
                  {entry.reason && (
                    <>
                      <br />
                      <Text type="secondary" italic>理由: {entry.reason}</Text>
                    </>
                  )}
                  <br />
                  <Text type="secondary">
                    {dayjs(entry.created_at).format('YYYY/MM/DD HH:mm:ss')}
                  </Text>
                </>
              ),
            };
          })}
        />
      ),
    },
    {
      key: 'm365',
      label: (
        <span>
          <CloudServerOutlined />
          M365タスク
        </span>
      ),
      children: (
        <Alert
          message="M365タスク"
          description="M365操作タスクの表示機能は開発中です"
          type="info"
          showIcon
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
        >
          戻る
        </Button>
      </Space>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          {/* 基本情報カード */}
          <Card
            title={
              <Space>
                <Text strong style={{ fontSize: 18 }}>
                  {ticket.ticket_number}
                </Text>
                <Tag color={STATUS_COLORS[ticket.status]}>
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </Tag>
                <Tag color={PRIORITY_COLORS[ticket.priority]}>
                  {ticket.priority}
                </Tag>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Title level={3} style={{ marginTop: 0 }}>
              {ticket.subject}
            </Title>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="タイプ">
                {TICKET_TYPE_LABELS[ticket.type] || ticket.type}
              </Descriptions.Item>
              <Descriptions.Item label="カテゴリ">
                {ticket.category_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="依頼者">
                {ticket.requester_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="担当者">
                {ticket.assignee_name || '未割当'}
              </Descriptions.Item>
              <Descriptions.Item label="影響度">
                {ticket.impact}
              </Descriptions.Item>
              <Descriptions.Item label="緊急度">
                {ticket.urgency}
              </Descriptions.Item>
              <Descriptions.Item label="作成日時">
                {dayjs(ticket.created_at).format('YYYY/MM/DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="更新日時">
                {dayjs(ticket.updated_at).format('YYYY/MM/DD HH:mm')}
              </Descriptions.Item>
              {ticket.response_due_at && (
                <Descriptions.Item label="初動対応期限">
                  <Space>
                    <ClockCircleOutlined />
                    {dayjs(ticket.response_due_at).format('YYYY/MM/DD HH:mm')}
                  </Space>
                </Descriptions.Item>
              )}
              {ticket.due_at && (
                <Descriptions.Item label="解決期限">
                  <Space>
                    <ClockCircleOutlined />
                    {dayjs(ticket.due_at).format('YYYY/MM/DD HH:mm')}
                  </Space>
                </Descriptions.Item>
              )}
              {ticket.resolved_at && (
                <Descriptions.Item label="解決日時">
                  {dayjs(ticket.resolved_at).format('YYYY/MM/DD HH:mm')}
                </Descriptions.Item>
              )}
              {ticket.closed_at && (
                <Descriptions.Item label="完了日時">
                  {dayjs(ticket.closed_at).format('YYYY/MM/DD HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">説明</Divider>
            <Paragraph
              style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {ticket.description}
            </Paragraph>

            {ticket.resolution_summary && (
              <>
                <Divider orientation="left">解決サマリー</Divider>
                <Paragraph
                  style={{
                    padding: '16px',
                    backgroundColor: '#f6ffed',
                    borderRadius: 4,
                    border: '1px solid #b7eb8f',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {ticket.resolution_summary}
                </Paragraph>
              </>
            )}

            {ticket.root_cause && (
              <>
                <Divider orientation="left">根本原因</Divider>
                <Paragraph
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff7e6',
                    borderRadius: 4,
                    border: '1px solid #ffd591',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {ticket.root_cause}
                </Paragraph>
              </>
            )}
          </Card>

          {/* タブナビゲーション */}
          <Card bodyStyle={{ padding: '16px 0' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              style={{ padding: '0 24px' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* ステータス更新カード */}
          {canUpdateStatus && availableStatuses.length > 0 && (
            <Card title="ステータス更新" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">現在のステータス:</Text>
                <Tag color={STATUS_COLORS[ticket.status]} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </Tag>

                <Divider style={{ margin: '16px 0' }} />

                <Text type="secondary">変更可能なステータス:</Text>
                {availableStatuses.map((status) => (
                  <Button
                    key={status}
                    block
                    onClick={() => handleStatusUpdate(status)}
                    loading={updateStatusMutation.isPending}
                  >
                    {STATUS_LABELS[status] || status}
                  </Button>
                ))}
              </Space>
            </Card>
          )}

          {/* SLA情報カード */}
          {ticket.due_at && (
            <Card title="SLA情報" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">解決期限:</Text>
                  <br />
                  <Text strong>
                    {dayjs(ticket.due_at).format('YYYY/MM/DD HH:mm')}
                  </Text>
                  <br />
                  <Text type={dayjs().isAfter(dayjs(ticket.due_at)) ? 'danger' : 'secondary'}>
                    ({dayjs(ticket.due_at).fromNow()})
                  </Text>
                </div>
                {ticket.response_due_at && (
                  <div>
                    <Text type="secondary">初動対応期限:</Text>
                    <br />
                    <Text strong>
                      {dayjs(ticket.response_due_at).format('YYYY/MM/DD HH:mm')}
                    </Text>
                    <br />
                    <Text type={dayjs().isAfter(dayjs(ticket.response_due_at)) ? 'danger' : 'secondary'}>
                      ({dayjs(ticket.response_due_at).fromNow()})
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          )}

          {/* 簡易タイムライン */}
          <Card title="主要イベント">
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>チケット作成</Text>
                      <br />
                      <Text type="secondary">
                        {dayjs(ticket.created_at).format('YYYY/MM/DD HH:mm')}
                      </Text>
                    </>
                  ),
                },
                ...(ticket.resolved_at
                  ? [
                      {
                        color: 'green',
                        children: (
                          <>
                            <Text strong>解決</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(ticket.resolved_at).format('YYYY/MM/DD HH:mm')}
                            </Text>
                          </>
                        ),
                      },
                    ]
                  : []),
                ...(ticket.closed_at
                  ? [
                      {
                        color: 'gray',
                        children: (
                          <>
                            <Text strong>完了</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(ticket.closed_at).format('YYYY/MM/DD HH:mm')}
                            </Text>
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TicketDetail;
