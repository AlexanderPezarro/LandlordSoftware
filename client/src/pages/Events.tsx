import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

export const Events: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Events
        </Typography>
        <Paper
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 200,
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Event Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This feature is coming soon
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};
