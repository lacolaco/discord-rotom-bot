import express from 'express';
import { searchPokemonByName } from './discord/pokeinfo/search';

export async function startServer(port: string | number) {
  const app = express();
  app.use(express.json());

  app.get('/', async (req, res) => {
    res.status(200).send('OK');
  });

  app.get('/pokeinfo', async (req, res) => {
    const { name } = req.query;
    if (!name) {
      res.status(400).send('Bad Request');
      return;
    }
    const data = await searchPokemonByName(name as string);
    if (data) {
      res.status(200).send(data);
    } else {
      res.status(404).send('Not Found');
    }
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
