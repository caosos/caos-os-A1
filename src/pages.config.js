import Ballot from './pages/Ballot';
import Chat from './pages/Chat';
import Console from './pages/Console';
import Implementation from './pages/Implementation';
import MemoryIsolation from './pages/MemoryIsolation';
import TerminalBlueprint from './pages/TerminalBlueprint';
import Welcome from './pages/Welcome';


export const PAGES = {
    "Ballot": Ballot,
    "Chat": Chat,
    "Console": Console,
    "Implementation": Implementation,
    "MemoryIsolation": MemoryIsolation,
    "TerminalBlueprint": TerminalBlueprint,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
};