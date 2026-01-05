import Chat from './pages/Chat';
import Console from './pages/Console';
import Implementation from './pages/Implementation';
import Welcome from './pages/Welcome';


export const PAGES = {
    "Chat": Chat,
    "Console": Console,
    "Implementation": Implementation,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};