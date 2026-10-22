import '@fontsource/shrikhand/400.css';
import '@fontsource-variable/bricolage-grotesque';
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { initNav } from './ui/nav';
import { initOdometer } from './ui/odometer';
import { initReveal } from './ui/reveal';
import { initMagnetic } from './ui/magnetic';
import { initExtras } from './ui/extras';
import { initStage } from './ui/stage';

initNav();
initOdometer();
initReveal();
initMagnetic();
initExtras();
initStage();
