import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Search from './pages/Search'
import Show from './pages/Show'
import Episode from './pages/Episode'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Subscriptions from './pages/Subscriptions'
import Category from './pages/Category'
import RSSShow from './pages/RSSShow'
import History from './pages/History'
import Blacklist from './pages/Blacklist'
import SleepScore from './pages/SleepScore'
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/search"
          element={
            <Layout>
              <Search />
            </Layout>
          }
        />
        <Route
          path="/show/:id"
          element={
            <Layout>
              <Show />
            </Layout>
          }
        />
        <Route
          path="/episode/:id"
          element={
            <Layout>
              <Episode />
            </Layout>
          }
        />
        <Route
          path="/category/:id"
          element={
            <Layout>
              <Category />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <Profile />
            </Layout>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <Layout>
              <Subscriptions />
            </Layout>
          }
        />
        <Route
          path="/history"
          element={
            <Layout>
              <History />
            </Layout>
          }
        />
        <Route
          path="/blacklist"
          element={
            <Layout>
              <Blacklist />
            </Layout>
          }
        />
        <Route
          path="/sleep-score"
          element={
            <Layout>
              <SleepScore />
            </Layout>
          }
        />
        <Route
          path="/rss/:rssUrl/:episodeId"
          element={
            <Layout>
              <RSSShow />
            </Layout>
          }
        />
        <Route
          path="/rss/:rssUrl"
          element={
            <Layout>
              <RSSShow />
            </Layout>
          }
        />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App

