import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import styled from "styled-components"

const ipcRenderer = require("electron").ipcRenderer

// I want to make a tool to manage mod profiles for a game.

// For the game, mods are installed the directory containing the game files.
// The folders which contain mods are:
// - `user`
// - `BepInEx\config`
// - `BepInEx\plugins`

// There should be a directory of mod profiles, like `spt_mod_profiles`, containing sub-directories for each profile, like `profile_1`, which contain these folders.

// The mod is an Electron React TypeScript app.

// The UI should allow users to create or select profiles from previously created ones.
// When selecting a profile, the tool should symlink the contents of that profiles folders into the main game directory so that they become "active".

const root = createRoot(document.body)

const Container = styled.div`
  padding: 20px;
  font-family: Arial, sans-serif;
`

const Title = styled.h1`
  color: #333;
`

const ProfileList = styled.ul`
  list-style: none;
  padding: 0;
`

const ProfileItem = styled.li`
  padding: 10px;
  margin: 5px 0;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 5px;

  &:hover {
    background-color: #e0e0e0;
  }
`

const Button = styled.button`
  background-color: #4caf50; /* Green */
  color: white;
  padding: 10px 20px;
  margin: 10px 0;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #45a049;
  }
`

const Input = styled.input`
  padding: 10px;
  margin-right: 10px;
  width: 200px;
  border: 1px solid #ccc;
  border-radius: 4px;
`

const DirectoryInputContainer = styled.div`
  margin-top: 20px;
  display: flex;
  align-items: center;
`

const CurrentProfile = styled.div`
  margin-top: 20px;
  font-size: 16px;
  color: darkblue;
`

const ProfileManager = () => {
  const [profiles, setProfiles] = useState<string[]>([])
  const [currentProfile, setCurrentProfile] = useState<string>("")
  const [newProfileName, setNewProfileName] = useState("")
  const [sptInstallDir, setSPTInstallDir] = useState("C:\\SPT_3.8.2")

  const fetchProfiles = async () => {
    const loadedProfiles: string[] = await ipcRenderer.invoke("get-profiles", sptInstallDir)
    setProfiles(loadedProfiles)
  }

  const handleCreateProfile = async () => {
    if (!newProfileName) {
      alert("Please enter a profile name.")
      return
    }
    await ipcRenderer.invoke("create-profile", sptInstallDir, newProfileName)
    setNewProfileName("")
    fetchProfiles()
  }

  const handleActivateProfile = async (profileName: string) => {
    await ipcRenderer.invoke("activate-profile", sptInstallDir, profileName)
    await ipcRenderer.invoke("set-active-profile", sptInstallDir, profileName)
    setCurrentProfile(profileName)
  }

  const fetchActiveProfile = async () => {
    const activeProfile = await ipcRenderer.invoke("get-active-profile", sptInstallDir)
    setCurrentProfile(activeProfile)
  }

  useEffect(() => {
    if (sptInstallDir) {
      fetchProfiles()
      fetchActiveProfile()
    }
  }, [sptInstallDir])

  return (
    <div className="p-5 font-sans">
      <h1 className="text-xl font-bold text-gray-800 mb-6">EFT Mod Profile Manager</h1>

      {/* Directory Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">Game Installation Directory</label>
        <div className="flex">
          <input
            className="flex-grow p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            type="text"
            value={sptInstallDir}
            placeholder="No directory selected"
            readOnly
          />
          <button
            className="p-2 bg-green-500 text-white rounded-r-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            onClick={async () => {
              const path = await ipcRenderer.invoke("open-directory-dialog")
              setSPTInstallDir(path)
            }}
          >
            Select Directory
          </button>
        </div>
      </div>

      {/* Profiles List */}
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">Available Profiles</label>
        <ul className="space-y-2">
          {profiles.map(profile => (
            <li
              key={profile}
              className={`p-2 rounded cursor-pointer ${
                currentProfile === profile
                  ? "text-white bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => handleActivateProfile(profile)}
            >
              {profile}
            </li>
          ))}
        </ul>
      </div>

      {/* Create Profile */}
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">Create New Profile</label>
        <div className="flex items-center space-x-2">
          <input
            className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            type="text"
            value={newProfileName}
            onChange={e => setNewProfileName(e.target.value)}
            onKeyDown={e => {
              if (e.key === " ") e.preventDefault() // Prevent spaces in profile names
            }}
            placeholder="Enter new profile name"
          />
          <button
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            onClick={handleCreateProfile}
          >
            Create
          </button>
        </div>
      </div>

      <hr className="border-t border-gray-300 my-6" />

      {/* Current Profile */}
      {currentProfile && (
        <div className="text-lg text-blue-800">
          <span className="font-bold">Current Profile:</span> {currentProfile}
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <>
      <ProfileManager />
    </>
  )
}

root.render(<App />)
