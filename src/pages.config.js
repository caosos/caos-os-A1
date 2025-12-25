import Auth from './pages/Auth';
import Chat from './pages/Chat';
import Welcome from './pages/Welcome';


export const PAGES = {
    "Auth": Auth,
    "Chat": Chat,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};