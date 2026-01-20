import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
} from 'antd';
import {
  CloudOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

const { Title, Text } = Typography;
const { TextArea } = Input;

dayjs.locale('ja');

// ダミーデータ
const tasksData = [
  {
    task_id: '1',
    ticket_id: 'uuid-1',
    ticket_number: 'HD-2024-00015',
    task_type: 'license_assign',
    state: 'approved',
    target_upn: 'yamada@example.com',
    task_details: {
      skuId: 'SPE_E5',
      licenseName: 'Microsoft 365 E5',
    },
    scheduled_at: '2024-01-20T15:00:00Z',
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    task_id: '2',
    ticket_id: 'uuid-2',
    ticket_number: 'HD-2024-00012',
    task_type: 'teams_create',
    state: 'approved',
    target_resource_name: '営業部 プロジェクトチーム',
    task_details: {
      teamName: '営業部 プロジェクトチーム',
      description: '2024年度 営業プロジェクト用',
    },
    scheduled_at: null,
    created_at: '2024-01-19T14:30:00Z',
  },
  {
    task_id: '3',
    ticket_id: 'uuid-3',
    ticket_number: 'HD-2024-00008',
    task_type: 'password_reset',
    state: 'completed',
    target_upn: 'tanaka@example.com',
    task_details: {},
    completed_at: '2024-01-18T10:30:00Z',
    created_at: '2024-01-18T09:15:00Z',
  },
];

const M365TaskList = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [form] = Form.useForm();

  const taskTypeLabels: Record<string, string> = {
    license_assign: 'ライセンス付与',
    license_remove: 'ライセンス削除',
    password_reset: 'パスワードリセット',
    mfa_reset: 'MFAリセット',
    mailbox_permission: 'メールボックス権限',
    group_membership: 'グループメンバーシップ',
    teams_create: 'Teams作成',
    teams_owner_change: 'Teams所有者変更',
    onedrive_restore: 'OneDrive復元',
    onedrive_share_remove: 'OneDrive共有解除',
    offboarding: '退職者処理',
  };

  const stateColors: Record<string, string> = {
    pending: 'orange',
    approved: 'blue',
    in_progress: 'processing',
    completed: 'success',
    failed: 'error',
    canceled: 'default',
  };

  const stateLabels: Record<string, string> = {
    pending: '承認待ち',
    approved: '承認済み',
    in_progress: '実施中',
    completed: '完了',
    failed: '失敗',
    canceled: '取消',
  };

  const handleExecute = (record: any) => {
    setSelectedTask(record);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 実際はAPIを呼び出す
      setTimeout(() => {
        message.success('実施ログを記録しました');
        setModalVisible(false);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: 'チケット番号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
    },
    {
      title: 'タスク種別',
      dataIndex: 'task_type',
      key: 'task_type',
      render: (type: string) => taskTypeLabels[type] || type,
    },
    {
      title: '対象',
      key: 'target',
      render: (_: any, record: any) =>
        record.target_upn || record.target_resource_name || '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => (
        <Tag color={stateColors[state]}>{stateLabels[state]}</Tag>
      ),
    },
    {
      title: '実施予定',
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY/MM/DD HH:mm') : '未定',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => {
        if (record.state === 'approved') {
          return (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => handleExecute(record)}
            >
              実施
            </Button>
          );
        }
        return '-';
      },
    },
  ];

  return (
    <div>
      <Title level={2}>
        <CloudOutlined /> Microsoft 365 タスク
      </Title>

      <Card>
        <Table
          columns={columns}
          dataSource={tasksData}
          rowKey="task_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </Card>

      <Modal
        title="M365タスク実施ログ"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        okText="記録する"
        cancelText="キャンセル"
        width={700}
      >
        {selectedTask && (
          <Form form={form} layout="vertical">
            <div style={{ marginBottom: 16 }}>
              <Text strong>タスク種別: </Text>
              <Text>{taskTypeLabels[selectedTask.task_type]}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>対象: </Text>
              <Text>
                {selectedTask.target_upn || selectedTask.target_resource_name}
              </Text>
            </div>

            <Form.Item
              name="method"
              label="実施方法"
              rules={[{ required: true, message: '実施方法を選択してください' }]}
            >
              <Select placeholder="選択してください">
                <Select.Option value="admin_center">管理センター</Select.Option>
                <Select.Option value="powershell">PowerShell</Select.Option>
                <Select.Option value="graph_api">Graph API</Select.Option>
                <Select.Option value="manual">手動（その他）</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="command_or_screen"
              label="実施内容"
              rules={[{ required: true, message: '実施内容を入力してください' }]}
            >
              <TextArea
                rows={4}
                placeholder="PowerShellコマンドまたは操作画面の説明を入力してください"
              />
            </Form.Item>

            <Form.Item
              name="result"
              label="実施結果"
              rules={[{ required: true, message: '実施結果を選択してください' }]}
            >
              <Select placeholder="選択してください">
                <Select.Option value="success">成功</Select.Option>
                <Select.Option value="partial_success">部分的成功</Select.Option>
                <Select.Option value="failed">失敗</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="result_message" label="結果メッセージ">
              <TextArea rows={3} placeholder="結果の詳細を入力してください" />
            </Form.Item>

            <Form.Item
              name="evidence"
              label="エビデンス（スクリーンショットまたは実行結果）"
              rules={[{ required: true, message: 'エビデンスは必須です' }]}
            >
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>ファイルを選択</Button>
              </Upload>
            </Form.Item>

            <Form.Item name="rollback_procedure" label="ロールバック手順">
              <TextArea
                rows={3}
                placeholder="変更操作の場合、ロールバック手順を記載してください"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default M365TaskList;
