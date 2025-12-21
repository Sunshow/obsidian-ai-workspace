import { Router, Request, Response } from 'express';
import { fetchNote } from '../tasks/fetch-note';

const router = Router();

interface FetchNoteRequest {
  url: string;
  targetDir?: string;
  filename?: string;
}

router.post('/fetch-note', async (req: Request, res: Response) => {
  try {
    const { url, targetDir, filename } = req.body as FetchNoteRequest;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const result = await fetchNote({
      url,
      targetDir: targetDir || '/vaults/inbox',
      filename
    });

    res.json({
      success: true,
      message: 'Note created successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in fetch-note:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
