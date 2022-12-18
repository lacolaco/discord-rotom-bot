import express from 'express';
import { DiscordApp } from './discord';
import { searchPokemonByName } from './discord/pokeinfo/search';
import { getNewsNotification } from './news/check-news';

export async function startServer(
  discordApp: DiscordApp,
  port: string | number,
  newsSubscriberRoleId: string,
) {
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

  app.post('/check-news', async (req, res) => {
    const { channelId } = req.body;
    if (!channelId || typeof channelId !== 'string') {
      res.status(400).send('Bad Request');
      return;
    }
    try {
      const notification = await getNewsNotification(newsSubscriberRoleId);
      if (notification) {
        await discordApp.sendMessage(channelId, notification);
        res.status(200).send(notification);
      } else {
        res.status(200).send('No new news');
      }
    } catch (e) {
      console.error(e);
      res.status(500);
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
