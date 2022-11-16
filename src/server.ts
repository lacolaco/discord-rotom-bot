import express from 'express';

export async function startServer(port: string | number) {
  const app = express();

  app.get('/', async (req, res) => {
    res.status(200).send('OK');
  });

  app.get('/_ah/warmup', (req, res) => {
    res.status(200).send('OK');
  });

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Listening on ${port}`);
      resolve();
    });
  });
}
