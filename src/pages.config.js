import Ballot from './pages/Ballot';
import Chat from './pages/Chat';
import Console from './pages/Console';
import Home from './pages/Home';
import Implementation from './pages/Implementation';
import MemoryIsolation from './pages/MemoryIsolation';
import Profile from './pages/Profile';
import Search from './pages/Search';
import TerminalBlueprint from './pages/TerminalBlueprint';
import Welcome from './pages/Welcome';
import MyProfile from './pages/MyProfile';
import District from './pages/District';
import Statistics from './pages/Statistics';


export const PAGES = {
    "Ballot": Ballot,
    "Chat": Chat,
    "Console": Console,
    "Home": Home,
    "Implementation": Implementation,
    "MemoryIsolation": MemoryIsolation,
    "Profile": Profile,
    "Search": Search,
    "TerminalBlueprint": TerminalBlueprint,
    "Welcome": Welcome,
    "MyProfile": MyProfile,
    "District": District,
    "Statistics": Statistics,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};