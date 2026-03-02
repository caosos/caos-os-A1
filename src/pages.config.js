/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import TerminalBlueprint from './pages/TerminalBlueprint';
import Welcome from './pages/Welcome';
import Chat from './pages/Chat';
import Console from './pages/Console';
import News from './pages/News';
import Admin from './pages/Admin';
import Implementation from './pages/Implementation';
import MemoryIsolation from './pages/MemoryIsolation';
import Logs from './pages/Logs';
import SystemBlueprint from './pages/SystemBlueprint';


export const PAGES = {
    "TerminalBlueprint": TerminalBlueprint,
    "Welcome": Welcome,
    "Chat": Chat,
    "Console": Console,
    "News": News,
    "Admin": Admin,
    "Implementation": Implementation,
    "MemoryIsolation": MemoryIsolation,
    "Logs": Logs,
    "SystemBlueprint": SystemBlueprint,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};