import Chat from './pages/Chat';
import Console from './pages/Console';
import Implementation from './pages/Implementation';
import Welcome from './pages/Welcome';
import MemoryIsolation from './pages/MemoryIsolation';


export const PAGES = {
    "Chat": Chat,
    "Console": Console,
    "Implementation": Implementation,
    "Welcome": Welcome,
    "MemoryIsolation": MemoryIsolation,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};