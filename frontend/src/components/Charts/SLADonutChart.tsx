import { Card, Space, Typography, Progress } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface SLADonutChartProps {
  achievementRate: number;
  compliant: number;
  overdue: number;
}

/**
 * SLA達成率ドーナツチャート
 *
 * 将来的にChart.jsまたはrecharts等のライブラリで実装可能
 * 現在はProgressコンポーネントで表示
 */
const SLADonutChart: React.FC<SLADonutChartProps> = ({
  achievementRate,
  compliant,
  overdue,
}) => {
  return (
    <Card
      title={
        <Space>
          <PieChartOutlined />
          <span>SLA達成率</span>
        </Space>
      }
      bordered={false}
    >
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        {/* メイン円グラフ */}
        <Progress
          type="circle"
          percent={achievementRate}
          format={(percent) => (
            <div>
              <Title level={2} style={{ margin: 0 }}>
                {percent}%
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                達成率
              </Text>
            </div>
          )}
          strokeColor={achievementRate >= 95 ? '#52c41a' : achievementRate >= 85 ? '#faad14' : '#ff4d4f'}
          width={180}
          strokeWidth={10}
        />

        {/* 詳細情報 */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: '#52c41a',
                borderRadius: '50%',
                display: 'inline-block',
                marginBottom: 8,
              }}
            />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                期限内
              </Text>
              <Text strong style={{ fontSize: 18 }}>
                {compliant}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {' '}件
              </Text>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: '#ff4d4f',
                borderRadius: '50%',
                display: 'inline-block',
                marginBottom: 8,
              }}
            />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                期限超過
              </Text>
              <Text strong style={{ fontSize: 18 }}>
                {overdue}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {' '}件
              </Text>
            </div>
          </div>
        </div>

        {/* SLA目標 */}
        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            background: '#f0f5ff',
            borderRadius: 8,
            border: '1px solid #adc6ff',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            目標: <Text strong style={{ fontSize: 14 }}>95%</Text> 以上
          </Text>
          {achievementRate >= 95 ? (
            <div style={{ marginTop: 4 }}>
              <Text style={{ color: '#52c41a', fontSize: 12 }}>
                ✓ 目標達成
              </Text>
            </div>
          ) : (
            <div style={{ marginTop: 4 }}>
              <Text style={{ color: '#ff4d4f', fontSize: 12 }}>
                ⚠ 目標未達 (あと {95 - achievementRate}% 必要)
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SLADonutChart;
