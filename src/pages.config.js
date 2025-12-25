import Chat from './pages/Chat';
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';


export const PAGES = {
    "Chat": Chat,
    "Welcome": Welcome,
    "Auth": Auth,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};