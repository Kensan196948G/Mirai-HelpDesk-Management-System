import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '50px 0' }}>
      <Result
        status="404"
        title="404"
        subTitle="お探しのページが見つかりませんでした。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            ダッシュボードに戻る
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
