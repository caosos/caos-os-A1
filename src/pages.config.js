import Chat from './pages/Chat';
import Console from './pages/Console';
import Implementation from './pages/Implementation';
import MemoryIsolation from './pages/MemoryIsolation';
import Welcome from './pages/Welcome';


export const PAGES = {
    "Chat": Chat,
    "Console": Console,
    "Implementation": Implementation,
    "MemoryIsolation": MemoryIsolation,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};