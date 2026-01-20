import { Card, Space, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TicketTrendData {
  date: string;
  new: number;
  resolved: number;
  total: number;
}

interface TicketTrendChartProps {
  data?: TicketTrendData[];
}

/**
 * チケットトレンドチャート
 *
 * 将来的にChart.jsまたはrecharts等のライブラリで実装可能
 * 現在はシンプルなバーチャートを表示
 */
const TicketTrendChart: React.FC<TicketTrendChartProps> = ({ data = [] }) => {
  // サンプルデータ（実際はAPIから取得）
  const sampleData: TicketTrendData[] = data.length > 0 ? data : [
    { date: '1/15', new: 12, resolved: 8, total: 45 },
    { date: '1/16', new: 15, resolved: 10, total: 50 },
    { date: '1/17', new: 10, resolved: 12, total: 48 },
    { date: '1/18', new: 18, resolved: 15, total: 51 },
    { date: '1/19', new: 14, resolved: 16, total: 49 },
    { date: '1/20', new: 16, resolved: 14, total: 51 },
    { date: '1/21', new: 13, resolved: 11, total: 53 },
  ];

  const maxValue = Math.max(...sampleData.flatMap(d => [d.new, d.resolved]));

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>週次トレンド</span>
        </Space>
      }
      bordered={false}
    >
      <div style={{ padding: '16px 0' }}>
        {/* 凡例 */}
        <Space style={{ marginBottom: 16 }}>
          <Space>
            <div style={{ width: 16, height: 16, background: '#1890ff', borderRadius: 2 }} />
            <Text>新規</Text>
          </Space>
          <Space>
            <div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 2 }} />
            <Text>解決</Text>
          </Space>
        </Space>

        {/* シンプルバーチャート */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 200 }}>
          {sampleData.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                gap: 4,
              }}
            >
              {/* バーグループ */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 160,
                }}
              >
                {/* 新規バー */}
                <div
                  style={{
                    width: 20,
                    height: `${(item.new / maxValue) * 100}%`,
                    background: '#1890ff',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`新規: ${item.new}`}
                />
                {/* 解決バー */}
                <div
                  style={{
                    width: 20,
                    height: `${(item.resolved / maxValue) * 100}%`,
                    background: '#52c41a',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`解決: ${item.resolved}`}
                />
              </div>
              {/* 日付ラベル */}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.date}
              </Text>
            </div>
          ))}
        </div>

        {/* 統計サマリー */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>週平均 新規</Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>
              {Math.round(sampleData.reduce((sum, d) => sum + d.new, 0) / sampleData.length)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>週平均 解決</Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
              {Math.round(sampleData.reduce((sum, d) => sum + d.resolved, 0) / sampleData.length)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TicketTrendChart;
