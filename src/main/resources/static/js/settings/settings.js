/* ==========================================================================
   settings.js — tela de Configurações da Administração (somente ADMINISTRATOR).

   Usuários, funções e setores (js/settings/sections.js) sobre o controlador
   genérico de js/settings/settings-page.js.
   ========================================================================== */

import { initSettingsPage } from './settings-page.js';
import { SECTIONS } from './sections.js';

initSettingsPage(SECTIONS, { pageTitle: 'Configurações' });
