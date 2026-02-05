import { useState, useEffect } from 'react';
import { m365Service, M365Task } from '@services/m365Service';
import {
  Card,
  Table,
  Tag,
  Button,
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
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

const { Title, Text } = Typography;
const { TextArea } = Input;

dayjs.locale('ja');

const M365TaskList = () => {
  const [tasks, setTasks] = useState<M365Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<M365Task | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [form] = Form.useForm();

  // データ取得
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await m365Service.getTasks({ state: 'approved,in_progress,completed' });

      if (response.success && response.data) {
        setTasks(response.data.tasks || []);
      } else {
        message.error(response.error?.message || 'M365タスクの取得に失敗しました');
      }
    } catch (error: any) {
      console.error('M365タスク取得エラー:', error);
      message.error('M365タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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

      if (fileList.length === 0) {
        message.error('エビデンスファイルは必須です');
        return;
      }

      setSubmitting(true);

      const logData = {
        method: values.method,
        command_or_screen: values.command_or_screen,
        result: values.result,
        result_message: values.result_message,
        evidence: fileList[0].originFileObj || fileList[0],
        rollback_procedure: values.rollback_procedure,
      };

      const response = await m365Service.executeTask(selectedTask!.task_id, logData);

      if (response.success) {
        message.success('実施ログを記録しました');
        setModalVisible(false);
        setFileList([]);
        form.resetFields();
        fetchTasks(); // 再読み込み
      } else {
        message.error(response.error?.message || '実施ログの記録に失敗しました');
      }
    } catch (error: any) {
      console.error('実施ログ記録エラー:', error);
      message.error('入力内容を確認してください');
    } finally {
      setSubmitting(false);
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
          dataSource={tasks}
          rowKey="task_id"
          loading={loading}
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
        onCancel={() => {
          setModalVisible(false);
          setFileList([]);
          form.resetFields();
        }}
        confirmLoading={submitting}
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
                beforeUpload={(file) => {
                  setFileList([file]);
                  return false; // 自動アップロードを無効化
                }}
                onRemove={() => {
                  setFileList([]);
                }}
                fileList={fileList}
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
