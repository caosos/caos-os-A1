import Chat from './pages/Chat';
import Console from './pages/Console';
import Implementation from './pages/Implementation';
import MemoryIsolation from './pages/MemoryIsolation';
import TerminalBlueprint from './pages/TerminalBlueprint';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Ballot from './pages/Ballot';


export const PAGES = {
    "Chat": Chat,
    "Console": Console,
    "Implementation": Implementation,
    "MemoryIsolation": MemoryIsolation,
    "TerminalBlueprint": TerminalBlueprint,
    "Welcome": Welcome,
    "Home": Home,
    "Search": Search,
    "Profile": Profile,
    "Ballot": Ballot,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};