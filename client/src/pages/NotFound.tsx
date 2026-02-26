import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import styles from './NotFound.module.scss';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.errorCode}>404</h1>
          <h2 className={styles.title}>Page Not Found</h2>
          <p className={styles.description}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Button
            variant="primary"
            startIcon={<Home size={20} />}
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </Container>
  );
};
