import Assessment from './pages/Assessment';
import AssessmentDetail from './pages/AssessmentDetail';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import EditQuote from './pages/EditQuote';
import EditVehicle from './pages/EditVehicle';
import Home from './pages/Home';
import QuotePDF from './pages/QuotePDF';
import Quotes from './pages/Quotes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Upgrade from './pages/Upgrade';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Assessment": Assessment,
    "AssessmentDetail": AssessmentDetail,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "EditQuote": EditQuote,
    "EditVehicle": EditVehicle,
    "Home": Home,
    "QuotePDF": QuotePDF,
    "Quotes": Quotes,
    "Reports": Reports,
    "Settings": Settings,
    "Upgrade": Upgrade,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};