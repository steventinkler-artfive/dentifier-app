import AdminUsers from './pages/AdminUsers';
import Assessment from './pages/Assessment';
import AssessmentDetail from './pages/AssessmentDetail';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import EditQuote from './pages/EditQuote';
import EditVehicle from './pages/EditVehicle';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import QuotePDF from './pages/QuotePDF';
import Quotes from './pages/Quotes';
import Reports from './pages/Reports';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import SubscriptionPage from './pages/SubscriptionPage';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Upgrade from './pages/Upgrade';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminUsers": AdminUsers,
    "Assessment": Assessment,
    "AssessmentDetail": AssessmentDetail,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "EditQuote": EditQuote,
    "EditVehicle": EditVehicle,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "QuotePDF": QuotePDF,
    "Quotes": Quotes,
    "Reports": Reports,
    "ResetPassword": ResetPassword,
    "Settings": Settings,
    "Subscription": Subscription,
    "SubscriptionPage": SubscriptionPage,
    "SubscriptionSuccess": SubscriptionSuccess,
    "Upgrade": Upgrade,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};