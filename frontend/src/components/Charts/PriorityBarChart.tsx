import { Card, Space, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PriorityData {
  P1: number;
  P2: number;
  P3: number;
  P4: number;
}

interface PriorityBarChartProps {
  data: PriorityData;
}

/**
 * 優先度別チケット数横棒グラフ
 */
const PriorityBarChart: React.FC<PriorityBarChartProps> = ({ data }) => {
  const priorities = [
    { key: 'P1', label: 'P1 - 緊急', color: '#ff4d4f', value: data.P1 },
    { key: 'P2', label: 'P2 - 高', color: '#faad14', value: data.P2 },
    { key: 'P3', label: 'P3 - 中', color: '#1890ff', value: data.P3 },
    { key: 'P4', label: 'P4 - 低', color: '#52c41a', value: data.P4 },
  ];

  const total = priorities.reduce((sum, p) => sum + p.value, 0);
  const maxValue = Math.max(...priorities.map(p => p.value), 1);

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>優先度別チケット数</span>
        </Space>
      }
      variant="borderless"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {priorities.map((priority) => {
          const percentage = total > 0 ? Math.round((priority.value / total) * 100) : 0;
          const barWidth = maxValue > 0 ? Math.round((priority.value / maxValue) * 100) : 0;

          return (
            <div key={priority.key}>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: priority.color,
                      borderRadius: 2,
                    }}
                  />
                  <Text strong>{priority.label}</Text>
                </Space>
                <Space>
                  <Text strong style={{ fontSize: 18, color: priority.color }}>
                    {priority.value}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({percentage}%)
                  </Text>
                </Space>
              </Space>
              <div
                style={{
                  width: '100%',
                  height: 24,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: priority.color,
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                  }}
                >
                  {priority.value > 0 && (
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {priority.value}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 合計 */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 16,
            borderTop: '2px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong style={{ fontSize: 16 }}>合計</Text>
          <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
            {total} 件
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default PriorityBarChart;
