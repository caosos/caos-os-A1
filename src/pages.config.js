import Chat from './pages/Chat';
import Console from './pages/Console';
import Welcome from './pages/Welcome';
import Implementation from './pages/Implementation';


export const PAGES = {
    "Chat": Chat,
    "Console": Console,
    "Welcome": Welcome,
    "Implementation": Implementation,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};