import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Assessment from './pages/Assessment';
import Quotes from './pages/Quotes';
import AssessmentDetail from './pages/AssessmentDetail';
import QuotePDF from './pages/QuotePDF';
import Settings from './pages/Settings';
import EditQuote from './pages/EditQuote';
import Reports from './pages/Reports';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Customers": Customers,
    "Assessment": Assessment,
    "Quotes": Quotes,
    "AssessmentDetail": AssessmentDetail,
    "QuotePDF": QuotePDF,
    "Settings": Settings,
    "EditQuote": EditQuote,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};