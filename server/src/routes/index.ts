/** Central API router — mounts all route modules under /api. */
import { Router } from 'express';
import dailyRouter from './daily.js';
import artistRouter from './artist.js';
import playlistRouter from './playlist.js';
import validateRouter from './validate.js';
import searchRouter from './search.js';
import audioRouter from './audio.js';
import imageProxyRouter from './imageProxy.js';
import discordRouter from './discord.js';
import discordResultsRouter from './discordResults.js';

const router = Router();

router.use(audioRouter);
router.use(imageProxyRouter);
router.use(discordRouter);
router.use(discordResultsRouter);
router.use(dailyRouter);
router.use(artistRouter);
router.use(playlistRouter);
router.use(validateRouter);
router.use(searchRouter);

export default router;
