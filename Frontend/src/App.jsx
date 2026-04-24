import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Statistics from './pages/Statistics'
import Services from './pages/Services'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Campaigns from './pages/Campaigns'
import Contributions from './pages/Contributions'
import TopNGOs from './pages/TopNGOs'
import NGOProfile from './pages/NGOProfile'
import VolunteerProfile from './pages/VolunteerProfile'
import Profile from './pages/Profile'
import CampaignDetails from './pages/CampaignDetails'
import MLHub from './pages/MLHub'
import SubmitRequest from './pages/SubmitRequest'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="app-shell flex flex-col min-h-screen">
        <Navbar />
        <main className="site-main flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/top-ngos" element={<TopNGOs />} />
            <Route path="/ngo-profile" element={<NGOProfile />} />
            <Route path="/volunteer-profile" element={<VolunteerProfile />} />
            <Route path="/ngo-campaign/:id" element={<CampaignDetails />} />
            <Route path="/ngo-campaign/:id/ml-hub" element={<MLHub />} />
            <Route path="/submit-request" element={<SubmitRequest />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
