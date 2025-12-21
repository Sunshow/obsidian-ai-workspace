import express from 'express';
import fetchRouter from './routes/fetch';

const app = express();
const PORT = process.env.AGENT_PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/fetch', fetchRouter);

app.listen(PORT, () => {
  console.log(`Puppeteer Executor running on port ${PORT}`);
});
